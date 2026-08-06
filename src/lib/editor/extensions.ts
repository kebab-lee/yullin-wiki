// =============================================================
// Tiptap 스키마 확장 목록 — 에디터와 읽기 전용 렌더러의 **공통 정본**
//
// 이 배열이 두 벌이 되면 "저장은 됐는데 화면에 안 나오는 노드"가 생긴다.
// generateHTML 은 여기 없는 노드 타입을 만나면 스키마에 없다고 통째로 버리기
// 때문에, 에디터에만 있고 렌더러에 없는 확장이 하나라도 있으면 그 블록은
// DB 에 멀쩡히 남은 채 화면에서만 사라진다. 그래서 import 지점을 하나로 묶는다.
//
// **여기에는 문서 구조(스키마)에 영향을 주는 확장만 둔다.**
// Placeholder·슬래시 커맨드처럼 편집 중 동작만 바꾸고 저장되는 JSON 에는
// 흔적을 남기지 않는 확장은 렌더러가 알 필요가 없으므로 에디터 쪽에 남긴다.
// (그 둘을 여기 넣으면 렌더러가 @tiptap/suggestion 같은 편집 전용 의존성을
//  서버 번들로 끌고 들어온다)
// =============================================================

import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/core";

/**
 * 저장되는 본문 JSON 의 스키마를 이루는 확장들.
 *
 * StarterKit 3.x 는 Link 와 Underline 을 이미 포함한다. 그래서 Link 를 따로
 * import 해서 배열에 더하면 확장 이름이 겹친다("Duplicate extension names").
 * 설정이 필요하면 별도 인스턴스를 얹지 말고 StarterKit 의 옵션으로 넘긴다.
 */
export const contentExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: { keepMarks: true },
    orderedList: { keepMarks: true },
    // 읽기 화면에서는 링크가 눌려야 하고 에디터에서는 눌리면 안 되지만,
    // openOnClick 은 스키마가 아니라 에디터 플러그인 동작이라 저장 결과에
    // 영향이 없다. 렌더러는 이 값을 무시한다.
    link: { openOnClick: false },
  }),
  // allowBase64: 에디터가 붙여넣기·업로드 미리보기로 data: URL 을 넣는다.
  // 렌더러가 이 옵션을 안 켜면 같은 이미지 노드가 화면에서 사라진다.
  Image.configure({ allowBase64: true }),
];
