import FieldMessage from "./FieldMessage";

export type RadioOption = {
  value: string;
  label: string;
};

type RadioGroupProps = {
  /** 그룹 이름. 화면에 라벨을 따로 그리는 경우(FormRow)에도 접근성용으로 필요하다. */
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly RadioOption[];
  direction?: "row" | "column";
  error?: string;
};

/**
 * 선택지가 화면에 펼쳐지는 단일 선택 (회원가입 열린교회 소속 292x65).
 *
 * 셀렉트와 달리 선택지를 열지 않아도 다 보인다. 시안이 두 줄로 펼쳐 놓은
 * 항목에만 쓴다 — 한 줄 30px 로 접혀 있는 성별은 SelectField.
 *
 * `<fieldset>` 하나가 그룹 전체의 접근성 이름을 가지므로 FormRow 는
 * 이 컨트롤에 `htmlFor` 를 걸지 않는다 (라디오 하나를 가리키게 되기 때문).
 */
export default function RadioGroup({
  legend,
  name,
  value,
  onChange,
  options,
  direction = "column",
  error,
}: RadioGroupProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <fieldset
      className="flex w-full flex-col"
      aria-invalid={error ? true : undefined}
      aria-describedby={errorId}
    >
      <legend className="sr-only">{legend}</legend>

      <div
        className={`flex gap-[5px] ${direction === "row" ? "flex-row items-center gap-[20px]" : "flex-col"}`}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex h-11 cursor-pointer items-center gap-[8px] lg:h-[30px] text-[14px] font-light leading-[17px] text-black"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="size-[20px] shrink-0 accent-brand-red lg:size-[16px]"
            />
            {option.label}
          </label>
        ))}
      </div>

      {error && (
        <FieldMessage id={errorId} tone="error">
          {error}
        </FieldMessage>
      )}
    </fieldset>
  );
}
