#!/usr/bin/env python3
"""Tile harvested portraits with their names so a human (or I) can eyeball them.

Automated provenance rules cannot catch every mismatch — a page can name the
right person and still show the wrong face (an author byline, a co-founder, a
stock photo). Looking at the wall is the last line of defence, so this exists.
"""
import csv
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
SRC = HERE / "portraits_out"
CSVF = HERE / "resolved_portrait_sources.csv"
COLS, CELL, LABEL = 6, 220, 30


def font(size: int):
    for p in ("/System/Library/Fonts/Supplemental/Arial.ttf",
              "/System/Library/Fonts/Helvetica.ttc"):
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def main() -> None:
    rows = list(csv.DictReader(CSVF.open(encoding="utf-8"))) if CSVF.exists() else []
    items = [(r["full_name"], SRC / r["target_filename"], r.get("evidence", ""))
             for r in rows if (SRC / r["target_filename"]).exists()]
    if not items:
        print("nothing to sheet")
        return
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end = int(sys.argv[2]) if len(sys.argv) > 2 else len(items)
    items = items[start:end]

    rowsn = (len(items) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * CELL, rowsn * (CELL + LABEL)), "#111111")
    d = ImageDraw.Draw(sheet)
    f = font(13)
    fs = font(11)

    for i, (name, path, ev) in enumerate(items):
        x, y = (i % COLS) * CELL, (i // COLS) * (CELL + LABEL)
        try:
            im = Image.open(path).convert("RGB").resize((CELL, CELL),
                                                        Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y))
        except Exception:
            d.rectangle([x, y, x + CELL, y + CELL], fill="#552222")
        d.text((x + 5, y + CELL + 3), name[:26], fill="#ffffff", font=f)
        d.text((x + 5, y + CELL + 17), ev[:30], fill="#8899aa", font=fs)

    out = HERE / f"contact_sheet_{start}_{start+len(items)}.jpg"
    sheet.save(out, "JPEG", quality=88)
    print("wrote", out, f"({len(items)} portraits)")


if __name__ == "__main__":
    main()
