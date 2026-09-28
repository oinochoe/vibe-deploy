import type { ApiRequest, ApiResponse } from "./_lib/http";

const MAX_LENGTH = 5000;

/** POST { text } → 글자 수 / 단어 수 / 줄 수 / 뒤집은 문자열 */
export default function textStats(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST").status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const text = (req.body as { text?: unknown } | undefined)?.text;
  if (typeof text !== "string" || text.length === 0) {
    res.status(400).json({ error: "body 에 text(문자열)가 필요합니다." });
    return;
  }
  if (text.length > MAX_LENGTH) {
    res.status(413).json({ error: `text 는 ${MAX_LENGTH}자 이하여야 합니다.` });
    return;
  }

  const chars = [...text];
  res.status(200).json({
    characters: chars.length,
    words: text.trim().split(/\s+/).filter(Boolean).length,
    lines: text.split(/\r?\n/).length,
    reversed: chars.reverse().join(""),
  });
}
