from __future__ import annotations

import csv
import hashlib
import html
import json
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "reference"
OUTPUT = ROOT / "analysis" / "generated"
OUTPUT.mkdir(parents=True, exist_ok=True)

SENSITIVE_QUERY_KEYS = {
    "access_token", "token", "id_token", "refresh_token", "code",
    "password", "passwd", "secret", "api_key", "apikey", "key",
    "signature", "sig", "session"
}
SENSITIVE_HEADERS = {
    "authorization", "cookie", "set-cookie", "proxy-authorization",
    "x-api-key"
}

URL_RE = re.compile(r"https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+")
PATH_RE = re.compile(
    r'(?:"|\')'
    r'((?:/api/|/identity/|/workflow/|/formbuilder/|/report/|/visualization/|'
    r'/task-list|/form-builder|/assets/)[A-Za-z0-9_./?&={}\-:]*)'
    r'(?:"|\')'
)


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def redact_url(raw: str) -> str:
    try:
        parts = urllib.parse.urlsplit(raw)
        items = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
        redacted = [
            (k, "[REDACTED]" if k.lower() in SENSITIVE_QUERY_KEYS else v)
            for k, v in items
        ]
        return urllib.parse.urlunsplit(
            (parts.scheme, parts.netloc, parts.path,
             urllib.parse.urlencode(redacted, doseq=True), parts.fragment)
        )
    except Exception:
        return raw


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def analyze_har(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    rows: list[dict[str, Any]] = []
    hosts = Counter()
    mime_types = Counter()
    methods = Counter()
    statuses = Counter()

    for entry in data.get("log", {}).get("entries", []):
        request = entry.get("request", {})
        response = entry.get("response", {})
        content = response.get("content", {})
        url = redact_url(str(request.get("url", "")))
        parsed = urllib.parse.urlsplit(url)
        hosts[parsed.netloc] += 1
        mime_types[str(content.get("mimeType", ""))] += 1
        methods[str(request.get("method", ""))] += 1
        statuses[str(response.get("status", ""))] += 1

        header_names = []
        for header in request.get("headers", []):
            name = str(header.get("name", ""))
            if name.lower() not in SENSITIVE_HEADERS:
                header_names.append(name)

        rows.append({
            "method": request.get("method", ""),
            "url": url,
            "status": response.get("status", ""),
            "mime_type": content.get("mimeType", ""),
            "request_header_names": ", ".join(sorted(set(header_names), key=str.lower)),
        })

    with (OUTPUT / "har-requests.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["method", "url", "status", "mime_type", "request_header_names"]
        )
        writer.writeheader()
        writer.writerows(rows)

    return {
        "entry_count": len(rows),
        "hosts": dict(hosts),
        "mime_types": dict(mime_types),
        "methods": dict(methods),
        "statuses": dict(statuses),
        "unique_urls": sorted({r["url"] for r in rows}),
    }


def analyze_xml(path: Path) -> dict[str, Any]:
    root = ET.parse(path).getroot()
    surfaces: list[dict[str, str]] = []
    findings: list[dict[str, str]] = []

    for site_file in root.findall(".//SiteFile"):
        surfaces.append({
            "id": site_file.attrib.get("id", ""),
            "name": site_file.findtext("Name") or "",
            "url": site_file.findtext("URL") or "",
            "full_url": site_file.findtext("FullURL") or "",
            "input_names": ", ".join(
                v.attrib.get("Name", "") for v in site_file.findall("./Inputs/Variable")
            ),
        })

    for item in root.findall(".//ReportItem"):
        findings.append({
            "id": item.attrib.get("id", ""),
            "name": item.findtext("Name") or "",
            "severity": item.findtext("Severity") or "",
            "type": item.findtext("Type") or "",
            "affects": item.findtext("Affects") or "",
            "details": clean_text(item.findtext("Details")),
            "recommendation": clean_text(item.findtext("Recommendation")),
        })

    with (OUTPUT / "scanner-surface.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["id", "name", "url", "full_url", "input_names"]
        )
        writer.writeheader()
        writer.writerows(surfaces)

    with (OUTPUT / "scanner-findings.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["id", "name", "severity", "type", "affects", "details", "recommendation"]
        )
        writer.writeheader()
        writer.writerows(findings)

    return {"surfaces": surfaces, "findings": findings}


def analyze_bundles(paths: list[Path]) -> dict[str, Any]:
    urls: set[str] = set()
    paths_found: set[str] = set()
    terms = Counter()
    watched_terms = [
        "localStorage", "sessionStorage", "Authorization", "Bearer", "WebSocket",
        "SignalR", "Formio", "ckeditor", "oauth", "oidc", "keycloak",
        "task-list", "form-builder", "workflow", "permission", "role", "audit"
    ]

    for path in paths:
        text = path.read_text(encoding="utf-8", errors="ignore")
        urls.update(redact_url(match.rstrip(").,;\"'")) for match in URL_RE.findall(text))
        paths_found.update(PATH_RE.findall(text))
        lower = text.lower()
        for term in watched_terms:
            terms[term] += lower.count(term.lower())

    safe_urls = sorted(u for u in urls if len(u) < 500)
    safe_paths = sorted(p for p in paths_found if len(p) < 500)

    (OUTPUT / "bundle-urls.txt").write_text("\n".join(safe_urls) + "\n", encoding="utf-8")
    (OUTPUT / "bundle-route-candidates.txt").write_text(
        "\n".join(safe_paths) + "\n", encoding="utf-8"
    )
    with (OUTPUT / "bundle-term-counts.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["term", "count"])
        writer.writerows(sorted(terms.items(), key=lambda x: (-x[1], x[0].lower())))

    return {
        "url_count": len(safe_urls),
        "route_candidate_count": len(safe_paths),
        "term_counts": dict(terms),
    }


def main() -> int:
    files = {
        "env": REFERENCE / "env.js",
        "main": REFERENCE / "main.bundle.js",
        "scripts": REFERENCE / "scripts.bundle.js",
        "har": REFERENCE / "session.har",
        "xml": REFERENCE / "acunetix.xml",
    }

    missing = [str(path) for path in files.values() if not path.exists()]
    if missing:
        print("Missing reference files:", file=sys.stderr)
        for path in missing:
            print(f"  - {path}", file=sys.stderr)
        return 1

    manifest = {
        name: {
            "path": str(path.relative_to(ROOT)),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
        for name, path in files.items()
    }
    (OUTPUT / "reference-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    har_summary = analyze_har(files["har"])
    xml_summary = analyze_xml(files["xml"])
    bundle_summary = analyze_bundles([files["env"], files["main"], files["scripts"]])

    summary = [
        "# Generated reference summary",
        "",
        "This report was generated offline. It does not prove backend behavior.",
        "",
        "## File manifest",
        "",
    ]
    for name, info in manifest.items():
        summary.append(
            f"- `{name}`: `{info['path']}`, {info['bytes']} bytes, SHA-256 `{info['sha256']}`"
        )

    summary += [
        "",
        "## HAR",
        "",
        f"- Entries: {har_summary['entry_count']}",
        f"- Hosts: `{json.dumps(har_summary['hosts'], ensure_ascii=False)}`",
        f"- Methods: `{json.dumps(har_summary['methods'], ensure_ascii=False)}`",
        f"- Statuses: `{json.dumps(har_summary['statuses'], ensure_ascii=False)}`",
        "",
        "The HAR may be incomplete. Review `har-requests.csv` before making compatibility claims.",
        "",
        "## Scanner",
        "",
        f"- Surface entries: {len(xml_summary['surfaces'])}",
        f"- Findings: {len(xml_summary['findings'])}",
    ]
    for finding in xml_summary["findings"]:
        summary.append(
            f"- **{finding['severity']}** — {finding['name']}: {finding['recommendation']}"
        )

    summary += [
        "",
        "## Bundle string inventory",
        "",
        f"- URL strings: {bundle_summary['url_count']}",
        f"- Route candidates: {bundle_summary['route_candidate_count']}",
        "",
        "String matches are leads, not proof that an endpoint is reachable or authorized.",
        "",
        "## Generated outputs",
        "",
        "- `reference-manifest.json`",
        "- `har-requests.csv`",
        "- `scanner-surface.csv`",
        "- `scanner-findings.csv`",
        "- `bundle-urls.txt`",
        "- `bundle-route-candidates.txt`",
        "- `bundle-term-counts.csv`",
    ]

    (OUTPUT / "reference-summary.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(f"Analysis complete: {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
