"""
Portrait harvesting for the YES catalog.

PROVENANCE IS THE ONLY VERIFICATION THAT COUNTS. An image is accepted only when
the page that hosts it demonstrably names the person. Image-search fallback is
deliberately NOT implemented: a live test of the bundled fetch_portraits.py
approach returned Amazon product photos and anime fan art for a real query
('"Oliver Hime" Yale UnitZero'), and a face detector cannot tell a swimwear
model's face from a founder's. A wrong face under a real name is far worse than
no face at all.

Face detection is a SECONDARY filter only — it removes logos, screenshots and
product shots that survive the name check.
"""
from __future__ import annotations

import io
import re
import threading
import time
import unicodedata
import urllib.parse
from dataclasses import dataclass, field
from html.parser import HTMLParser

import cv2
import numpy as np
import requests
from PIL import Image, ImageOps

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}

# Pages that are directory indexes, not about one person. The CSV lists
# startup.yale.edu/people/ as the "Primary Source URL" for 44 rows; it was
# verified to be a static index of Yale Ventures mentors that contains exactly
# one of our 116 people. Treating it as a source would attach a mentor's face
# to a student's name.
GENERIC_PAGES = {
    "https://startup.yale.edu/people/",
    "https://startup.yale.edu/people",
}

# Filename/URL fragments that are never a portrait.
JUNK = re.compile(
    r"(logo|icon|favicon|sprite|banner|placeholder|avatar-default|spinner|"
    r"arrow|chevron|bullet|divider|pattern|texture|bg[-_]|background|"
    r"screenshot|product|wordmark|badge|seal|footer|header[-_]img)",
    re.I,
)


def strip_accents(s: str) -> str:
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", strip_accents(s).lower()).strip()


def name_tokens(name: str) -> tuple[str, list[str]]:
    """Return (last_name, other_tokens>=3 chars)."""
    parts = [p for p in norm(name).split() if p]
    if not parts:
        return "", []
    return parts[-1], [p for p in parts[:-1] if len(p) >= 3]


def text_names_person(name: str, text: str) -> bool:
    """True when `text` plausibly refers to this exact person.

    Requires the surname AND at least one given-name token, so 'Yang' alone
    never matches 'Sophia Yang' and 'Yumi Yang' never matches each other.
    """
    last, firsts = name_tokens(name)
    t = norm(text)
    if not last or last not in t:
        return False
    if not firsts:
        return True
    return any(f in t for f in firsts)


def slug_variants(name: str) -> list[str]:
    parts = [p for p in norm(name).split() if p]
    if len(parts) < 2:
        return parts
    first, last = parts[0], parts[-1]
    return [f"{first}{last}", f"{first}-{last}", f"{first}_{last}",
            f"{last}{first}", f"{last}-{first}", f"{first}.{last}"]


@dataclass
class ImgCandidate:
    url: str
    evidence: str          # named-alt | named-context | named-file | og-personal
    context: str = ""


