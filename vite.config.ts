import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 는 https://<owner>.github.io/<repo>/ 로 서빙되므로 CI 에서 VITE_BASE=/<repo>/ 를 주입한다.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: {
    // 로컬 개발: VITE_API_URL 미설정 시 /api → api dev 서버(npm run dev:api) 로 프록시
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
