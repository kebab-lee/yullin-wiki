export type FieldMessageTone = "hint" | "error" | "success";

const TONE_CLASS: Record<FieldMessageTone, string> = {
  hint: "text-gray3",
  error: "text-brand-red",
  success: "text-category-green-dark",
};

type FieldMessageProps = {
  id?: string;
  tone?: FieldMessageTone;
  children: React.ReactNode;
};

/**
 * 인풋 아래에 붙는 한 줄 문구 — 에러 / 안내 / 성공.
 *
 * 인풋 하나에 딸린 문구는 TextField 가 직접 그리지만,
 * 아이디(인풋+중복확인 버튼)나 비밀번호(인풋 2개)처럼 컨트롤 여러 개를
 * 함께 가리키는 문구는 폼이 이 컴포넌트를 직접 쓴다.
 *
 * Figma: 인풋 아래 5px, 좌측 5px 인셋, 14px.
 */
export default function FieldMessage({
  id,
  tone = "hint",
  children,
}: FieldMessageProps) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : undefined}
      className={`mt-[5px] pl-[5px] text-[14px] font-normal leading-[17px] ${TONE_CLASS[tone]}`}
    >
      {children}
    </p>
  );
}
