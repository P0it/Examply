import type { Metadata } from "next"
import { ExternalLink } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { ExamPlanForm } from "@/components/exam-plan-form"

export const metadata: Metadata = {
  title: "SAA-C03 시험 가이드 · Examply",
}

// Checked against aws.amazon.com and the SAA-C03 exam guide on 2026-09-28.
const FACTS = [
  { label: "문항", value: "65", note: "채점 50 + 비채점 15" },
  { label: "시간", value: "130분", note: "영어 응시 시 ESL +30분" },
  { label: "합격선", value: "720", note: "1000점 환산 점수" },
  { label: "응시료", value: "$150", note: "유효기간 3년" },
]

const DOMAINS = [
  {
    name: "보안 아키텍처 설계",
    en: "Design Secure Architectures",
    weight: 30,
    tint: "bg-pastel-violet",
    services: "IAM, 정책·역할, KMS, Secrets Manager, VPC 보안그룹·NACL, WAF, Shield, Cognito",
  },
  {
    name: "복원력 있는 아키텍처",
    en: "Design Resilient Architectures",
    weight: 26,
    tint: "bg-pastel-cyan",
    services: "Multi-AZ, Auto Scaling, ELB, SQS·SNS 디커플링, Route 53 장애조치, 백업·DR 전략",
  },
  {
    name: "고성능 아키텍처",
    en: "Design High-Performing Architectures",
    weight: 24,
    tint: "bg-pastel-magenta",
    services: "EBS·EFS·S3 선택, ElastiCache, CloudFront, Aurora·DynamoDB, Kinesis, Global Accelerator",
  },
  {
    name: "비용 최적화 아키텍처",
    en: "Design Cost-Optimized Architectures",
    weight: 20,
    tint: "bg-pastel-peach",
    services: "S3 스토리지 클래스·수명주기, Spot·Savings Plans·예약, 서버리스, NAT 비용, Cost Explorer",
  },
]

const BOOKING_URL = "https://www.aws.training/Certification"
const PEARSON_URL = "https://home.pearsonvue.com/aws"

// Checked against aws.amazon.com/certification/policies/before-testing on 2026-09-28.
const STEPS = [
  { title: "계정 로그인", body: "AWS Certification 계정(aws.training)에 로그인해 Schedule New Exam을 누르면 Pearson VUE 예약 화면으로 넘어갑니다." },
  { title: "방식·언어 고르기", body: "시험센터 또는 온라인 감독(OnVUE). 시험 언어는 한국어를 고를 수 있지만, 온라인 감독관과의 대화는 영어입니다." },
  { title: "날짜·시간 고르기", body: "빈 자리가 있는 날을 골라 결제합니다. 시험 24시간 전까지 변경·취소할 수 있고, 변경은 예약당 2번까지입니다." },
  { title: "ESL 편의 (영어 응시 시)", body: "영어로 볼 거라면 예약 전에 ESL +30분 편의를 먼저 신청하세요. 한국어 응시에는 해당 없습니다." },
  { title: "떨어지면", body: "14일 뒤부터 재응시할 수 있고, 응시료는 매번 전액입니다. 합격하면 다음 시험 50% 할인 바우처가 나옵니다." },
]

const KEYWORDS = [
  ["최소 운영 오버헤드", "관리형·서버리스 (Lambda, Fargate, Aurora Serverless, DynamoDB)"],
  ["가장 비용 효율적", "S3 수명주기·Intelligent-Tiering, Spot, Savings Plans"],
  ["고가용성", "Multi-AZ + ALB + Auto Scaling"],
  ["디커플링 / 비동기", "SQS, SNS, EventBridge"],
  ["실시간 스트리밍", "Kinesis Data Streams"],
  ["전 세계 저지연 정적 콘텐츠", "CloudFront"],
  ["고정 IP·글로벌 TCP/UDP", "Global Accelerator"],
  ["프라이빗 서브넷 → S3", "VPC 게이트웨이 엔드포인트"],
  ["자격증명 자동 교체", "Secrets Manager"],
  ["온프레미스 대용량 이전", "DataSync, Snowball (오프라인)"],
  ["온프레미스에서 클라우드 스토리지", "Storage Gateway"],
  ["여러 계정 권한 통제", "Organizations + SCP"],
]

