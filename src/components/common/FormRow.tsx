type FormRowProps = {
  label: string;
  /**
   * 컨트롤이 하나뿐인 행이면 그 인풋의 id(=name).
   * 라디오 그룹처럼 가리킬 단일 컨트롤이 없으면 생략한다 — `<span>` 으로 그리고
   * 접근성 이름은 컨트롤(fieldset legend)이 스스로 갖는다.
   */
  htmlFor?: string;
  /**
   * 컨트롤 영역의 **데스크톱** 폭. Figma 필드 프레임 폭을 `lg:` 를 붙여서 넣는다
   * (예: `lg:w-[254px]`).
   *
   * lg 미만은 항상 전폭이라 여기서 받지 않는다. `lg:` 를 호출부가 직접 적는
   * 이유는 Tailwind 가 소스에 **문자 그대로** 나타난 클래스만 생성하기 때문이다 —
   * 여기서 `lg:${controlWidth}` 로 조립하면 그 클래스가 CSS 에 만들어지지 않는다.
   */
  controlWidth: string;
  children: React.ReactNode;
};

/**
 * 라벨 컬럼 폭. 가장 긴 라벨("열린교회 소속") 기준.
 * lg 미만에서는 라벨이 컨트롤 위로 올라가므로 폭을 잡지 않는다.
 */
const LABEL_WIDTH = "lg:w-[110px] lg:shrink-0 lg:pt-[7px]";

/**
 * 라벨 + 컨트롤 한 행 (회원가입 폼).
 *
 * 라벨을 왼쪽 고정 컬럼에 두는 배치가 회원가입 시안(1:1194)의 폼 구조다.
 * 인풋마다 라벨 마크업을 반복하지 않도록 행이 라벨을 소유하고,
 * TextField/SelectField 는 `labelPlacement="external"` 로 자기 라벨을 끈다.
 *
 * 한 행에 컨트롤이 여러 개인 경우(아이디+중복확인, 비밀번호+확인)도
 * children 으로 그대로 담는다.
 */
export default function FormRow({
  label,
  htmlFor,
  controlWidth,
  children,
}: FormRowProps) {
  const labelClass = `${LABEL_WIDTH} text-[14px] font-medium leading-[17px] text-black`;

  return (
    // lg 미만: 라벨 위 · 컨트롤 아래. 좁은 화면에서 110px 라벨 컬럼을 유지하면
    // 남는 폭이 인풋을 담기에 모자란다.
    <div className="flex flex-col gap-[6px] lg:flex-row lg:items-start lg:gap-[16px]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}

      <div className={`w-full min-w-0 ${controlWidth}`}>{children}</div>
    </div>
  );
}
