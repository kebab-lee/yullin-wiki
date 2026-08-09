import Link from "next/link";

import type { Role, UserStatus } from "@/lib/types";
import { USER_STATUSES } from "@/lib/types";

import { ROLE_LABEL, USER_STATUS_LABEL } from "./labels";
import { userListHref } from "./userListHref";

type AdminUserFiltersProps = {
  basePath: string;
  /** 서버가 실제로 적용한 필터. null 은 전체다. */
  current: { role: Role | null; status: UserStatus | null };
  /**
   * 역할 탭에 노출할 값. **화면마다 다르다** — /admin/users 는 전체(null)를
   * 포함한 넷, /admin/admins 는 권한 보유자 둘뿐이다. 이 목록을 컴포넌트가
   * 스스로 정하면 두 화면이 다시 갈라진다.
   */
  roleOptions: readonly (Role | null)[];
};

/** 상태 탭은 두 화면이 같다. 전체(null)가 맨 앞. */
const STATUS_OPTIONS: readonly (UserStatus | null)[] = [null, ...USER_STATUSES];

/**
 * 필터 탭 한 줄. 역할 줄과 상태 줄이 같은 모양을 쓴다.
 *
 * 링크의 목적지는 **다른 축을 유지한 채 자기 축만 갈아끼운 경로**다. 역할 탭이
 * 상태를 떨어뜨리면 "차단된 편집자"를 보고 있다가 역할을 눌렀을 때 상태 필터가
 * 조용히 풀린다.
 */
function FilterRow<T extends string>({
  label,
  options,
  current,
  hrefFor,
  labelOf,
}: {
  label: string;
  options: readonly (T | null)[];
  current: T | null;
  hrefFor: (value: T | null) => string;
  labelOf: (value: T) => string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={[
        "-mx-4 flex gap-[8px] overflow-x-auto px-4",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "lg:mx-0 lg:overflow-x-visible lg:px-0",
      ].join(" ")}
    >
      {options.map((value) => {
        const active = current === value;

        return (
          <Link
            key={value ?? "ALL"}
            href={hrefFor(value)}
            aria-current={active ? "true" : undefined}
            className={[
              // 44px(h-11) 터치 타깃 → lg 에서 Figma 액션 버튼 높이 45px.
              "flex h-11 shrink-0 items-center justify-center whitespace-nowrap px-[18px] lg:h-[45px]",
              "rounded-pill border text-[15px] leading-[18px] transition-colors",
              active
                ? "border-brand-red bg-brand-red font-bold text-white"
                : "border-gray2 bg-white text-gray4 hover:border-brand-red hover:text-brand-red",
            ].join(" ")}
          >
            {value ? labelOf(value) : "전체"}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * 사용자 목록의 역할·상태 필터 (Figma AdSaved 1:1490 의 액션 영역과 같은 칩).
 *
 * **버튼이 아니라 링크다.** 필터를 useState 로 들면 새로고침·뒤로가기·링크
 * 공유가 깨지고, 서버 컴포넌트가 목록을 그릴 수 없어 화면 전체가 클라이언트로
 * 내려간다 (AdminPageStatusFilter 와 같은 근거).
 *
 * 두 줄로 쌓는다. 한 줄에 이어 붙이면 375px 에서 일곱 칩이 한 스크롤 줄에
 * 몰려 어느 칩이 어느 축인지 구분되지 않는다.
 */
export default function AdminUserFilters({
  basePath,
  current,
  roleOptions,
}: AdminUserFiltersProps) {
  return (
    <div className="flex flex-col gap-[10px]">
      <FilterRow
        label="역할 필터"
        options={roleOptions}
        current={current.role}
        hrefFor={(role) => userListHref(basePath, { ...current, role })}
        labelOf={(role) => ROLE_LABEL[role]}
      />
      <FilterRow
        label="상태 필터"
        options={STATUS_OPTIONS}
        current={current.status}
        hrefFor={(status) => userListHref(basePath, { ...current, status })}
        labelOf={(status) => USER_STATUS_LABEL[status]}
      />
    </div>
  );
}