const TIPS = [
  "답을 외우지 말고 오답 보기가 왜 틀렸는지를 말할 수 있을 때까지 봅니다. 같은 서비스가 다른 조건으로 계속 나옵니다.",
  "문제 끝의 조건어(최소 비용, 최소 운영, 가장 빠르게)가 정답을 가릅니다. 조건어부터 읽으세요.",
  "덤프의 표시된 정답이 틀린 경우가 있습니다. 해설이 이상하면 공식 문서로 확인하고 북마크해 두세요.",
  "복수 응답 문제는 정답을 모두 골라야 맞습니다. 몇 개를 고를지 문제에 적혀 있습니다.",
  "틀려도 감점이 없으니 빈칸으로 두지 마세요. 헷갈리면 표시(Flag)하고 넘어갔다가 마지막에 봅니다.",
  "복습은 매일 조금씩. 오답은 FSRS 복습 큐에 쌓이니 새 문제보다 복습을 먼저 비우세요.",
  "마지막 주에는 65문항을 130분 안에 한 번에 풀어 보는 연습을 두세 번 합니다.",
]

// Checked 2026-09-28. Udemy prices swing with sales, so none are listed.
const COURSES = [
  {
    group: "무료",
    items: [
      {
        title: "AWS Skill Builder 시험 준비 과정",
        by: "AWS 공식",
        lang: "한국어",
        note: "도메인별 핵심 정리 강의와 공식 연습문제 20문항 세트(한국어 버전 있음). 가장 먼저 볼 것.",
        href: "https://skillbuilder.aws/category/exam-prep/solutions-architect-associate-SAA-C03",
      },
      {
        title: "SAA-C03 공식 샘플 문항 (PDF)",
        by: "AWS 공식",
        lang: "한국어",
        note: "실제 시험 문체를 보여주는 샘플 문제와 해설.",
        href: "https://d1.awsstatic.com/ko_KR/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Sample-Questions.pdf",
      },
      {
        title: "freeCodeCamp SAA-C03 풀코스",
        by: "Andrew Brown (ExamPro)",
        lang: "영어",
        note: "YouTube 무료 강의. 분량이 많으니 모르는 서비스만 골라 보세요.",
        href: "https://www.freecodecamp.org/news/pass-the-aws-certified-solutions-architect-associate-certification/",
      },
      {
        title: "Tutorials Dojo 무료 모의고사 샘플",
        by: "Jon Bonso",
        lang: "영어",
        note: "유료 모의고사의 맛보기. 실전 난이도 감을 잡기 좋습니다.",
        href: "https://portal.tutorialsdojo.com/courses/free-aws-certified-solutions-architect-associate-practice-exams-sampler/",
      },
    ],
  },
  {
    group: "Udemy",
    items: [
      {
        title: "【한글자막】 AWS Certified Solutions Architect Associate 시험 합격!",
        by: "Stephane Maarek",
        lang: "한글 자막",
        note: "가장 많이 듣는 SAA 강의의 한글 자막판. 이론을 한 번 훑을 때 추천.",
        href: "https://www.udemy.com/course/best-aws-certified-solutions-architect-associate/",
      },
      {
        title: "Ultimate AWS Certified Solutions Architect Associate",
        by: "Stephane Maarek",
        lang: "영어",
        note: "위 강의의 원본. 업데이트가 가장 빠릅니다.",
        href: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/",
      },
      {
        title: "AWS Certified Solutions Architect Associate Practice Exams",
        by: "Jon Bonso (Tutorials Dojo)",
        lang: "영어",
        note: "실전과 가장 비슷하다는 평의 모의고사. 덤프를 다 돈 뒤 마무리용.",
        href: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-amazon-practice-exams-saa-c03/",
      },
    ],
  },
]

