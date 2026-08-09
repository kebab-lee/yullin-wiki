import Link from "next/link";

import AdminShell from "@/components/admin/AdminShell";
import { requireRole } from "@/lib/auth/requireRole";
import type { CommentPreview, ReportPreview } from "@/lib/types";

// ---- Dummy data ----

const recentComments: CommentPreview[] = [
  {
    id: "1",
    author: "닉네임",
    date: "2024.02.13 00:00",
    content:
      "댓글 내용 미리보기 최대 세 줄까지 댓글 내용 미리보기 최대 세 줄까지 댓글 내용 미리보기",
    postTitle: "게시물 제목",
    commentCount: 2,
  },
  {
    id: "2",
    author: "닉네임",
    date: "2024.02.13 00:00",
    content: "한줄이면 이렇게 나타남",
    postTitle: "여기는 한 줄까지",
    commentCount: 4,
  },
  {
    id: "3",
    author: "닉네임",
    date: "2024.02.13 00:00",
    content:
      "댓글 내용 미리보기 최대 세 줄까지 댓글 내용 미리보기 최대 세 줄까지 댓글 내용 미리보기",
    postTitle: "게시물 제목",
    commentCount: 1,
  },
];

const recentReports: ReportPreview[] = [
  {
    id: "1",
    author: "닉네임",
    content:
      "댓글 내용 미리보기 최대한 많이 보이게 댓글 내용 미리보기 최대한 많이 보이게 댓글 내용 미리보기",
    reason: "스팸홍보/도배글, 욕설/생명경시/혐오/차별적 표현 외 1",
    isNew: true,
  },
  {
    id: "2",
    author: "닉네임",
    content:
      "댓글 내용 미리보기 최대한 많이 보이게 댓글 내용 미리보기 최대한 많이 보이게 댓글 내용 미리보기",
    reason: "개인정보 노출 우려",
    isNew: true,
  },
  {
    id: "3",
    author: "닉네임",
    content: "댓글이 짧으면 이런식",
    reason: "욕설/생명경시/혐오/차별적 표현",
    isNew: true,
  },
];

// ---- Shared sub-components ----

function AvatarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9" cy="9" r="8.5" className="stroke-gray2" />
      <circle cx="9" cy="7" r="2.5" className="fill-gray3" />
      <path
        d="M3.5 16c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"
        className="stroke-gray3"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function CommentBubble({ count }: { count: number }) {
  return (
    <div className="relative w-[28px] h-[24px] shrink-0">
      <svg
        viewBox="0 0 28 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-brand-red"
      >
        <path d="M2 4C2 1.79 3.79 0 6 0H22C24.21 0 26 1.79 26 4V14C26 16.21 24.21 18 22 18H10L4 24V18H2V4Z" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white text-[13px] font-medium pb-1">
        {count}
      </span>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg
      width="11"
      height="18"
      viewBox="0 0 11 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray4"
    >
      <path
        d="M1 1L9.5 9L1 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Card components ----

/**
 * 카드는 시안 그대로 190x190 고정이다. **여기를 유동으로 바꾸지 않는다** —
 * 카드가 줄면 3줄 미리보기가 성립하지 않고, 375px 에서 세 장을 다 보여줄 방법도
 * 없다. 대신 카드 줄 전체를 가로 스크롤 스트립으로 두어(아래 CardStrip) 좁은
 * 화면에서는 밀어서 보게 한다.
 */
const CARD_CLASS =
  "bg-brand-red-white rounded-[20px] size-[190px] px-[18px] py-[20px] shrink-0";

function CommentCard({ author, date, content, postTitle, commentCount }: CommentPreview) {
  return (
    <div className={`${CARD_CLASS} flex flex-col items-end justify-between`}>
      <div className="flex flex-col gap-3 w-full">
        <div className="flex flex-col gap-[5px] w-full">
          <div className="flex items-center gap-[5px]">
            <AvatarIcon />
            <span className="text-[13px] font-semibold text-black">{author}</span>
          </div>
          <p className="text-[13px] font-light text-brand-red leading-[14px] text-right">
            {date}
          </p>
        </div>
        <p className="text-[15px] font-light leading-[21px] overflow-hidden line-clamp-3 text-left w-full">
          {content}
        </p>
      </div>
      <div className="flex items-start justify-between gap-[10px] w-full">
        <p className="flex-1 text-[18px] font-bold leading-[21px] overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          {postTitle}
        </p>
        <CommentBubble count={commentCount} />
      </div>
    </div>
  );
}

function ReportCard({ author, content, reason, isNew }: ReportPreview) {
  return (
    <div className={`${CARD_CLASS} flex flex-col gap-[10px] items-end`}>
      <div className="flex flex-col gap-[5px] items-start w-full flex-1 min-h-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-[5px]">
            <AvatarIcon />
            <span className="text-[13px] font-semibold text-black">{author}</span>
          </div>
          {isNew && <div className="size-[10px] rounded-full bg-brand-red shrink-0" />}
        </div>
        <p className="text-[15px] font-light leading-[21px] overflow-hidden line-clamp-3 text-left w-full">
          {content}
        </p>
      </div>
      <p className="text-[13px] font-light text-brand-red leading-[18px] overflow-hidden line-clamp-2 text-left w-full">
        {reason}
      </p>
    </div>
  );
}

// ---- Layout pieces ----

/**
 * 원형 퀵 액션 버튼.
 *
 * 시안(1512px)은 110px 고정이지만 375px 에서 세 개 + 간격이 화면 밖으로 나간다.
 * `size-[88px]` → lg 에서 110px 로 되돌린다: 88×3 + 12×2 = 288px 이라 375px
 * 컨테이너(좌우 16px 패딩 → 343px) 안에 한 줄로 들어간다. 44px 터치 타깃도
 * 넉넉히 넘긴다.
 *
 * 셋이 같은 규격이라 컴포넌트로 묶는다 — 세 군데에 같은 클래스를 적어 두면
 * 반응형 값을 고칠 때 하나만 빠뜨려도 한 버튼만 크기가 다르게 남는다.
 */
function QuickAction({
  href,
  icon,
  lines,
  gap,
}: {
  href: string;
  icon: React.ReactNode;
  /** 두 줄로 끊어 그리는 버튼 문구. 시안이 줄바꿈까지 정해 둔 값이다. */
  lines: [string, string];
  /** 아이콘과 문구 사이. 로고 버튼만 8px 로 좁다 (시안 그대로). */
  gap: "8" | "10";
}) {
  return (
    <Link
      href={href}
      className={[
        "flex shrink-0 flex-col items-center justify-center rounded-full border-2 border-brand-red bg-white",
        "size-[88px] lg:size-[110px]",
        gap === "8" ? "gap-[6px] lg:gap-[8px]" : "gap-[8px] lg:gap-[10px]",
      ].join(" ")}
    >
      {icon}
      <div className="text-center text-[14px] font-bold leading-[16px] text-brand-red lg:text-[18px] lg:leading-[18px]">
        <p className="mb-[4px] lg:mb-[5px]">{lines[0]}</p>
        <p>{lines[1]}</p>
      </div>
    </Link>
  );
}

/**
 * 대시보드 한 섹션 — 제목 링크 · 카드 줄 · 더보기.
 *
 * 데스크톱(1512px)은 시안 그대로 [제목][카드][더보기] 한 줄이다. 좁은 화면에서는
 * `flex-wrap` + `order` 로 두 줄이 된다: 윗줄에 제목과 더보기가 양끝으로 붙고
 * 카드 줄이 아래로 내려간다. **모바일 전용 컴포넌트를 만들지 않는다**
 * (CLAUDE.md "반응형") — 같은 마크업이 order 만 바꿔 두 배치를 만든다.
 *
 * 카드 줄은 `-mx-4 px-4` 로 컨테이너 좌우 패딩을 상쇄한 가로 스크롤 스트립이다.
 * AdminNav·상태 필터와 같은 관용구다 — 어드민만 다른 모바일 패턴을 쓰면 같은
 * 사이트에서 두 벌을 유지하게 된다.
 */
function DashboardSection({
  href,
  emoji,
  title,
  children,
}: {
  href: string;
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-full flex-wrap items-center justify-between gap-y-[16px]">
      <Link
        href={href}
        className="order-1 flex shrink-0 items-center gap-[16px] whitespace-nowrap lg:gap-[30px]"
      >
        <div className="font-bold">
          <p className="mb-[8px] text-[32px] leading-[22px] lg:mb-[10px] lg:text-[40px]">
            {emoji}
          </p>
          <p className="text-[20px] leading-[22px] lg:text-[22px]">{title}</p>
        </div>
        <span className="text-[25px] font-medium leading-[22px]">→</span>
      </Link>

      <div
        className={[
          "order-3 -mx-4 flex w-full gap-[16px] overflow-x-auto px-4",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "lg:order-2 lg:mx-0 lg:w-auto lg:gap-[25px] lg:overflow-x-visible lg:px-0",
        ].join(" ")}
      >
        {children}
      </div>

      <Link
        href={href}
        className="order-2 flex shrink-0 flex-col items-center justify-center gap-[10px] lg:order-3 lg:ml-[25px]"
      >
        <ChevronRight />
        <p className="text-[18px] font-normal text-gray4">더보기</p>
      </Link>
    </section>
  );
}

// ---- Page ----

export default async function AdminPage() {
  // 화면 접근 차단. 데이터 변경 차단은 service 의 assertRole 이 따로 맡는다.
  // 대시보드는 위키 운영 화면이므로 EDITOR 부터 들어온다 (ADMIN 은 계층상 포함).
  const session = await requireRole("EDITOR");

  // LNB 를 여기에도 붙인다. 관리 화면 중 한 곳에만 메뉴가 있으면 대시보드에서
  // 위키 관리로 갈 길이 주소창뿐이고, LNB 의 "대시보드" 항목도 돌아올 곳이 없는
  // 링크가 된다. 셸이 layout 이 아니라 컴포넌트라 페이지마다 이렇게 감싼다
  // (AdminShell 주석 — 가드가 layout 으로 따라 올라가는 것을 막기 위해서다).
  return (
    <AdminShell role={session.role}>
      {/* 인사 + 퀵 액션
          시안은 한 줄이지만 375px 에서는 인사말(45px)과 버튼 셋이 같은 줄에
          들어가지 않는다. lg 미만에서 세로로 쌓고 글자를 32px 로 줄인다 —
          "관리자님, / 안녕하세요" 두 줄은 시안의 줄바꿈이라 그대로 둔다. */}
      <div className="mx-auto mb-[40px] flex max-w-[900px] flex-col gap-[24px] lg:mb-[70px] lg:flex-row lg:items-center lg:justify-between lg:gap-[30px]">
        <div className="flex flex-col gap-[5px]">
          <p className="text-[32px] font-extrabold leading-[36px] lg:text-[45px] lg:leading-[45px]">
            관리자님,
          </p>
          <p className="text-[32px] font-normal leading-[36px] lg:text-[45px] lg:leading-[45px]">
            안녕하세요
          </p>
        </div>

        <div className="flex items-center gap-[12px] lg:gap-[30px]">
          <QuickAction
            href="/admin/posts/new"
            gap="10"
            lines={["새 게시물", "만들기"]}
            icon={
              <svg
                width="17"
                height="18"
                viewBox="0 0 17 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-brand-red"
              >
                <path
                  d="M8.5 1v16M1 9h15.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />

          <QuickAction
            href="/admin/saved"
            gap="10"
            lines={["임시저장", "게시물"]}
            icon={
              <svg
                width="16"
                height="18"
                viewBox="0 0 16 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-brand-red"
              >
                <path
                  d="M2 1h12v15l-6-3.5L2 16V1z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          <QuickAction
            href="/"
            gap="8"
            lines={["열린위키", "홈화면"]}
            icon={
              <div className="flex size-[22px] items-center justify-center rounded-full bg-brand-red">
                <span className="text-[14px] font-bold leading-none text-white">
                  Y
                </span>
              </div>
            }
          />
        </div>
      </div>

      {/* 대시보드 섹션 */}
      <div className="mx-auto flex max-w-[900px] flex-col gap-[40px] lg:gap-[70px]">
        <DashboardSection
          href="/admin/comments"
          emoji="💬"
          title="최근 달린 댓글"
        >
          {recentComments.map((c) => (
            <CommentCard key={c.id} {...c} />
          ))}
        </DashboardSection>

        <DashboardSection
          href="/admin/reports"
          emoji="🚨"
          title="댓글 신고 관리"
        >
          {recentReports.map((r) => (
            <ReportCard key={r.id} {...r} />
          ))}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
