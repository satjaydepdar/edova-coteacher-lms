/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL assets are served from — direct S3 bucket URL today, a
   *  CloudFront domain later. Must end with a trailing slash. */
  readonly VITE_S3_BUCKET_URL: string
  /** Base URL of the ncert_rag FastAPI service (upload presign/complete). */
  readonly VITE_API_URL: string
  /** Base URL of the edova-backend service (auth, classrooms, assignments, calendar). */
  readonly VITE_BACKEND_API_URL: string
  /** Base URL of the CAMEL lesson-planning AI service (edova-camel). */
  readonly VITE_AI_API_URL: string
  /** Base URL of the Ask-the-Textbook RAG service (ncert_rag/edova-coteacher-rag). */
  readonly VITE_RAG_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