const LINKS = [
  { label: "시험 공식 페이지", href: "https://aws.amazon.com/certification/certified-solutions-architect-associate/" },
  { label: "시험 가이드 (도메인·과제)", href: "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html" },
  { label: "예약·변경·신분증 정책", href: "https://aws.amazon.com/certification/policies/before-testing/" },
  { label: "재응시·응시 후 정책", href: "https://aws.amazon.com/certification/policies/after-testing/" },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-12">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-primary">AWS Certified Solutions Architect – Associate</p>
          <h1 className="text-4xl font-semibold leading-tight">SAA-C03 시험 가이드</h1>
          <p className="max-w-2xl text-muted-foreground">
            시험 형식, 도메인 비중, 응시 방법, 덤프로 공부할 때 챙길 것을 한 페이지에 모았습니다.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild>
              <a href={BOOKING_URL} target="_blank" rel="noreferrer">
                시험 신청하러 가기
                <ExternalLink />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="#schedule">일정·신청 방법</a>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="rounded-lg border bg-card p-5">
              <p className="text-xs text-muted-foreground">{fact.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{fact.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{fact.note}</p>
            </div>
          ))}
        </section>

        <section id="schedule" className="scroll-mt-20 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">시험 일정 · 신청</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              정해진 시험 회차가 없습니다. 시험센터·온라인 모두 상시 응시라서, 원하는 날짜에 빈 자리가 있으면 바로 예약할 수 있습니다.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-lg border bg-card p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-col items-start justify-between gap-4 rounded-lg bg-secondary p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">빈 날짜는 예약 화면에서만 보입니다</p>
              <p className="mt-1 text-sm text-muted-foreground">로그인 후 시험센터나 온라인을 고르면 날짜별 가능 시간이 나옵니다.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={PEARSON_URL} target="_blank" rel="noreferrer">Pearson VUE 안내</a>
              </Button>
              <Button asChild>
                <a href={BOOKING_URL} target="_blank" rel="noreferrer">
                  시험 신청하러 가기
                  <ExternalLink />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section id="exam-plan" className="scroll-mt-20 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">내 시험일</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              예약한 날짜를 넣으면 남은 날짜와 하루 가능한 시간으로 앞으로 공부할 수 있는 시간을 계산합니다.
            </p>
          </div>
          <ExamPlanForm />
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">출제 도메인</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              채점 50문항 기준 비중입니다. 도메인별 과락은 없고 총점으로만 합격을 가립니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {DOMAINS.map((domain, index) => (
              <div key={domain.en} className={`rounded-3xl p-3 ${domain.tint}`}>
                <div className="h-full rounded-lg bg-card p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-xs text-muted-foreground">도메인 {index + 1}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      약 {Math.round((domain.weight / 100) * 50)}문항
                    </p>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-4">
                    <h3 className="text-lg font-bold">{domain.name}</h3>
                    <span className="text-2xl font-semibold tabular-nums text-primary">{domain.weight}%</span>
                  </div>
                  <p className="text-xs text-subtle">{domain.en}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{domain.services}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">조건어 → 정답 키워드</h2>
            <p className="mt-1 text-sm text-muted-foreground">덤프에서 반복되는 패턴입니다. 예외도 있으니 해설과 같이 보세요.</p>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {KEYWORDS.map(([cue, answer]) => (
                  <tr key={cue}>
                    <th scope="row" className="w-2/5 px-5 py-3 text-left font-semibold">{cue}</th>
                    <td className="px-5 py-3 text-muted-foreground">{answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">추천 강의</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              무료 공식 과정으로 틀을 잡고, 부족한 이론은 강의로, 마무리는 모의고사로. Udemy는 할인 기간에 사는 게 보통입니다.
            </p>
          </div>
          {COURSES.map(({ group, items }) => (
            <div key={group} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{group}</h3>
              <ul className="grid gap-4 md:grid-cols-2">
                {items.map((course) => (
                  <li key={course.href}>
                    <a
                      href={course.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-full flex-col gap-2 rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-semibold leading-snug">{course.title}</p>
                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {course.by}
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-primary">{course.lang}</span>
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{course.note}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="space-y-6 rounded-lg bg-secondary p-8">
          <h2 className="text-2xl font-semibold">공부 팁</h2>
          <ul className="space-y-3">
            {TIPS.map((tip, index) => (
              <li key={index} className="flex gap-3 rounded-lg bg-card p-4 text-sm leading-relaxed">
                <span className="shrink-0 font-semibold tabular-nums text-primary">{index + 1}</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">공식 자료</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 text-sm transition-shadow hover:shadow-md"
                >
                  <span className="font-semibold">{link.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-subtle">2026년 9월 28일 기준 공식 페이지에서 확인한 내용입니다. 응시 전에 한 번 더 확인하세요.</p>
        </section>
      </main>
    </div>
  )
}
