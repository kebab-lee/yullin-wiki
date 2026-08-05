import FieldMessage from "./FieldMessage";

/**
 * 인풋 높이.
 * - `md` 44px : 로그인처럼 인풋만 세로로 쌓이는 화면 (Figma 1:1207)
 * - `sm` 30px : 회원가입처럼 라벨과 한 줄로 붙는 화면 (Figma 1:1194)
 */
export type FieldSize = "md" | "sm";

export const FIELD_SIZE_CLASS: Record<FieldSize, string> = {
  md: "h-[44px] px-[12px] text-[14px] leading-[17px]",
  sm: "h-[30px] px-[10px] text-[14px] leading-[17px]",
};

export const FIELD_BASE_CLASS =
  "w-full rounded-badge border border-gray2 bg-white font-light text-black outline-none transition-colors placeholder:text-gray3 focus:border-brand-red";

type TextFieldProps = {
  /**
   * 접근성용 이름.
   * `labelPlacement="hidden"`(기본)이면 화면에는 감추고 placeholder 로 재사용한다 —
   * 로그인 시안에는 별도 라벨 텍스트가 없고 인풋 내부 문구가 그 역할을 한다.
   */
  label: string;
  name: string;
  type?: "text" | "password" | "email" | "tel";
  value: string;
  onChange: (value: string) => void;
  /** 지정하지 않으면 label 을 그대로 쓴다. */
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
  size?: FieldSize;
  /**
   * - `hidden`  : sr-only 라벨을 이 컴포넌트가 그린다 (기본, 로그인)
   * - `external`: 바깥(FormRow)이 `<label htmlFor={name}>` 을 그린다.
   *               라벨이 두 벌 읽히지 않도록 여기서는 그리지 않는다.
   */
  labelPlacement?: "hidden" | "external";
  /** 인풋 아래에 붙는 인라인 에러 문구. 없으면 렌더하지 않는다. */
  error?: string;
};

/**
 * 아이디 / 비밀번호 같은 한 줄 입력 필드.
 *
 * 로그인·회원가입이 공유하는 공용 프리미티브다.
 * 상태(value)는 갖지 않고 부모가 넘긴 값을 그리기만 한다 — 폼 단위 검증·에러는
 * 이 컴포넌트가 아니라 폼이 결정한다.
 *
 * Figma: 로그인 1:1207 의 인풋 300x44, 내부 좌측 패딩 12px.
 * 에러 문구는 1:1432 기준 인풋 아래 5px, 좌측 5px 인셋, 14px.
 */
export default function TextField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  size = "md",
  labelPlacement = "hidden",
  error,
}: TextFieldProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="flex w-full flex-col">
      {labelPlacement === "hidden" && (
        <label htmlFor={name} className="sr-only">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${FIELD_BASE_CLASS} ${FIELD_SIZE_CLASS[size]}`}
      />
      {error && (
        <FieldMessage id={errorId} tone="error">
          {error}
        </FieldMessage>
      )}
    </div>
  );
}
