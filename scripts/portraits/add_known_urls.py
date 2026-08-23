#!/usr/bin/env python3
"""Fold in portraits whose URL is already tied to a name, then re-verify.

Three feeds converge here:
  * yesyale.org/images/team/<slug>.jpg  — YES's own site, first-party
  * the yes-catalog scaffold's `photo` fields, for people on our roster
  * anything else supplied as an explicit name->URL pair

These skip PAGE discovery because the URL is already attributed, but they do NOT
skip the portrait check: the same one-dominant-face gate applies, so a group
shot or a logo from a trusted host still gets rejected.
"""
import csv
import json
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
import lib_portrait as L

HERE = Path(__file__).parent
OUT = HERE / "portraits_out"
SRC_CSV = HERE / "resolved_portrait_sources.csv"
MIN_FACE_AREA, DOMINANT_MIN_AREA, DOMINANT_RATIO = 0.02, 0.05, 2.5

builders = json.loads(Path(
    "/Users/ariyanp/Library/CloudStorage/GoogleDrive-ariyanp07@gmail.com/"
    "My Drive/Yale/YES/Website/content/catalog/builders.json"
).read_text())["people"]
by_name = {L.norm(p["name"]): p for p in builders}

# Optional, and absent by default: the portrait pack it came from has been
# deleted as redundant. Missing simply means targets are named <slug>.jpg.
manifest = {}
mpath = Path("/Users/ariyanp/Library/CloudStorage/GoogleDrive-ariyanp07@gmail.com/"
             "My Drive/Yale/YES/yale_builders_portrait_pack_116/portrait_manifest_116.csv")
if mpath.exists():
    for m in csv.DictReader(mpath.open(encoding="utf-8-sig")):
        manifest[L.norm(m["full_name"])] = (m["record_id"], m["target_filename"])

existing = {}
if SRC_CSV.exists():
    existing = {r["full_name"]: r for r in csv.DictReader(SRC_CSV.open(encoding="utf-8"))}

candidates: list[tuple[str, str, str]] = []   # (name, image_url, source_page)
for slug, name, url, _sz in json.loads((HERE / "yesyale_hits.json").read_text()):
    candidates.append((name, url, "https://www.yesyale.org/team"))
for name, _slug, url in json.loads((HERE / "repo_photos.json").read_text()):
    candidates.append((name, url, "github.com/august-andersen/yes-catalog data/profiles.json"))

session = requests.Session()
added, skipped = [], []

for name, url, page in candidates:
    if name in existing:
        continue
    key = L.norm(name)
    if key not in by_name:
        skipped.append((name, "not-on-roster"))
        continue
    im = L.download_image(url, session)
    if im is None:
        skipped.append((name, "download-failed"))
        continue
    faces = L.detect_faces(im)
    if not faces:
        skipped.append((name, "no-face"))
        continue
    faces.sort(key=lambda f: f[2] * f[3], reverse=True)
    px = float(im.size[0] * im.size[1])
    area = (faces[0][2] * faces[0][3]) / px
    if area < MIN_FACE_AREA:
        skipped.append((name, f"face-too-small({area:.3f})"))
        continue
    if len(faces) > 1:
        second = (faces[1][2] * faces[1][3]) / px
        if area < DOMINANT_MIN_AREA or area < second * DOMINANT_RATIO:
            skipped.append((name, f"ambiguous({len(faces)} faces)"))
            continue
    rec, fname = manifest.get(key, ("", f"{by_name[key]['slug']}.jpg"))
    L.crop_to_face(im, faces[0]).save(OUT / fname, "JPEG", quality=92, optimize=True)
    row = {"record_id": rec, "full_name": name, "target_filename": fname,
           "image_url": url, "source_page": page,
           "page_tier": "first-party" if "yesyale.org" in url else "supplied",
           "evidence": "named-file", "faces_detected": len(faces),
           "face_area_frac": round(area, 4),
           "orig_size": f"{im.size[0]}x{im.size[1]}"}
    existing[name] = row
    added.append(name)

fields = ["record_id", "full_name", "target_filename", "image_url", "source_page",
          "page_tier", "evidence", "faces_detected", "face_area_frac", "orig_size"]
with SRC_CSV.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for r in sorted(existing.values(), key=lambda r: r["full_name"]):
        w.writerow({k: r.get(k, "") for k in fields})

print(f"added {len(added)}: {', '.join(added)}")
print(f"skipped {len(skipped)}: {skipped}")
print(f"total portraits now: {len(existing)}")
