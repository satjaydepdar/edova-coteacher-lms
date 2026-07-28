#!/usr/bin/env python3
"""
s3_push.py - the librarian step: shelve OKF bundle attachments in S3 and
publish the manifest edova-web reads.

ingest.py catalogs files locally; this tool puts them on the cloud shelf and
writes the shelf location back into the catalog:

  - derives each node's S3 key:
        Class-10/Semester-01/<Subject>/Chapter-XX/<filename>
    (science chapters file under their domain: Biology/Physics/Chemistry)
  - with --upload, PUTs okf-bundle/attachments/<subject>/<chapter_id>/<file>
    to the bucket, then writes s3_key + s3_uploaded_at into the node JSON
  - emits okf-bundle/manifest/manifest.json for edova-web (uploaded too,
    with --upload)

Default is a dry-run: prints the plan, touches nothing. --upload needs AWS
credentials (aws configure, or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).

Usage:
    python tools/s3_push.py              # dry-run plan
    python tools/s3_push.py --upload     # push files + manifest, backfill nodes
"""

import argparse
import json
import mimetypes
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest import load_config, read_json, write_json  # noqa: E402


def subject_folder(node: dict) -> str:
    """math-ch5 -> Math; biology-ch1 -> Biology; physics-ch3 -> Physics."""
    domain = node["chapter_id"].rsplit("-", 1)[0]
    return domain.capitalize()


def chapter_folder(node: dict) -> str:
    m = re.search(r"ch(\d+)$", node["chapter_id"])
    return f"Chapter-{int(m.group(1)):02d}" if m else "Chapter-00"


def derive_s3_key(node: dict, prefix: str, filename: str) -> str:
    return f"{prefix}/{subject_folder(node)}/{chapter_folder(node)}/{filename}"


def web_key(s3_key: str) -> str:
    """edova-web getAssetUrl convention: spaces as '+' (S3 decodes '+' to space)."""
    return "/".join(seg.replace(" ", "+") for seg in s3_key.split("/"))


def resource_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext in ("mp4", "webm", "mov"):
        return "Video"
    if ext == "pdf":
        return "PDF"
    if ext in ("ppt", "pptx"):
        return "PPT"
    return "Worksheet"


def collect_plan(config: dict) -> list:
    """One plan entry per node: local attachment -> derived S3 key."""
    bundle = ROOT / config["paths"]["okf_bundle"]
    prefix = config["s3"]["prefix"]
    plan = []
    for node_path in sorted((bundle / "nodes").glob("*.json")):
        node = json.loads(node_path.read_text(encoding="utf-8"))
        attach_dir = bundle / "attachments" / node["subject"] / node["chapter_id"]
        local = attach_dir / Path(node["source_path"]).name
        if not local.is_file():
            print(f"  ! attachment missing for {node['doc_id']}: {local.name} - skipped",
                  file=sys.stderr)
            continue
        plan.append({
            "node_path": node_path,
            "node": node,
            "local": local,
            "s3_key": derive_s3_key(node, prefix, local.name),
        })
    return plan


def build_manifest(plan: list, config: dict) -> dict:
    resources = []
    for e in plan:
        node = e["node"]
        if "s3_key" not in node:
            continue  # only catalog what is actually shelved
        resources.append({
            "id": node["doc_id"],
            "title": f"{node['chapter_name']} — {node['title']}",
            "type": resource_type(node["s3_key"]),
            "subject": node["subject"],
            "chapter_id": node["chapter_id"],
            "chapter_name": node["chapter_name"],
            "topic_id": node.get("topic_id"),
            "doc_type": node["doc_type"],
            "s3_key": node["s3_key"],
            "previewS3Key": web_key(node["s3_key"]),
            "status": "ready",
            "trust": node.get("trust", {"status": "unverified"}),
        })
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "bucket": config["s3"]["bucket"],
        "prefix": config["s3"]["prefix"],
        "count": len(resources),
        "resources": resources,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--upload", action="store_true",
                    help="actually PUT files + manifest (default: dry-run)")
    ap.add_argument("--force", action="store_true",
                    help="re-upload even when node.s3_key already matches")
    args = ap.parse_args()

    config = load_config()
    bucket, prefix = config["s3"]["bucket"], config["s3"]["prefix"]
    plan = collect_plan(config)

    pending = [e for e in plan if args.force or e["node"].get("s3_key") != e["s3_key"]]
    current = len(plan) - len(pending)

    print(f"\n{len(plan)} catalogued docs | {current} already shelved | {len(pending)} to upload\n")
    for e in plan:
        mark = "CURRENT" if e not in pending else ("WOULD UPLOAD" if not args.upload else "UPLOAD")
        print(f"  [{mark}] {e['local'].name}\n           -> s3://{bucket}/{e['s3_key']}")

    if not args.upload:
        print(f"\ndry-run - nothing written. Re-run with --upload to shelve {len(pending)} file(s).")
        return 0

    if not pending and not args.force:
        print("\nnothing to upload.")
    else:
        try:
            import boto3
            from botocore.exceptions import NoCredentialsError, ClientError
            s3 = boto3.client("s3")
        except ImportError:
            print("boto3 not installed - pip install boto3", file=sys.stderr)
            return 2

        now = datetime.now(timezone.utc).isoformat()
        try:
            for e in pending:
                ctype = mimetypes.guess_type(e["local"].name)[0] or "application/octet-stream"
                s3.upload_file(str(e["local"]), bucket, e["s3_key"],
                               ExtraArgs={"ContentType": ctype})
                node = e["node"]
                node["s3_key"] = e["s3_key"]
                node["s3_uploaded_at"] = now
                write_json(e["node_path"], node)
                e["node"] = node
                print(f"  [OK] shelved {e['s3_key']}")
        except NoCredentialsError:
            print("\nAWS credentials not found. Run 'aws configure' or set "
                  "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, then re-run --upload.\n"
                  "No nodes were modified for files that failed to upload.", file=sys.stderr)
            return 2
        except ClientError as exc:
            print(f"\nS3 upload failed: {exc}", file=sys.stderr)
            return 2

    # Manifest: catalog everything that has an s3_key (shelved), write + upload it
    manifest = build_manifest(plan, config)
    manifest_path = ROOT / config["paths"]["okf_bundle"] / "manifest" / "manifest.json"
    write_json(manifest_path, manifest)
    print(f"\nmanifest: {manifest['count']} shelved resources -> {manifest_path}")
    try:
        import boto3
        boto3.client("s3").put_object(
            Bucket=bucket, Key=f"{prefix}/manifest.json",
            Body=json.dumps(manifest, indent=2).encode("utf-8"),
            ContentType="application/json")
        print(f"manifest uploaded -> s3://{bucket}/{prefix}/manifest.json")
    except Exception as exc:
        print(f"manifest written locally; S3 upload skipped ({exc})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
