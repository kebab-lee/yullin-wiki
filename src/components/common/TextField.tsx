import { applyMask, deleteDigit } from "@/lib/format/mask";

import FieldMessage from "./FieldMessage";

/**
 * 인풋 높이.
 * - `md` 44px : 로그인처럼 인풋만 세로로 쌓이는 화면 (Figma 1:1207)
 * - `sm` 30px : 회원가입처럼 라벨과 한 줄로 붙는 화면 (Figma 1:1194)
 *
 * `sm` 은 lg 미만에서 44px 로 늘어난다 — 30px 는 터치 타깃 하한에 못 미친다
 * (CLAUDE.md "반응형"). 시안 높이는 lg 부터 그대로 적용된다.
 */
export type FieldSize = "md" | "sm";

export const FIELD_SIZE_CLASS: Record<FieldSize, string> = {
  md: "h-[44px] px-[12px] text-[14px] leading-[17px]",
  sm: "h-11 px-[10px] text-[14px] leading-[17px] lg:h-[30px]",
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
  /**
   * 입력 중인 값을 다듬는 순수 함수 (`src/lib/format/`).
   *
   * 넘기면 이 필드는 마스킹 입력이 된다 — 치는 동안 구분자가 자동으로 붙고,
   * 구분자 위에서 지우기를 누르면 그 너머의 숫자가 지워지고, 커서는 제자리에
   * 남는다. 규칙 자체는 여기 두지 않는다. 전화번호인지 생년월일인지는 format
   * 모듈이 알고, 이 컴포넌트는 "언제 불러서 커서를 어떻게 지킬 것인가"만 안다
   * (검증을 validation 모듈에 맡기는 것과 같은 결).
   *
   * **부모가 받는 값이 곧 포맷된 값이다.** 화면만 꾸미는 것이 아니라 폼
   * state 가 포맷된 문자열을 들고 있게 되며, 그 값이 그대로 서버로 간다.
   */
  format?: (value: string) => string;
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
  format,
}: TextFieldProps) {
  const errorId = error ? `${name}-error` : undefined;

  /**
   * 값과 커서를 **DOM 에 직접** 써 넣고 나서 부모에게 알린다.
   *
   * effect 로 미루지 않는 것이 핵심이다. controlled input 은 부모가 넘긴 값으로
   * 다시 그려지는데, 그때 DOM 의 값이 이미 같으면 React 는 인풋을 건드리지
   * 않는다 — 그래서 여기서 맞춰 둔 커서가 그대로 남는다. 반대로 state 만 바꾸고
   * 놔두면 인풋이 새로 그려지며 커서가 맨 뒤로 튄다.
   */
  const commit = (
    input: HTMLInputElement,
    next: { value: string; caret: number },
  ) => {
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    onChange(next.value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (!format) {
      onChange(input.value);
      return;
    }
    // 붙여넣기도 이 경로로 들어온다. format 이 숫자만 남기고 다시 끊으므로
    // "010-0000-0000" 을 붙여넣든 "01000000000" 을 붙여넣든 결과가 같다.
    const caret = input.selectionStart ?? input.value.length;
    commit(input, applyMask(input.value, caret, format));
  };

  /**
   * 구분자 위에서의 지우기.
   *
   * 그냥 두면 브라우저가 하이픈을 지우고 → 곧바로 재포맷되어 하이픈이 되살아나
   * 화면상 아무 일도 일어나지 않는다. 그래서 하이픈 대신 그 너머의 숫자를
   * 지운다. 숫자 위에서 눌렀거나 범위를 선택했을 때는 손대지 않는다.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!format) return;
    if (e.key !== "Backspace" && e.key !== "Delete") return;

    const input = e.currentTarget;
    const start = input.selectionStart;
    if (start === null || start !== input.selectionEnd) return;

    const backward = e.key === "Backspace";
    const boundary = input.value[backward ? start - 1 : start];
    if (boundary === undefined || /\d/.test(boundary)) return;

    const next = deleteDigit(
      input.value,
      start,
      backward ? "backward" : "forward",
      format,
    );
    if (!next) return;

    e.preventDefault();
    commit(input, next);
  };

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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
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
