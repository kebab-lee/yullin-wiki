// =============================================================
// 파일 스토리지 접근 — 오브젝트 저장소를 붙잡고 있는 유일한 파일
//
// **S3(또는 다른 오브젝트 스토리지)로 교체할 때 바꾸는 파일은 여기 하나다.**
// 그러기 위해 인터페이스를 스토리지 중립적으로 둔다:
//
//     upload(file, path) → { url }
//     delete(path)       → void
//
// 반환값에 Supabase 고유 타입이 없다. `StorageError` 도, `FileObject` 도,
// SDK 가 돌려주는 `{ data, error }` 봉투도 밖으로 나가지 않는다 — 실패는
// 평범한 Error 로 던지고 성공은 문자열 URL 하나로 답한다. 그래서 service 와
// UI 는 파일이 어디에 사는지 모른다.
//
// bucket 이름과 공개 URL 규칙도 이 파일에만 있다. 그 둘이 위로 새면
// 스토리지를 갈아끼울 때 service·스크립트까지 함께 흔들린다.
// =============================================================

import { getSupabase } from "./supabaseClient";

/**
 * 이미 만들어 둔 버킷을 쓴다 (public, 5MB, png/jpeg/webp/gif).
 * 코드가 버킷을 만들지 않는다 — 인프라 설정은 배포 환경의 몫이다.
 */
const BUCKET = "page-images";

/**
 * 캐시 수명 1년. 경로에 uuid 가 들어가 같은 URL 의 내용이 바뀔 일이 없으므로
 * (덮어쓰기를 막는다 — 아래 upsert:false) 최대치로 둔다. base64 인라인을
 * 걷어내는 이유 중 하나가 브라우저 캐싱이었고, 그 값은 여기서 나온다.
 */
const CACHE_CONTROL_SECONDS = "31536000";

/**
 * 저장할 바이트와 그 형식. 스토리지에 무엇을 넣을지를 표현하는 중립 타입이다.
 *
 * 브라우저의 File 이나 Node 의 Buffer 를 그대로 받지 않는다 — 받으면 호출부의
 * 런타임(브라우저/Node)이 이 인터페이스에 묻어 들어온다. 바이트 배열과
 * content type 두 개면 어떤 스토리지 SDK 에도 그대로 넘어간다.
 */
export type StorageObject = {
  readonly data: Uint8Array;
  readonly contentType: string;
};

/**
 * 파일 하나를 올리고 **공개 URL** 을 돌려준다.
 *
 * `upsert: false` 다. 경로는 호출부가 uuid 로 만들므로 충돌은 정상 상황이
 * 아니라 사고(경로 생성 버그·재사용)이고, 그때 조용히 덮어쓰면 이미 다른
 * 게시물이 참조하고 있는 이미지가 바뀐다. 실패시켜서 드러나게 둔다.
 *
 * 실패를 도메인 에러(ValidationError 등)로 감싸지 않는 것은 의도다 —
 * 스토리지 장애는 사용자가 고칠 수 있는 입력 문제가 아니라 500 이다.
 * 무엇이 도메인 에러인지 정하는 일은 service 의 몫이다.
 */
export async function upload(
  file: StorageObject,
  path: string,
): Promise<{ url: string }> {
  const supabase = getSupabase();

  const { error } = await supabase.storage.from(BUCKET).upload(path, file.data, {
    contentType: file.contentType,
    cacheControl: CACHE_CONTROL_SECONDS,
    upsert: false,
  });

  // SDK 의 error 객체를 그대로 던지지 않는다. 밖으로 나가는 것은 문자열뿐이다.
  if (error) throw new Error(`파일 업로드 실패 (${path}): ${error.message}`);

  // getPublicUrl 은 네트워크를 타지 않는 문자열 조합이라 실패하지 않는다.
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: data.publicUrl };
}

/**
 * 파일 하나를 지운다.
 *
 * **지금 부르는 곳이 없다.** 게시물에서 이미지를 빼도 스토리지 파일은 그대로
 * 두기로 했고(고아 파일 정리는 별도 과제), 그럼에도 이 함수를 두는 이유는
 * "올리기만 하고 지우지는 못하는 스토리지"라는 반쪽 인터페이스를 남기지
 * 않기 위해서다. 정리 작업이 생길 때 이 파일을 다시 열 필요가 없다.
 */
async function removeObject(path: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) throw new Error(`파일 삭제 실패 (${path}): ${error.message}`);
}

// 밖에서는 `storageRepository.delete(path)` 로 부른다. 함수 선언 이름으로는
// 예약어를 쓸 수 없어서 export 이름만 바꿔 단다 — 인터페이스는 upload/delete 다.
export { removeObject as delete };
