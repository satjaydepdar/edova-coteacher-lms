// Single seam for asset URLs. Every learning-resource asset (video, PDF,
// converted PPT/DOCX/XLSX) is stored in S3 by key; this is the one place
// that turns a key into a fetchable URL. When a CDN goes in front of the
// bucket, only VITE_S3_BUCKET_URL changes — no component needs to change.
const ASSET_BASE_URL = import.meta.env.VITE_S3_BUCKET_URL ?? ""

export function getAssetUrl(key: string): string {
  return `${ASSET_BASE_URL}${key}`
}
