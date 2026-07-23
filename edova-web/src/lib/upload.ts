// Real upload flow for teacher learning resources (Track 1):
// presign (this API signs, browser never sees AWS keys) -> PUT direct to S3
// staging -> complete (librarian shelves the file and returns its S3 key).
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"

export interface CompleteResult {
  doc_id: string
  s3_key: string
  preview_s3_key: string
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.detail) detail = data.detail
    } catch { /* non-JSON error body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export async function uploadLearningResource(args: {
  file: File
  title: string
  subject: string
  chapter: string
  docType: string
}): Promise<CompleteResult> {
  const { file } = args

  const presign = await apiPost<{
    upload_url: string
    staging_key: string
    expires_in: number
  }>("/uploads/presign", {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  })

  const put = await fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  })
  if (!put.ok) throw new Error(`S3 upload failed: ${put.status} ${put.statusText}`)

  return apiPost<CompleteResult>("/uploads/complete", {
    staging_key: presign.staging_key,
    title: args.title,
    subject: args.subject,
    chapter: args.chapter,
    doc_type: args.docType,
  })
}
