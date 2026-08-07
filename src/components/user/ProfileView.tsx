import Link from "next/link";

import type { User } from "@/lib/types";
import { GENDER_LABEL } from "@/lib/types";
import { CHURCH_MEMBER_LABEL } from "@/lib/validation/user";

/**
 * 값이 비어 있을 때 자리를 지키는 문구.
 *
 * name/gender/birthDate/phone 이 null 인 것은 탈퇴 계정뿐이라(types/user.ts)
 * 이 화면에서는 거의 나오지 않는다. 그래도 `!` 로 단언하지 않는다 — 타입이
 * null 을 허용하는 이상 언젠가는 온다.
 */
const EMPTY_VALUE = "-";

/**
 * 정보 그리드 한 행: "라벨 | 값" (Figma 1:1003, 행 높이 30, 라벨 폭 90).
 *
 * dl > div > dt+dd 는 유효한 구조다. 라벨과 값이 한 쌍이라는 사실을 마크업이
 * 들고 있어야 스크린리더에서도 "아이디: yullin" 으로 읽힌다.
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[30px] items-center">
      <dt className="w-[90px] shrink-0 text-[14px] font-medium leading-[17px] text-black">
        {label}
      </dt>
      {/* 라벨과 값 사이 세로 구분선 (높이 14) */}
      <span aria-hidden className="mr-[14px] h-[14px] w-px bg-gray2" />
      <dd className="truncate text-[14px] font-light leading-[17px] text-gray4">
        {value}
      </dd>
    </div>
  );
}

/**
 * 마이페이지 조회 — Figma 유저 마이페이지 1:1003 (Frame 1507, 880x593).
 *
 * 서버 컴포넌트다. 이 화면에는 상태도 이벤트도 없다 — "수정"도 "계정 삭제하기"도
 * 링크 이동이고, 판단과 제출은 이동한 화면이 한다.
 *
 * **하단 "내 댓글 모아보기"(Frame 1495)는 렌더하지 않는다.** 댓글 기능 자체가
 * 아직 없어서 자리만 비워두면 빈 상자가 영구히 남는데, 그건 "곧 생긴다"는
 * 약속을 화면에 새기는 일이다. 댓글 슬라이스가 들어올 때 이 컴포넌트 아래에
 * 섹션을 더한다.
 */
export default function ProfileView({ user }: { user: User }) {
  return (
    // Figma: x=316 → 1512 아트보드에서 880px 중앙 정렬. y=210 은 헤더(131px) 아래 79px.
    <div className="mx-auto flex w-hero max-w-full gap-[90px] pb-[120px] pt-[79px]">
      {/* Figma Frame 1500 (195x136) */}
      <div className="w-[195px] shrink-0">
        <p className="text-[32px] font-extrabold leading-[45px] text-black">
          {user.name ?? EMPTY_VALUE}님,
        </p>
        <p className="text-[32px] font-normal leading-[45px] text-black">
          안녕하세요
        </p>

        {/* Figma: y=110, 97x26 — 탈퇴 화면(1:1163)으로 가는 링크.
            버튼이 아니라 Link 다. 여기서 하는 일은 이동뿐이고, 삭제 여부를 묻는
            것도 실제 삭제도 그 화면의 몫이다 — 조회 화면을 클라이언트
            컴포넌트로 만들 이유가 없다.

            관리자에게도 그대로 보인다. 숨기면 "왜 없지"를 화면이 답하지 못하고,
            그 화면이 이미 이유를 적어두고 있다. */}
        <Link
          href="/mypage/withdraw"
          className="mt-[15px] flex h-[26px] w-[97px] items-center justify-center rounded-badge border border-gray2 text-[13px] font-normal leading-[16px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red"
        >
          계정 삭제하기
        </Link>
      </div>

      {/* Figma Frame 1494 (595x170) */}
      <div className="w-[595px] shrink-0">
        <div className="flex h-[24px] items-center justify-between">
          <h2 className="text-[15px] font-medium leading-[18px] text-black">
            회원정보
          </h2>

          {/* Figma: x=535, 60x24 (연필 아이콘 + "수정") */}
          <Link
            href="/mypage/edit"
            className="flex h-[24px] w-[60px] items-center justify-center gap-[4px] rounded-badge border border-gray2 text-[13px] font-normal leading-[16px] text-gray4 transition-colors hover:border-brand-red hover:text-brand-red"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M8.5 1.5l2 2L4 10H2V8l6.5-6.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            수정
          </Link>
        </div>

        {/* Figma: y=42 구분선 (595폭) */}
        <hr className="mt-[18px] border-t border-gray2" />

        {/* Figma: y=60, 446x110 — 2열 정보 그리드 (좌열 210 / 우열 236) */}
        <dl className="mt-[18px] grid w-[446px] grid-cols-[210px_236px] gap-y-[10px]">
          <InfoRow label="아이디" value={user.loginId} />
          <InfoRow label="생년월일" value={user.birthDate ?? EMPTY_VALUE} />

          <InfoRow label="이름" value={user.name ?? EMPTY_VALUE} />
          <InfoRow label="전화번호" value={user.phone ?? EMPTY_VALUE} />

          <InfoRow
            label="성별"
            value={user.gender ? GENDER_LABEL[user.gender] : EMPTY_VALUE}
          />
          <InfoRow
            label="열린교회 소속"
            value={
              CHURCH_MEMBER_LABEL[user.isChurchMember ? "MEMBER" : "NON_MEMBER"]
            }
          />
        </dl>
      </div>
    </div>
  );
}
