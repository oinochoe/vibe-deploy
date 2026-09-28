import type { ApiRequest, ApiResponse } from "./_lib/http";

export default function hello(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET").status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const name = req.query.name ?? "world";
  res.status(200).json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
  });
}