class ImageHarvester(HTMLParser):
    """Collects <img> tags with their alt/title and nearby text, plus og:image.

    Nearby text is approximated by tracking the most recent text run before the
    tag and the first text run after it — a team-page card puts the name
    immediately beside the photo, which is exactly the signal we want.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.images: list[dict] = []
        self.og: list[str] = []
        self.texts: list[str] = []
        self._pending: list[dict] = []
        self.all_text: list[str] = []
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
        if tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            if key in ("og:image", "twitter:image", "og:image:secure_url") and a.get("content"):
                self.og.append(a["content"])
        if tag in ("img", "source"):
            src = (a.get("src") or a.get("data-src") or a.get("data-lazy-src")
                   or a.get("data-original") or "")
            if not src and a.get("srcset"):
                src = a["srcset"].split(",")[0].strip().split(" ")[0]
            if not src:
                return
            rec = {
                "src": src,
                "alt": a.get("alt", "") or "",
                "title": a.get("title", "") or "",
                "before": " ".join(self.texts[-3:])[-300:],
                "after": "",
            }
            self.images.append(rec)
            self._pending.append(rec)

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        d = " ".join(data.split())
        if not d:
            return
        if self._in_title:
            self.title += d
        self.all_text.append(d)
        self.texts.append(d)
        for rec in self._pending:
            rec["after"] = (rec["after"] + " " + d)[:300]
        if self._pending and len(self._pending[0]["after"]) > 120:
            self._pending.clear()


def fetch(url: str, session: requests.Session, timeout: int = 20):
    try:
        r = session.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
    except Exception:
        return None, None, None
    if not r.ok:
        return None, None, r.status_code
    ctype = r.headers.get("content-type", "")
    if "text/html" not in ctype:
        return None, None, r.status_code
    return r.url, r.text, r.status_code


def candidates_from_page(page_url: str, html: str, name: str,
                         personal_domain: bool) -> list[ImgCandidate]:
    p = ImageHarvester()
    try:
        p.feed(html)
    except Exception:
        pass

    page_text = " ".join(p.all_text)
    page_mentions = text_names_person(name, page_text)
    out: list[ImgCandidate] = []
    seen: set[str] = set()

    def add(src: str, evidence: str, ctx: str = "") -> None:
        if not src or src.startswith("data:"):
            return
        u = urllib.parse.urljoin(page_url, src)
        if u in seen or JUNK.search(u):
            return
        seen.add(u)
        out.append(ImgCandidate(u, evidence, ctx[:200]))

    variants = slug_variants(name)
    for rec in p.images:
        alt_title = f"{rec['alt']} {rec['title']}"
        fname = urllib.parse.unquote(rec["src"].rsplit("/", 1)[-1])
        if text_names_person(name, alt_title):
            add(rec["src"], "named-alt", alt_title)
        elif any(v in norm(fname).replace(" ", "") or v in fname.lower() for v in variants):
            add(rec["src"], "named-file", fname)
        elif text_names_person(name, rec["before"] + " " + rec["after"]):
            add(rec["src"], "named-context", (rec["before"] + " | " + rec["after"]))

    # og:image is only trustworthy when the page is *about* this person: their
    # own site, or a page whose title names them. On a news article the og:image
    # is the article hero, which is routinely a group shot or a product.
    title_names = text_names_person(name, p.title)
    if p.og and (personal_domain or title_names):
        if page_mentions:
            for u in p.og:
                add(u, "og-personal", p.title)

    # A page TITLED for this person that carries exactly one content image:
    # that image is them. This is how profile pieces are built — e.g. Yale
    # Scientific's "Undergraduate Profile: Madhav Lavakare (YC '25)", whose only
    # non-logo image is his portrait, filed under the photographer's name so
    # neither the alt text nor the filename mentions the subject at all.
    # Requires exactly one, so a multi-image article can never qualify.
    if title_names and page_mentions:
        content = []
        for rec in p.images:
            src = rec["src"]
            if not src or src.startswith("data:"):
                continue
            u = urllib.parse.urljoin(page_url, src)
            if JUNK.search(u):
                continue
            if u not in content:
                content.append(u)
        if len(content) == 1:
            # It may already be recorded under weaker evidence; upgrade in
            # place rather than letting the dedupe drop the stronger reading.
            for c in out:
                if c.url == content[0]:
                    c.evidence = "profile-sole-image"
                    c.context = p.title
                    break
            else:
                add(content[0], "profile-sole-image", p.title)
    return out


# cv2.CascadeClassifier is NOT thread-safe — sharing one instance across the
# worker pool throws "(-215:Assertion failed) 0 <= scaleIdx" from getScaleData
# and kills the person outright. One classifier per thread.
_tls = threading.local()


def cascade():
    c = getattr(_tls, "cascade", None)
    if c is None:
        c = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")
        _tls.cascade = c
    return c


def download_image(url: str, session: requests.Session):
    try:
        r = session.get(url, headers=HEADERS, timeout=25, allow_redirects=True)
        if not r.ok or len(r.content) < 3000:
            return None
        im = Image.open(io.BytesIO(r.content))
        im = ImageOps.exif_transpose(im).convert("RGB")
    except Exception:
        return None
    if min(im.size) < 180:
        return None
    w, h = im.size
    if max(w, h) / min(w, h) > 2.6:      # banners / wide hero strips
        return None
    return im


def detect_faces(im: Image.Image):
    arr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    g = cv2.cvtColor(arr, cv2.COLOR_BGR2GRAY)
    g = cv2.equalizeHist(g)
    scale = 900 / max(g.shape)
    if scale < 1:
        g = cv2.resize(g, (int(g.shape[1] * scale), int(g.shape[0] * scale)))
    else:
        scale = 1.0
    faces = cascade().detectMultiScale(g, scaleFactor=1.1, minNeighbors=6,
                                       minSize=(40, 40))
    return [(int(x / scale), int(y / scale), int(w / scale), int(h / scale))
            for (x, y, w, h) in faces]


def crop_to_face(im: Image.Image, face, size: int = 800) -> Image.Image:
    """Square crop centred on the face with headroom, falling back to centre."""
    W, H = im.size
    if face is None:
        s = min(W, H)
        box = ((W - s) // 2, (H - s) // 2, (W + s) // 2, (H + s) // 2)
    else:
        x, y, w, h = face
        cx, cy = x + w / 2, y + h / 2 - h * 0.12   # a little headroom
        s = min(max(w * 2.9, h * 2.9), W, H)
        left = max(0, min(W - s, cx - s / 2))
        top = max(0, min(H - s, cy - s / 2))
        box = (int(left), int(top), int(left + s), int(top + s))
    return im.crop(box).resize((size, size), Image.Resampling.LANCZOS)


# --------------------------------------------------------------------------
# Source discovery
# --------------------------------------------------------------------------

SOCIAL_BLOCK = re.compile(
    r"(linkedin\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|"
    r"tiktok\.com|youtube\.com|pinterest\.|reddit\.com|amazon\.|ebay\.|"
    r"wikipedia\.org|imdb\.com|findagrave|ancestry\.)", re.I)


def corroborates(page_text: str, name: str, tokens: list[str]) -> bool:
    """The page must name the person AND back it with a distinguishing token.

    Names are not unique. A search for a builder called 'Jimmy Carter' surfaces
    the president; a page whose alt text reads 'Jimmy Carter' would otherwise
    sail through the name check. Requiring the venture, the organisation or at
    least 'Yale' alongside the name is what separates our person from theirs.
    """
    if not text_names_person(name, page_text):
        return False
    t = norm(page_text)
    return any(norm(tok) and norm(tok) in t for tok in tokens if tok)


_search_lock = threading.Lock()
_last_search = [0.0]
_empty_streak = [0]
_search_disabled = [False]
SEARCH_INTERVAL = 2.0
EMPTY_STREAK_LIMIT = 6


def ddg_search(query: str, session: requests.Session, limit: int = 8) -> list[str]:
    """Page search (NOT image search) — results are still evidence-gated.

    Serialized behind a global lock with a fixed interval: eight worker threads
    querying at once got silently throttled to empty result sets, which looked
    exactly like "this person has no web presence" and quietly cost coverage.
    """
    import html as _html
    if _search_disabled[0]:
        return []
    with _search_lock:
        wait = SEARCH_INTERVAL - (time.monotonic() - _last_search[0])
        if wait > 0:
            time.sleep(wait)
        _last_search[0] = time.monotonic()
    try:
        r = session.post("https://html.duckduckgo.com/html/", data={"q": query},
                         headers=HEADERS, timeout=25)
        if not r.ok or r.status_code == 202:
            _note_search_result(0)
            return []
    except Exception:
        _note_search_result(0)
        return []
    raw = re.findall(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"', r.text)
    out: list[str] = []
    for u in raw:
        m = re.search(r"uddg=([^&]+)", u)
        if m:
            u = urllib.parse.unquote(m.group(1))
        u = _html.unescape(u)
        if not u.startswith("http") or SOCIAL_BLOCK.search(u):
            continue
        if u not in out:
            out.append(u)
        if len(out) >= limit:
            break
    _note_search_result(len(out))
    return out


def _note_search_result(n: int) -> None:
    """Stop searching once the engine is clearly refusing us.

    DuckDuckGo answers scripted traffic with HTTP 202 and an anti-bot page,
    which parses to zero results. Retrying 90 more times neither helps nor is
    polite, and an empty result set is indistinguishable from "no such page" —
    so trip a breaker and report the shortfall honestly instead.
    """
    if n > 0:
        _empty_streak[0] = 0
        return
    _empty_streak[0] += 1
    if _empty_streak[0] >= EMPTY_STREAK_LIMIT and not _search_disabled[0]:
        _search_disabled[0] = True
        print("   [search disabled: %d consecutive empty result sets — "
              "the engine is blocking scripted queries]" % EMPTY_STREAK_LIMIT,
              flush=True)
