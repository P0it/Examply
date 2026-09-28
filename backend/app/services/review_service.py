"""
Spaced repetition on top of FSRS.

The exam problems are auto-graded, so the user never has to rate a card: a wrong
answer is Again, a right one is Good. The Hard/Easy ratings stay available for
anyone who wants to nudge an interval, but nothing depends on them.
"""
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional, Tuple

from fsrs import Card, Rating, Scheduler, State
from sqlmodel import Session, select

from app.models import ReviewCard

# One scheduler for the process. Stateless — it only holds the 21 parameters.
#
# FSRS ships with 1-minute and 10-minute learning steps, which assume an Anki-style
# sit-down session. Studying here happens in whatever gap the day leaves, so a
# missed problem should come back the *next time the app is opened*, not sixty
# seconds later. One short step puts it at the front of that next queue; the
# runner then skips anything already answered in the current sitting.
_SHORT_STEP = timedelta(minutes=10)
_scheduler = Scheduler(
    learning_steps=(_SHORT_STEP,),
    relearning_steps=(_SHORT_STEP,),
)

# What the client may send. Correct/incorrect maps to Good/Again on its own.
RATINGS = {
    "again": Rating.Again,
    "hard": Rating.Hard,
    "good": Rating.Good,
    "easy": Rating.Easy,
}


def _as_utc(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; FSRS wants them tz-aware."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _to_fsrs(row: ReviewCard) -> Card:
    return Card(
        card_id=row.id or 1,
        state=State(row.state),
        step=row.step,
        stability=row.stability,
        difficulty=row.difficulty,
        due=_as_utc(row.due),
        last_review=_as_utc(row.last_review) if row.last_review else None,
    )


def _from_fsrs(row: ReviewCard, card: Card) -> ReviewCard:
    row.state = int(card.state)
    row.step = card.step
    row.stability = card.stability
    row.difficulty = card.difficulty
    row.due = card.due
    row.last_review = card.last_review
    return row


def get_card(session: Session, session_id: int, problem_id: int) -> Optional[ReviewCard]:
    return session.exec(
        select(ReviewCard).where(
            ReviewCard.session_id == session_id,
            ReviewCard.problem_id == problem_id,
        )
    ).first()


def grade(
    session: Session,
    session_id: int,
    problem_id: int,
    is_correct: bool,
    rating_name: Optional[str] = None,
) -> Tuple[ReviewCard, Rating]:
    """Schedule one answer. Creates the card on first sight."""
    rating = RATINGS.get((rating_name or "").lower()) or (Rating.Good if is_correct else Rating.Again)

    row = get_card(session, session_id, problem_id)
    if not row:
        row = ReviewCard(session_id=session_id, problem_id=problem_id)
        session.add(row)
        session.commit()
        session.refresh(row)

    was_review = row.state == int(State.Review)

    card, _log = _scheduler.review_card(_to_fsrs(row), rating, datetime.now(timezone.utc))
    _from_fsrs(row, card)
    row.reps += 1
    if was_review and rating == Rating.Again:
        row.lapses += 1

    session.add(row)
    session.commit()
    session.refresh(row)
    return row, rating


def due_cards(
    session: Session,
    session_id: int,
    limit: int = 50,
    now: Optional[datetime] = None,
    exclude_problem_ids: Optional[Iterable[int]] = None,
):
    """Cards whose due date has passed.

    Still-being-learned cards come first — those are the ones just missed — and
    anything answered in the current sitting is left out so the same problem is
    not asked twice in one go.
    """
    moment = now or datetime.now(timezone.utc)
    skip = set(exclude_problem_ids or ())

    rows = session.exec(
        select(ReviewCard)
        .where(ReviewCard.session_id == session_id)
        .order_by(ReviewCard.due)
    ).all()

    due = [
        row for row in rows
        if _as_utc(row.due) <= moment and row.problem_id not in skip
    ]
    due.sort(key=lambda row: (row.state == int(State.Review), _as_utc(row.due)))
    return due[:limit]


def stats(session: Session, session_id: int) -> dict:
    """Counts the home screen and the review screen need."""
    now = datetime.now(timezone.utc)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    rows = session.exec(
        select(ReviewCard).where(ReviewCard.session_id == session_id)
    ).all()

    due_now = sum(1 for row in rows if _as_utc(row.due) <= now)
    due_today = sum(1 for row in rows if _as_utc(row.due) <= end_of_day)
    learning = sum(1 for row in rows if row.state != int(State.Review))
    lapses = sum(row.lapses for row in rows)

    return {
        "tracked": len(rows),
        "due_now": due_now,
        "due_today": due_today,
        "learning": learning,
        "review": len(rows) - learning,
        "lapses": lapses,
    }
