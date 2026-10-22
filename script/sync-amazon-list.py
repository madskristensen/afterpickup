#!/usr/bin/env python3
"""Fetch the public After Pickup Amazon list and print its items.

Usage:
  python3 script/sync-amazon-list.py            # TSV: asin, image, title
  python3 script/sync-amazon-list.py --diff     # compare with _data/things_we_use.yml
Exit code 1 with --diff when ASINs were added or removed.
"""
import html, re, sys, subprocess, pathlib

LIST_ID = "120CGKFCGN8O8"
BASE = "https://www.amazon.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")


def get(url):
    for attempt in range(3):
        try:
            return _get(url)
        except subprocess.CalledProcessError:
            if attempt == 2:
                raise


def _get(url):
    # curl with a desktop Chrome UA; Amazon stalls Python's default TLS client.
    return subprocess.run(["curl", "-s", "--max-time", "30", "-A", UA,
                           "-H", "Accept-Language: en-US,en;q=0.9", url],
                          capture_output=True, text=True, check=True).stdout


def parse(page):
    """Each list row has id="itemName_<itemId>" with title + /dp/<ASIN>; image in itemImage_<itemId>."""
    items = []
    for m in re.finditer(r'id="itemName_([A-Z0-9]+)"[^>]*title="([^"]*)"[^>]*href="/dp/([A-Z0-9]{10})', page):
        iid, title, asin = m.groups()
        im = re.search(r'id="itemImage_%s".{0,800}?<img[^>]*src="([^"]+)"' % iid, page, re.S)
        items.append((asin, im.group(1) if im else "", html.unescape(title)))
    return items


def fetch_all():
    url = f"{BASE}/hz/wishlist/ls/{LIST_ID}"
    seen, out = set(), []
    for _ in range(100):
        page = get(url)
        for it in parse(page):
            if it[0] not in seen:
                seen.add(it[0]); out.append(it)
        m = re.search(r'showMoreUrl" value="([^"]+)"', page)
        # The last page still carries showMoreUrl, but with an empty token.
        if not m or not re.search(r"paginationToken=[^&]", m.group(1)):
            break
        url = BASE + html.unescape(m.group(1))
    return out


def main():
    items = fetch_all()
    if "--diff" not in sys.argv:
        for a, i, t in items:
            print(f"{a}\t{i}\t{t}")
        return 0
    data = pathlib.Path(__file__).resolve().parent.parent / "_data" / "things_we_use.yml"
    have = set(re.findall(r'asin:\s*"?([A-Z0-9]{10})', data.read_text()))
    live = {a: t for a, _, t in items}
    added = [a for a in live if a not in have]
    removed = sorted(have - set(live))
    for a in added: print(f"+ {a}\t{live[a]}")
    for a in removed: print(f"- {a}")
    if not added and not removed: print("in sync")
    return 1 if added or removed else 0


if __name__ == "__main__":
    sys.exit(main())
