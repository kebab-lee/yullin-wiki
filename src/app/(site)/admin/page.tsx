import Link from "next/link";

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

function CommentCard({ author, date, content, postTitle, commentCount }: CommentPreview) {
  return (
    <div className="bg-brand-red-white rounded-[20px] size-[190px] px-[18px] py-[20px] flex flex-col items-end justify-between shrink-0">
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
    <div className="bg-brand-red-white rounded-[20px] size-[190px] px-[18px] py-[20px] flex flex-col gap-[10px] items-end shrink-0">
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

// ---- Page ----

export default async function AdminPage() {
  // 화면 접근 차단. 데이터 변경 차단은 service 의 assertRole 이 따로 맡는다.
  // 대시보드는 위키 운영 화면이므로 EDITOR 부터 들어온다 (ADMIN 은 계층상 포함).
  await requireRole("EDITOR");

  return (
    <div className="pt-[97px] pb-[80px]">
      {/* 인사 + 퀵 액션 */}
      <div className="mx-auto max-w-[900px] flex items-center justify-between mb-[70px]">
        <div className="flex flex-col gap-[5px]">
          <p className="text-[45px] font-extrabold leading-[45px]">관리자님,</p>
          <p className="text-[45px] font-normal leading-[45px]">안녕하세요</p>
        </div>

        <div className="flex items-center gap-[30px]">
          {/* 새 게시물 만들기 */}
          <Link
            href="/admin/posts/new"
            className="size-[110px] rounded-full border-2 border-brand-red bg-white flex flex-col gap-[10px] items-center justify-center"
          >
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
            <div className="text-brand-red text-[18px] font-bold text-center leading-[18px]">
              <p className="mb-[5px]">새 게시물</p>
              <p>만들기</p>
            </div>
          </Link>

          {/* 임시저장 게시물 */}
          <Link
            href="/admin/saved"
            className="size-[110px] rounded-full border-2 border-brand-red bg-white flex flex-col gap-[10px] items-center justify-center"
          >
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
            <div className="text-brand-red text-[18px] font-bold text-center leading-[18px]">
              <p className="mb-[5px]">임시저장</p>
              <p>게시물</p>
            </div>
          </Link>

          {/* 열린위키 홈화면 */}
          <Link
            href="/"
            className="size-[110px] rounded-full border-2 border-brand-red bg-white flex flex-col gap-[8px] items-center justify-center"
          >
            <div className="bg-brand-red rounded-full size-[22px] flex items-center justify-center">
              <span className="text-white font-bold text-[14px] leading-none">Y</span>
            </div>
            <div className="text-brand-red text-[18px] font-bold text-center leading-[18px]">
              <p className="mb-[5px]">열린위키</p>
              <p>홈화면</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 대시보드 섹션 */}
      <div className="mx-auto max-w-[900px] flex flex-col gap-[70px]">
        {/* 최근 달린 댓글 */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/admin/comments"
            className="flex gap-[30px] items-center whitespace-nowrap shrink-0"
          >
            <div className="font-bold">
              <p className="text-[40px] leading-[22px] mb-[10px]">💬</p>
              <p className="text-[22px] leading-[22px]">최근 달린 댓글</p>
            </div>
            <span className="font-medium text-[25px] leading-[22px]">→</span>
          </Link>

          <div className="flex gap-[25px] items-center">
            {recentComments.map((c) => (
              <CommentCard key={c.id} {...c} />
            ))}
          </div>

          <Link
            href="/admin/comments"
            className="flex flex-col gap-[10px] items-center justify-center shrink-0 ml-[25px]"
          >
            <ChevronRight />
            <p className="text-[18px] font-normal text-gray4">더보기</p>
          </Link>
        </div>

        {/* 댓글 신고 관리 */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/admin/reports"
            className="flex gap-[30px] items-center whitespace-nowrap shrink-0"
          >
            <div className="font-bold">
              <p className="text-[40px] leading-[22px] mb-[10px]">🚨</p>
              <p className="text-[22px] leading-[22px]">댓글 신고 관리</p>
            </div>
            <span className="font-medium text-[25px] leading-[22px]">→</span>
          </Link>

          <div className="flex gap-[25px] items-center">
            {recentReports.map((r) => (
              <ReportCard key={r.id} {...r} />
            ))}
          </div>

          <Link
            href="/admin/reports"
            className="flex flex-col gap-[10px] items-center justify-center shrink-0 ml-[25px]"
          >
            <ChevronRight />
            <p className="text-[18px] font-normal text-gray4">더보기</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
