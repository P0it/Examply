# Examply Product Specification

## Product Overview

Examply is a flashcard-based learning platform that transforms PDF problem sets into interactive study sessions. Users can solve problems one at a time, receive immediate feedback, and review their mistakes for improved learning outcomes.

## User Personas

### Primary Users

#### 1. Students (학습자)
- **Goal**: Efficient problem solving practice and test preparation
- **Needs**: Clear problem presentation, immediate feedback, progress tracking
- **Behavior**: Study sessions, bookmark difficult problems, review mistakes

#### 2. Educators (관리자)
- **Goal**: Digitize paper-based problem sets for students
- **Needs**: Easy PDF upload, bulk problem management, quality control
- **Behavior**: Upload PDFs, review parsed problems, approve content

## Core User Scenarios

### Scenario 1: Student Starting New Study Session

**Context**: Student wants to practice math problems for upcoming exam

**Steps**:
1. **Session Creation**
   - Navigate to home page
   - Click "새 세션 시작" (Start New Session)
   - Select filters: Subject (수학), Difficulty (medium), Topic (optional)
   - Set problem count (default: 20 problems)
   - Click "세션 만들기" (Create Session)

2. **Problem Solving**
   - View problem question and choices
   - Select answer using mouse click or keyboard (1-4 keys)
   - Click "답안 제출" (Submit Answer) or press Enter
   - View result: ✅ Correct / ❌ Incorrect with explanation
   - Use keyboard shortcuts: B (bookmark), S (skip), E (show explanation)

3. **Session Navigation**
   - Progress bar shows completion status
   - "다음 문제" (Next Problem) button or Right arrow key
   - "이전 문제" (Previous Problem) if review mode enabled

### Scenario 2: Student Reviewing Mistakes

**Context**: Student wants to review previously answered problems incorrectly

**Steps**:
1. Navigate to "복습" (Review) section
2. Select "오답 문제" (Wrong Answers) tab
3. Filter by recent sessions or specific subjects
4. Retry problems with explanations available
5. Track improvement over time

### Scenario 3: Administrator Uploading PDF

**Context**: Teacher has PDF problem set to digitize

**Steps**:
1. **Upload Process**
   - Navigate to admin panel
   - Drag-and-drop PDF file or click "파일 선택" (Select File)
   - View upload progress and OCR processing status
   - Estimated time: 2-5 minutes per 10 pages

2. **Quality Review**
   - Review parsed problems in preview mode
   - Edit questions, choices, or answers if needed
   - Approve individual problems or bulk approve
   - Mark problematic imports for manual review

3. **Publishing**
   - Set problem metadata (subject, difficulty, tags)
   - Enable for student access
   - Monitor usage statistics

## Screen Flows

### Main Navigation Flow
```
Home Page → Session Creation → Problem Solving → Results → Review
    ↓              ↓               ↓            ↓        ↓
Dashboard    Filter Setup    Answer Submit   Stats   Wrong/Bookmarked
```

### Problem Solving Flow
```
Problem Display → Answer Selection → Submit → Feedback → Next Problem
       ↓               ↓              ↓         ↓           ↓
   [Question]     [1,2,3,4 Keys]   [Enter]  [✅/❌]    [→ Arrow]
   [Choices]      [Mouse Click]              [Explain]  [Continue]
   [Progress]     [Skip: S]                  [Bookmark]
```

### Admin Flow
```
PDF Upload → OCR Processing → Problem Review → Approval → Publication
     ↓            ↓              ↓            ↓          ↓
[Drag&Drop]   [Progress Bar]  [Edit Mode]  [Bulk Ops] [Live Stats]
[File Info]   [Error Logs]    [Preview]    [Approve]  [Usage Data]
```

## User Interface Design

### Design System

