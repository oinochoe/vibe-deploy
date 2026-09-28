import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

interface HelloResponse {
  message: string;
  timestamp: string;
}

export default function App() {
  const [data, setData] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HelloResponse>("hello?name=vibe")
      .then(setData)
      .catch((err: unknown) => setError(String(err)));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>vibe-deploy</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!error && !data && <p>Loading…</p>}
      {data && (
        <p>
          {data.message} <small>({data.timestamp})</small>
        </p>
      )}
    </main>
  );
}
