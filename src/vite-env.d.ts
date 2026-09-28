/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lambda Function URL. CI 가 sam deploy 결과로 .env.production 에 주입한다. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
