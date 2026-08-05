import FieldMessage from "./FieldMessage";
import {
  FIELD_BASE_CLASS,
  FIELD_SIZE_CLASS,
  type FieldSize,
} from "./TextField";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** 아무것도 고르지 않았을 때 보이는 문구. 값은 빈 문자열이다. */
  placeholder?: string;
  size?: FieldSize;
  /** TextField 와 같은 규칙 — `external` 이면 바깥이 라벨을 그린다. */
  labelPlacement?: "hidden" | "external";
  error?: string;
};

/**
 * 한 값을 고르는 셀렉트 (회원가입 성별 180x30).
 *
 * 인풋 껍데기(테두리·높이·포커스 색)는 TextField 와 토큰을 공유한다 —
 * 한 줄에 나란히 놓이는 컨트롤이라 어긋나면 바로 보인다.
 *
 * 선택지가 2~3개라도 라디오 대신 셀렉트를 쓰는 건 시안이 30px 한 줄이기 때문이다.
 * 시안이 여러 줄로 펼쳐진 소속(292x65)은 RadioGroup 을 쓴다.
 */
export default function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "선택",
  size = "md",
  labelPlacement = "hidden",
  error,
}: SelectFieldProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="flex w-full flex-col">
      {labelPlacement === "hidden" && (
        <label htmlFor={name} className="sr-only">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`${FIELD_BASE_CLASS} ${FIELD_SIZE_CLASS[size]} cursor-pointer appearance-none pr-[28px] ${
            value === "" ? "text-gray3" : ""
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-black">
              {option.label}
            </option>
          ))}
        </select>

        {/* 네이티브 화살표를 지웠으니 셰브론을 직접 그린다. */}
        <svg
          aria-hidden
          viewBox="0 0 12 8"
          className="pointer-events-none absolute right-[10px] top-1/2 h-[6px] w-[10px] -translate-y-1/2 fill-none stroke-gray3"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1.5 6 6.5 11 1.5" />
        </svg>
      </div>

      {error && (
        <FieldMessage id={errorId} tone="error">
          {error}
        </FieldMessage>
      )}
    </div>
  );
}