#### Color Palette
- **Primary**: Blue (#3B82F6) - Main actions, links
- **Secondary**: Gray (#6B7280) - Supporting text, borders
- **Success**: Green (#10B981) - Correct answers, completion
- **Error**: Red (#EF4444) - Wrong answers, errors
- **Warning**: Yellow (#F59E0B) - Bookmarks, cautions
- **Neutral**: Gray scale for backgrounds and text

#### Typography
- **Headers**: Inter, Bold, 24-32px
- **Body**: Inter, Regular, 14-16px
- **Code**: JetBrains Mono, 14px
- **Korean Support**: Noto Sans KR fallback

#### Spacing System
- **Base Unit**: 4px (0.25rem)
- **Common Spacing**: 8px, 12px, 16px, 24px, 32px, 48px
- **Container Max Width**: 1200px
- **Sidebar Width**: 280px (collapsible to 64px)

### Layout Patterns

#### Desktop Layout (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Logo, Theme Toggle, Stats)                         │
├─────────────┬───────────────────────────────────────────────┤
│ Sidebar     │ Main Content Area                             │
│ - Sessions  │ ┌─────────────────────────────────────────┐   │
│ - Review    │ │ Problem Card                           │   │
│ - Stats     │ │                                        │   │
│ - Admin     │ │ Question Text + Image                  │   │
│             │ │                                        │   │
│             │ │ ① Choice A   ② Choice B              │   │
│             │ │ ③ Choice C   ④ Choice D              │   │
│             │ │                                        │   │
│             │ │ [Skip] [Bookmark] [Submit Answer]      │   │
│             │ └─────────────────────────────────────────┘   │
│             │ Progress: ████████░░ 80%                      │
└─────────────┴───────────────────────────────────────────────┘
```

#### Mobile Layout (≤768px)
```
┌─────────────────────────────┐
│ Header + Hamburger Menu     │
├─────────────────────────────┤
│ Problem Card (Full Width)   │
│                             │
│ Question Text               │
│                             │
│ ① Choice A                  │
│ ② Choice B                  │
│ ③ Choice C                  │
│ ④ Choice D                  │
│                             │
│ [Skip] [Bookmark]           │
│ [Submit Answer]             │
│                             │
│ Progress: ████░░ 67%        │
└─────────────────────────────┘
```

### Component Library

#### Primary Components
- **ProblemCard**: Main problem display with choices
- **ProgressBar**: Visual progress indicator
- **AnswerFeedback**: Success/error states with explanations
- **NavigationSidebar**: Collapsible navigation menu
- **FilterPanel**: Subject/difficulty/topic selection
- **StatsDashboard**: Progress visualization and metrics

#### Interactive Elements
- **ChoiceButton**: Multiple choice selection (hover, active states)
- **ActionButton**: Primary actions (submit, skip, bookmark)
- **KeyboardShortcut**: Visual keyboard hints
- **LoadingSpinner**: Processing states
- **Toast**: Success/error notifications

## Keyboard Shortcuts

### Global Shortcuts
- **1-4 Keys**: Select multiple choice answer
- **Enter**: Submit selected answer
- **Space**: Show/hide explanation (after submission)
- **→ (Right Arrow)**: Next problem
- **← (Left Arrow)**: Previous problem (if available)

### Action Shortcuts
- **S**: Skip current problem
- **B**: Toggle bookmark
- **E**: Toggle explanation display
- **Esc**: Close modals/dialogs
- **Ctrl + /**: Show keyboard shortcuts help

### Admin Shortcuts
- **Ctrl + U**: Upload new PDF
- **Ctrl + R**: Refresh import status
- **A**: Approve current problem
- **R**: Reject current problem

## Responsive Design

### Breakpoints
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+
- **Large Desktop**: 1440px+

### Mobile Adaptations
- **Single Column Layout**: Stack all elements vertically
- **Touch-Friendly Buttons**: Minimum 44px touch targets
- **Swipe Gestures**: Left/right swipe for navigation
- **Collapsible UI**: Hide secondary elements, show on demand
- **Optimized Images**: Responsive image sizing

### Tablet Adaptations
- **Two Column Layout**: Sidebar + main content
- **Larger Touch Targets**: Accommodate finger navigation
- **Adaptive Navigation**: Collapsible sidebar with overlay

## Accessibility (a11y)

### WCAG 2.1 AA Compliance
- **Color Contrast**: 4.5:1 minimum ratio for text
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Focus Management**: Visible focus indicators

### Specific Features
- **Alternative Text**: Images and icons have descriptive alt text
- **Semantic Markup**: Proper heading hierarchy (h1-h6)
- **Live Regions**: Dynamic content updates announced
- **High Contrast Mode**: Enhanced visibility option

### Language Support
- **Primary Language**: Korean (ko)
- **Secondary Language**: English (en)
- **Text Direction**: Left-to-right (LTR)
- **Font Support**: Korean character rendering

## Internationalization (i18n)

### Text Resources Structure
```typescript
interface Translations {
  navigation: {
    home: string
    study: string
    review: string
    stats: string
    admin: string
  }
  study: {
    startSession: string
    submitAnswer: string
    skipProblem: string
    bookmark: string
    showExplanation: string
    nextProblem: string
  }
  feedback: {
    correct: string
    incorrect: string
    explanation: string
    timeSpent: string
  }
}
```

### Language Files
- `/locales/ko.json` - Korean (primary)
- `/locales/en.json` - English (fallback)

### Dynamic Content
- **Problem Text**: Stored in database with language tags
- **UI Labels**: Externalized to translation files
- **Error Messages**: Localized user feedback
- **Date/Time**: Locale-aware formatting

## Security & Privacy

### Data Protection
- **Answer Security**: Correct answers never sent to client until submission
- **Session Isolation**: Users cannot access other sessions' data
- **Input Validation**: All user inputs sanitized and validated
- **File Upload Security**: PDF validation and virus scanning

### Privacy Considerations
- **Anonymous Usage**: No personal data collection in MVP
- **Session Storage**: Local storage for preferences only
- **Data Retention**: Problem attempts stored for learning analytics
- **Cookie Policy**: Minimal cookie usage for session management

### Security Measures
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Token-based request validation
- **Rate Limiting**: API endpoint protection (future feature)

## Performance Requirements

### Loading Time Targets
- **Initial Page Load**: < 2 seconds
- **Problem Navigation**: < 500ms
- **Answer Submission**: < 1 second
- **Image Loading**: Progressive/lazy loading

### Scalability Goals
- **Concurrent Users**: 100+ simultaneous sessions
- **Database Size**: 10,000+ problems
- **File Uploads**: Multiple PDFs processing simultaneously
- **Response Times**: 95th percentile < 1 second

### Optimization Strategies
- **Frontend**: Code splitting, lazy loading, image optimization
- **Backend**: Database indexing, caching, async processing
- **Infrastructure**: CDN for static assets, database optimization

## Analytics & Metrics

### Learning Analytics
- **Problem Difficulty**: Success rate per problem
- **Time Tracking**: Average time per problem type
- **Learning Patterns**: Sequential vs. random study effectiveness
- **Subject Performance**: Accuracy by subject area

### Usage Metrics
- **Session Duration**: Average study session length
- **Completion Rates**: Percentage of sessions completed
- **Return Usage**: Daily/weekly active users
- **Feature Usage**: Most used keyboard shortcuts and features

### Admin Analytics
- **Content Quality**: OCR accuracy and manual review rates
- **Processing Performance**: PDF import success rates and times
- **User Engagement**: Most popular subjects and difficulty levels

## Future Enhancements

### Phase 2 Features
- **User Accounts**: Persistent progress tracking
- **Social Features**: Study groups and leaderboards
- **Advanced Analytics**: Detailed learning insights
- **Mobile Apps**: Native iOS/Android applications

### Phase 3 Features
- **AI-Powered**: Adaptive difficulty and personalized recommendations
- **Multi-format Support**: Support for Word docs, images, video problems
- **Advanced OCR**: Mathematical equation recognition
- **Collaboration**: Teacher-student progress sharing

### Long-term Vision
- **Educational Platform**: Integration with LMS systems
- **Content Marketplace**: User-generated content sharing
- **Offline Support**: Progressive Web App capabilities
- **Global Expansion**: Multi-language content and localization