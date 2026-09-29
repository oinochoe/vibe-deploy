/**
 * 백엔드 호출은 반드시 이 모듈을 거친다.
 * - 프로덕션: VITE_API_URL = Lambda Function URL (CI 가 주입)
 * - 로컬: 미설정 시 "/api" → vite proxy → api dev 서버
 *
 * VITE_API_URL 은 빌드 시점에 번들에 문자열로 박힌다 (런타임에 바꿀 수 없음).
 * Function URL 은 끝에 "/" 가 붙어 오므로 제거해서 `${API_URL}/hello` 가 `//hello` 가 되지 않게 한다.
 */
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

/** path 는 라우트 이름 + 쿼리 (예: "hello?name=vibe"). 2xx 가 아니면 상태코드와 본문을 담아 throw 한다. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
