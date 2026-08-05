"""s3conn.py - the single home for S3 connection settings and clients.

Everything that talks to the edova cloud shelf reads the bucket/prefix/
region/staging-prefix from here, which reads edova-third-brain/config.yaml's
`s3:` block. One place to change, one place to look. Consumers:

  - ncert_rag/clerk/api.py   (teacher uploads: presign + complete)
  - tools/s3_push.py         (librarian shelving + manifest publish)

AWS credentials are NOT here and never belong here - boto3's default chain
finds them (AWS_PROFILE / ~/.aws/credentials / AWS_ACCESS_KEY_ID+SECRET env).
See AWS-SETUP.md at the repo root for who gets keys and how.
"""

import sys

from okf_lib import load_config

# Fallbacks equal the live values in config.yaml's s3: block, so a missing
# key degrades to today's behavior instead of crashing.
_DEFAULTS = {
    "bucket": "innuxai-edova-coteacher",
    "prefix": "Class-10/Semester-01",
    "region": "ap-south-1",
    "staging_prefix": "staging",
}


def s3_settings() -> dict:
    """{bucket, prefix, region, staging_prefix} from config.yaml's s3: block."""
    try:
        block = (load_config() or {}).get("s3", {}) or {}
    except Exception:
        block = {}
    return {k: block.get(k) or v for k, v in _DEFAULTS.items()}


def get_client():
    """A boto3 S3 client for the configured region. Raises whatever boto3
    raises when credentials are absent/invalid - callers already surface
    that as a clear upload error."""
    import boto3
    return boto3.client("s3", region_name=s3_settings()["region"])


def warn_if_credentials_missing() -> None:
    """Startup check: verify the AWS key actually works (one cheap STS call)
    and print a loud warning if not. Never raises - the rest of the app
    (wiki, quiz, search) works fine without S3; only uploads need the key."""
    try:
        import boto3
        ident = boto3.client("sts", region_name=s3_settings()["region"]) \
            .get_caller_identity()
        print(f"[s3] AWS credentials OK - uploads will sign as "
              f"{ident.get('Arn', '?')}", file=sys.stderr)
    except Exception as exc:
        print(f"\n[s3] WARNING: AWS credentials missing or invalid ({exc}).\n"
              f"[s3] Document/video uploads WILL FAIL until a valid key is "
              f"configured.\n[s3] Fix: run 'aws configure' with a key from the "
              f"edova-developers group - see AWS-SETUP.md at the repo root.\n",
              file=sys.stderr)
