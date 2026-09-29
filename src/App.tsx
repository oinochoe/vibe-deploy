import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "./lib/api";

// 응답 타입은 api/hello.ts, api/text-stats.ts 의 res.json() 형태와 맞춰야 한다 (공유 타입 없음)
interface HelloResponse {
  message: string;
  timestamp: string;
}

interface TextStatsResponse {
  characters: number;
  words: number;
  lines: number;
  reversed: string;
}

export default function App() {
  const [hello, setHello] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [stats, setStats] = useState<TextStatsResponse | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 첫 렌더 시 GET /hello 호출 → Lambda 연결 여부를 화면에서 바로 확인할 수 있다
  useEffect(() => {
    apiFetch<HelloResponse>("hello?name=vibe")
      .then(setHello)
      .catch((err: unknown) => setError(String(err)));
  }, []);

  // POST /text-stats. content-type 을 JSON 으로 보내야 서버에서 req.body 가 객체로 파싱된다
  async function analyze(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatsError(null);
    try {
      setStats(
        await apiFetch<TextStatsResponse>("text-stats", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        }),
      );
    } catch (err) {
      setStats(null);
      setStatsError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <h1>vibe-deploy</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!error && !hello && <p>Loading…</p>}
      {hello && (
        <p>
          {hello.message} <small>({hello.timestamp})</small>
        </p>
      )}

      <h2>텍스트 분석</h2>
      <form onSubmit={analyze}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{ width: "100%", boxSizing: "border-box" }}
          placeholder="분석할 텍스트를 입력하세요"
        />
        <button type="submit" disabled={loading || text.length === 0}>
          {loading ? "분석 중…" : "분석"}
        </button>
      </form>
      {statsError && <p style={{ color: "crimson" }}>{statsError}</p>}
      {stats && (
        <ul>
          <li>글자 수: {stats.characters}</li>
          <li>단어 수: {stats.words}</li>
          <li>줄 수: {stats.lines}</li>
          <li>뒤집기: {stats.reversed}</li>
        </ul>
      )}
    </main>
  );
}
