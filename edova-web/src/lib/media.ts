// Single seam for asset URLs. Every learning-resource asset (video, PDF,
// converted PPT/DOCX/XLSX) is stored in S3 by key; this is the one place
// that turns a key into a fetchable URL. When a CDN goes in front of the
// bucket, only VITE_S3_BUCKET_URL changes — no component needs to change.
const ASSET_BASE_URL = import.meta.env.VITE_S3_BUCKET_URL ?? "https://innuxai-edova-coteacher.s3.amazonaws.com/"

export function getAssetUrl(key: string): string {
  if (!key) return ""
  if (key.startsWith("http://") || key.startsWith("https://")) return key
  const base = ASSET_BASE_URL.endsWith("/") ? ASSET_BASE_URL : `${ASSET_BASE_URL}/`
  const cleanKey = key.replace(/^\/+/, "")
  return `${base}${cleanKey.split("/").map(encodeURIComponent).join("/")}`
}

// A resource is either a catalogued S3 file (s3_key) or an external link
// (external_url, for YouTube/podcasts/references) — this is the one place
// that picks which and resolves it to a single openable URL.
export function getResourceUrl(resource: { s3_key: string | null; external_url?: string | null }): string | null {
  if (resource.external_url) return resource.external_url
  if (resource.s3_key) return getAssetUrl(resource.s3_key)
  return null
}
