import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용 안내 - 열린위키",
};

/**
 * 이용 안내 — `/policy`.
 *
 * **문구를 마크다운 파일에서 읽지 않는다.** 원문은 docs/policy-draft.md 에 있지만
 * 그건 사람이 초안을 쓰고 검토하는 자리이고, 화면이 그 파일을 런타임에 읽으면
 * 파일시스템 경로가 배포 산출물의 일부가 된다 — Java 백엔드로 옮길 때 사라지는
 * 종류의 의존이다. 여기서는 정적 JSX 로 박아 두고, 문구가 바뀌면 두 곳을 함께 고친다.
 *
 * 사용자 입력이 섞이지 않는 고정 문서라 상태도 fetch 도 없다. 서버 컴포넌트로
 * 두면 이 페이지의 클라이언트 번들은 0 이다.
 */
export default function PolicyPage() {
  return (
    <article className="mx-auto w-hero max-w-full pb-[120px] pt-[79px]">
      <h1 className="text-[32px] font-extrabold leading-[45px] text-black">
        이용 안내
      </h1>

      <p className="mt-[20px] text-[15px] font-light leading-[26px] text-gray4">
        열린위키는 열린교회 공동체가 함께 만들어가는 기록 공간입니다.
        <br />
        가입하고 이용하시기 전에 아래 내용을 확인해 주세요.
      </p>

      <Section title="1. 함께 쓰는 문서입니다">
        <p>열린위키의 문서는 특정 개인의 소유가 아닙니다.</p>
        <ul>
          <li>편집 권한을 가진 분들은 누구나 문서를 수정할 수 있습니다.</li>
          <li>내가 작성한 문서라도 다른 분이 내용을 고치거나 보완할 수 있습니다.</li>
          <li>관리자는 모든 문서를 수정하거나 삭제할 수 있습니다.</li>
        </ul>
        <p>
          이는 잘못된 것이 아니라 위키가 작동하는 방식입니다.
          <br />
          공동체의 기록이 더 정확하고 풍성해지도록 서로의 글을 다듬어 주세요.
        </p>
      </Section>

      <Section title="2. 남기신 기록은 보존됩니다">
        <p>작성하신 문서와 댓글은 공동체의 기록으로 남습니다.</p>
        <ul>
          <li>탈퇴하시더라도 작성한 문서와 댓글은 삭제되지 않습니다.</li>
          <li>
            문서는 여러 사람의 편집이 쌓여 만들어지므로, 한 사람의 기여만 따로
            걷어내면 나머지 내용의 맥락이 무너지기 때문입니다.
          </li>
          <li>다만 탈퇴 후에는 작성자 정보가 표시되지 않습니다.</li>
        </ul>
      </Section>

      <Section title="3. 탈퇴에 관하여">
        <p>탈퇴는 되돌릴 수 없습니다. 신중히 결정해 주세요.</p>
        <ul>
          <li>탈퇴하시면 이름, 연락처, 생년월일 등 회원정보가 삭제됩니다.</li>
          <li>삭제된 정보는 복구할 수 없으며, 탈퇴를 취소할 수도 없습니다.</li>
          <li>
            <strong className="font-bold text-black">
              탈퇴한 아이디는 다시 사용할 수 없습니다.
            </strong>
            <br />
            본인이 다시 가입하시더라도 이전 아이디는 사용할 수 없고, 다른
            아이디로 새로 가입하셔야 합니다.
          </li>
          <li>
            아이디를 남겨두는 이유는, 과거에 남기신 기록이 나중에 같은 아이디를
            쓰는 다른 분의 것으로 오인되지 않도록 하기 위함입니다.
          </li>
        </ul>
      </Section>

      <Section title="4. 수집하는 정보">
        <p>
          가입 시 아이디, 비밀번호, 이름, 성별, 생년월일, 연락처, 열린교회 소속
          여부를 수집합니다.
        </p>
        {/* TODO: 교회 담당자와 확인 후 작성
              - 수집·이용 목적
              - 보유 및 이용 기간
              - 개인정보 파기 절차
              - 문의처
            JSX 주석이라 렌더 결과에도 HTML 소스에도 남지 않는다. 초안
            (docs/policy-draft.md 4절)의 HTML 주석을 그대로 옮기면 브라우저에서
            "보기 소스"로 읽히므로 그 형태로는 두지 않는다. */}
      </Section>

      <Section title="문의">
        <p>
          내용에 궁금한 점이 있으시면 문화팀으로 연락 주세요.
          <br />
          ycteam001@gmail.com
        </p>
      </Section>
    </article>
  );
}

/**
 * 절 하나. 제목 + 본문의 간격·서체를 한 곳에서 정한다.
 *
 * 문서가 길어질수록 절마다 클래스를 반복하면 한 절만 서체가 어긋나기 쉽다.
 * 본문 요소(p / ul / li)의 스타일은 자식 선택자로 건다 — 문구를 옮겨 적는
 * 사람이 태그마다 클래스를 붙이지 않아도 되게.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[50px]">
      <h2 className="text-[20px] font-bold leading-[28px] text-black">
        {title}
      </h2>
      <hr className="mt-[14px] border-t border-gray2" />
      <div className="mt-[16px] flex flex-col gap-[14px] text-[15px] font-light leading-[26px] text-gray4 [&_li]:relative [&_li]:pl-[14px] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['·'] [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-[8px]">
        {children}
      </div>
    </section>
  );
}
