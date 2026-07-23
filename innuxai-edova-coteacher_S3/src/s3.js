import { XMLParser } from 'fast-xml-parser';

export const BUCKET_URL = 'https://innuxai-edova-coteacher.s3.ap-south-1.amazonaws.com/';

// Build a fetchable object URL from a key. Each path segment is encoded so keys
// containing spaces, +, #, % etc. resolve correctly (encodeURI alone leaves
// +, # and % untouched, which corrupts the request).
export const objectUrl = (key) =>
  BUCKET_URL + key.split('/').map(encodeURIComponent).join('/');

// List objects under `prefix`, following continuation tokens so results are not
// silently capped at S3's 1,000-key page size. Returns raw parsed entries:
// { prefixes: string[], contents: [{ Key, Size, LastModified, ... }] }.
export async function listObjects(prefix, { delimiter = false } = {}) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const prefixes = [];
  const contents = [];
  let continuationToken = null;

  do {
    let url = `${BUCKET_URL}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    if (delimiter) url += '&delimiter=/';
    if (continuationToken) url += `&continuation-token=${encodeURIComponent(continuationToken)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from S3: ${response.status} ${response.statusText}`);
    }

    const jsonObj = parser.parse(await response.text());
    const result = jsonObj.ListBucketResult;
    if (!result) throw new Error('Invalid XML response from S3');

    if (result.CommonPrefixes) {
      const page = Array.isArray(result.CommonPrefixes) ? result.CommonPrefixes : [result.CommonPrefixes];
      prefixes.push(...page.map(p => p.Prefix));
    }
    if (result.Contents) {
      const page = Array.isArray(result.Contents) ? result.Contents : [result.Contents];
      contents.push(...page);
    }

    const truncated = result.IsTruncated === true || result.IsTruncated === 'true';
    continuationToken = truncated ? result.NextContinuationToken : null;
  } while (continuationToken);

  return { prefixes, contents };
}
