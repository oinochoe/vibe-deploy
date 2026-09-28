/**
 * 백엔드 호출은 반드시 이 모듈을 거친다.
 * - 프로덕션: VITE_API_URL = Lambda Function URL (CI 가 주입)
 * - 로컬: 미설정 시 "/api" → vite proxy → api dev 서버
 */
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
