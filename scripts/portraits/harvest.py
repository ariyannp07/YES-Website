#!/usr/bin/env python3
"""Harvest portraits for the 116 Yale builders, provenance-gated.

Usage: run_harvest.py [--limit N] [--only NAME] [--out DIR]
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import threading
import time
import unicodedata
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lib_portrait as L  # noqa: E402

ROOT = Path("/Users/ariyanp/Library/CloudStorage/GoogleDrive-ariyanp07@gmail.com/My Drive/Yale/YES")
CSV = ROOT / "Website/content/catalog/source/yale_builders_catalog_116.csv"
MANIFEST = ROOT / "yale_builders_portrait_pack_116/portrait_manifest_116.csv"

# Sub-paths worth trying on a company site — where team headshots actually live.
MIN_FACE_AREA = 0.02        # face must be >=2% of the frame
DOMINANT_MIN_AREA = 0.05    # ...and >=5% before a second face is tolerated
DOMINANT_RATIO = 2.5        # ...and 2.5x the next largest face

TEAM_PATHS = ["", "/team", "/about", "/about-us", "/our-team", "/people",
              "/founders", "/company", "/who-we-are", "/leadership"]

lock = threading.Lock()


def target_name(rec_id: str, full_name: str, manifest: dict) -> str:
    if rec_id in manifest:
        return manifest[rec_id]
    safe = re.sub(r"[^A-Za-z0-9]+", "_",
                  unicodedata.normalize("NFKD", full_name)
                  .encode("ascii", "ignore").decode()).strip("_")
    return f"{rec_id}_{safe}.jpg"


def pages_for(row: dict) -> list[tuple[str, str, bool]]:
    """Ordered (url, tier, is_personal_domain). Most trustworthy first."""
    out: list[tuple[str, str, bool]] = []
    seen: set[str] = set()

    def add(u: str, tier: str, personal: bool):
        u = (u or "").strip()
        if not u or u in L.GENERIC_PAGES or "linkedin.com" in u:
            return
        if not u.startswith("http"):
            u = "https://" + u
        if u.rstrip("/") in seen:
            return
        seen.add(u.rstrip("/"))
        out.append((u, tier, personal))

    personal = (row.get("Personal Website") or "").strip()
    if personal:
        base = personal.rstrip("/")
        add(base, "personal", True)
        for p in ("/about", "/bio"):
            add(base + p, "personal", True)

    company = (row.get("Company Website") or "").strip()
    if company:
        base = company.rstrip("/")
        for p in TEAM_PATHS:
            add(base + p, "company", False)

    add(row.get("Primary Source URL", ""), "source1", False)
    add(row.get("Secondary Source URL", ""), "source2", False)
    return out


def corroboration_tokens(row: dict) -> list[str]:
    """Distinguishing words that must appear alongside the name."""
    toks = [row.get("Primary Venture", ""), row.get("Current Organization", ""),
            "Yale"]
    return [t.strip() for t in toks if t and t.strip()]


def resolve_person(row: dict, manifest: dict, outdir: Path) -> dict:
    name = row["Full Name"]
    rec = row["Record ID"]
    fname = target_name(rec, name, manifest)
    session = requests.Session()

    tried: list[str] = []
    rejected: list[dict] = []
    best = None

    pages = pages_for(row)

    # Phase 2 — page discovery. Only reached if the CSV's own links yield
    # nothing. These URLs are UNTRUSTED (a name is not unique), so a page found
    # this way must corroborate: name plus venture/organisation/Yale. Note this
    # searches for PAGES, never for images; image search was tested and
    # returned Amazon listings and anime art for real queries.
    def search_pages() -> list[tuple[str, str, bool]]:
        venture = (row.get("Primary Venture") or row.get("Current Organization") or "").strip()
        queries = [f'"{name}" Yale {venture}'.strip(), f'"{name}" Yale founder']
        found: list[tuple[str, str, bool]] = []
        seen = {u.rstrip("/") for u, _, _ in pages}
        for q in queries:
            for u in L.ddg_search(q, session, limit=6):
                if u.rstrip("/") in seen:
                    continue
                seen.add(u.rstrip("/"))
                found.append((u, "search", False))
            if len(found) >= 8:
                break
            time.sleep(0.4)
        return found[:8]

    tokens = corroboration_tokens(row)

    def attempt(url: str, tier: str, is_personal: bool) -> None:
        nonlocal best
        final, html, status = L.fetch(url, session)
        tried.append(f"{url} [{status}]")
        if not html:
            return
        cands = L.candidates_from_page(final, html, name, is_personal)

        # EVIDENCE MUST MATCH THE PAGE TYPE.
        # On a team/personal page, proximity is a real signal: a card is a photo
        # beside a name. On a news article it is not — the hero image sits near
        # every name in the piece. A live test proved this: a gazetteer article
        # about the Nob Hill hacker house yielded a photo of a different person
        # entirely for "Jimmy Carter", accepted purely on proximity. Articles
        # must therefore name the person in the alt text or the filename.
        if tier == "search":
            # Untrusted origin: strongest evidence only, and the page must
            # corroborate that this is OUR person and not a namesake.
            if not L.corroborates(" ".join(html.split()), name, tokens):
                rejected.append({"url": final, "why": "search-page-uncorroborated",
                                 "evidence": "page"})
                return
            allowed = {"named-alt", "named-file", "og-personal",
                       "profile-sole-image"}
        elif tier in ("source1", "source2"):
            allowed = {"named-alt", "named-file", "profile-sole-image"}
        else:
            allowed = {"named-alt", "named-file", "named-context", "og-personal",
                       "profile-sole-image"}
        for c in cands:
            if c.evidence not in allowed:
                rejected.append({"url": c.url, "why": f"weak-evidence-for-{tier}",
                                 "evidence": c.evidence})
        cands = [c for c in cands if c.evidence in allowed]

        order = {"named-alt": 0, "named-file": 1, "profile-sole-image": 2,
                 "named-context": 3, "og-personal": 4}
        cands.sort(key=lambda c: order.get(c.evidence, 9))
        for c in cands[:12]:
            im = L.download_image(c.url, session)
            if im is None:
                rejected.append({"url": c.url, "why": "not-an-image-or-too-small",
                                 "evidence": c.evidence})
                continue
            faces = L.detect_faces(im)
            if not faces:
                rejected.append({"url": c.url, "why": "no-face", "evidence": c.evidence})
                continue
            # IS THIS ACTUALLY A PORTRAIT OF ONE PERSON?
            # Provenance says the page is about them; it does not say the image
            # shows only them. Yale News captioned a four-way composite of award
            # winners with a single name, and a two-founder group photo likewise
            # — in both the alt text passed while the face was ambiguous.
            faces.sort(key=lambda f: f[2] * f[3], reverse=True)
            face = faces[0]
            px = float(im.size[0] * im.size[1])
            area = (face[2] * face[3]) / px
            if area < MIN_FACE_AREA:
                # A face under ~2% of the frame is a scene, not a portrait.
                rejected.append({"url": c.url, "why": f"face-too-small({area:.4f})",
                                 "evidence": c.evidence})
                continue
            if len(faces) > 1:
                second = (faces[1][2] * faces[1][3]) / px
                # Allow an incidental background face, never a group or composite:
                # the subject must clearly dominate the frame.
                if area < DOMINANT_MIN_AREA or area < second * DOMINANT_RATIO:
                    rejected.append({
                        "url": c.url,
                        "why": f"ambiguous-subject({len(faces)}faces,"
                               f"{area:.3f}vs{second:.3f})",
                        "evidence": c.evidence})
                    continue
            best = {
                "record_id": rec, "full_name": name, "target_filename": fname,
                "image_url": c.url, "source_page": final, "page_tier": tier,
                "evidence": c.evidence, "evidence_text": c.context,
                "faces_detected": len(faces), "face_area_frac": round(area, 4),
                "orig_size": f"{im.size[0]}x{im.size[1]}",
            }
            L.crop_to_face(im, face).save(outdir / fname, "JPEG", quality=92,
                                          optimize=True)
            break
        time.sleep(0.25)

    # Phase 1: the CSV's own links. Phase 2 (search) only if they came up empty,
    # so a person resolved from their own company page costs no search traffic.
    for url, tier, is_personal in pages:
        if best:
            break
        attempt(url, tier, is_personal)

    if not best:
        for url, tier, is_personal in search_pages():
            if best:
                break
            attempt(url, tier, is_personal)

    result = {"record_id": rec, "full_name": name, "target_filename": fname,
              "resolved": bool(best), "detail": best,
              "pages_tried": tried, "rejects": rejected[:8]}
    with lock:
        mark = "OK " if best else "-- "
        extra = f"{best['evidence']} via {best['page_tier']}" if best else f"{len(tried)} pages, no match"
        print(f"{mark}{name:32s} {extra}", flush=True)
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--out", default=str(Path(__file__).parent / "portraits_out"))
    args = ap.parse_args()

    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)

    manifest = {}
    if MANIFEST.exists():
        for m in csv.DictReader(MANIFEST.open(encoding="utf-8-sig")):
            manifest[m["record_id"]] = m["target_filename"]

    rows = list(csv.DictReader(CSV.open(encoding="utf-8-sig")))
    if args.only:
        rows = [r for r in rows if args.only.lower() in r["Full Name"].lower()]
    if args.limit:
        rows = rows[: args.limit]

    print(f"harvesting {len(rows)} people -> {outdir}", flush=True)
    results = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(resolve_person, r, manifest, outdir): r for r in rows}
        for f in as_completed(futs):
            try:
                results.append(f.result())
            except Exception as e:
                r = futs[f]
                print(f"!! {r['Full Name']}: {e}", flush=True)
                results.append({"record_id": r["Record ID"],
                                "full_name": r["Full Name"],
                                "target_filename": target_name(
                                    r["Record ID"], r["Full Name"], manifest),
                                "resolved": False, "detail": None,
                                "error": str(e), "pages_tried": [],
                                "rejects": []})

    results.sort(key=lambda x: x["record_id"])
    (outdir.parent / "harvest_report.json").write_text(json.dumps(results, indent=2))

    ok = [r for r in results if r["resolved"]]
    with (outdir.parent / "resolved_portrait_sources.csv").open("w", newline="",
                                                               encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["record_id", "full_name", "target_filename",
                                          "image_url", "source_page", "page_tier",
                                          "evidence", "faces_detected",
                                          "face_area_frac", "orig_size"])
        w.writeheader()
        for r in ok:
            d = dict(r["detail"])
            d.pop("evidence_text", None)
            w.writerow(d)

    with (outdir.parent / "unresolved.csv").open("w", newline="",
                                                 encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["record_id", "full_name", "target_filename", "pages_tried"])
        for r in results:
            if not r["resolved"]:
                w.writerow([r["record_id"], r["full_name"], r["target_filename"],
                            " | ".join(r["pages_tried"])])

    print(f"\nRESOLVED {len(ok)}/{len(results)}   UNRESOLVED {len(results)-len(ok)}")


if __name__ == "__main__":
    main()
