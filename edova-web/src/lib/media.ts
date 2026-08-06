const DEFAULT_S3_BASE = "https://innuxai-edova-coteacher.s3.amazonaws.com/"

export function getAssetUrl(key: string): string {
  if (!key) return ""
  if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith("blob:")) {
    return key
  }
  const baseUrl = import.meta.env.VITE_S3_BUCKET_URL || DEFAULT_S3_BASE
  const cleanBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  const cleanKey = key.startsWith("/") ? key.slice(1) : key
  return `${cleanBase}${cleanKey.split("/").map(encodeURIComponent).join("/")}`
}

export function getResourceUrl(resource: { s3_key: string | null; external_url?: string | null }): string | null {
  if (resource.external_url) return resource.external_url
  if (resource.s3_key) return getAssetUrl(resource.s3_key)
  return null
}
