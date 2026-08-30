#!/usr/bin/env python3
"""Generate responsive variants for post hero images.

Heroes never render wider than 640 CSS px (--measure is 40rem), so a
1600px original is mostly wasted bytes. This writes narrower copies
next to each original and records what exists in _data/image_variants.yml
so the template can build a srcset without ever pointing at a missing
file.

On optimisation: the heroes are lossy WebP carrying no EXIF or ICC, so
there is nothing left to strip and no lossless win available. Re-encoding
them would decode and requantise, losing a little quality every run for
about 3%. So we do not touch existing WebP.

What is worth doing is upstream. If someone drops in a JPEG or PNG
original, that file is the widest srcset candidate and the least
optimised thing we serve (a PNG hero is roughly 8x a WebP of the same
pixels). For those we write a full-width .webp alongside and point the
manifest at it. PNGs also get a genuinely lossless optimize pass.

Safe to re-run. Outputs are only rebuilt when the source is newer.
"""

import os
import io
import re
import sys
import glob

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

# Post images live here; icons and the social card stay one level up in
# assets/images so the noisy, growing set is separated from fixed chrome.
IMAGE_DIR = os.path.join("assets", "images", "posts")
DATA_FILE = os.path.join("_data", "image_variants.yml")
POST_DIRS = ("_posts", "_queue")
PAGES = ("about.md",)

# 640 covers DPR 1, 1280 covers DPR 2. 960 catches the awkward middle.
WIDTHS = (640, 960, 1280)
QUALITY = 82

# name-640.webp — used to recognise our own output so we never
# generate variants of variants.
VARIANT_RE = re.compile(r"-(\d+)$")


def referenced_images():
    """Hero images named in post and page front matter."""
    sources = [p for d in POST_DIRS for p in glob.glob(os.path.join(d, "*.md"))]
    sources += [p for p in PAGES if os.path.exists(p)]

    found = set()
    for path in sources:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"^image:\s*(\S+)", line)
                if m:
                    found.add(m.group(1).lstrip("/"))
    return found


def is_variant(stem):
    return bool(VARIANT_RE.search(stem))


def build(path):
    """Return (widths, full_width_is_webp) for one original."""
    stem, ext = os.path.splitext(os.path.basename(path))
    if is_variant(stem):
        return None, False

    try:
        im = Image.open(path)
    except Exception as exc:
        print(f"  skip {path}: {exc}")
        return None, False

    im = im.convert("RGB")
    made = []
    src_mtime = os.path.getmtime(path)
    out_dir = os.path.dirname(path)

    for w in WIDTHS:
        # Never upscale. A source smaller than the target is already fine.
        if w >= im.width:
            continue
        # Write next to the original so moving the folder needs no edit here.
        out = os.path.join(out_dir, f"{stem}-{w}.webp")
        made.append(w)
        if os.path.exists(out) and os.path.getmtime(out) >= src_mtime:
            continue
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(
            out, "WEBP", quality=QUALITY, method=6
        )
        print(f"  wrote {os.path.basename(out)} ({os.path.getsize(out)//1024}K)")

    # The widest candidate. If the original is already WebP it is fine as
    # is. If it is a JPEG or PNG it is the biggest file we serve and the
    # only unoptimised one, so write a full-width WebP for the srcset to
    # use instead. The original stays on disk untouched as the source of
    # truth and as the src fallback for anything without WebP support.
    full_is_webp = ext.lower() == ".webp"
    if not full_is_webp:
        out = os.path.join(out_dir, f"{stem}-{im.width}.webp")
        if not (os.path.exists(out) and os.path.getmtime(out) >= src_mtime):
            im.save(out, "WEBP", quality=QUALITY, method=6)
            saved = os.path.getsize(path) - os.path.getsize(out)
            print(f"  wrote {os.path.basename(out)} "
                  f"({os.path.getsize(out)//1024}K, {saved//1024}K under the "
                  f"{ext.lstrip('.')} original)")

    made.append(im.width)
    return sorted(set(made)), full_is_webp


def optimise_pngs():
    """Losslessly shrink the PNGs we ship.

    optimize=True retries zlib settings and picks the smallest. Pixels are
    untouched, so this is safe for icons where any artefact would show. It
    does not always win (tiny files can grow when the filter table costs
    more than it saves), so we only keep a result that is actually smaller.
    """
    print("Optimising PNGs...")
    for path in sorted(glob.glob(os.path.join("assets", "images", "*.png"))):
        before = os.path.getsize(path)
        im = Image.open(path)
        buf = io.BytesIO()
        # Preserve transparency: favicons are RGBA and must stay that way.
        im.save(buf, "PNG", optimize=True)
        after = buf.tell()
        if after < before:
            with open(path, "wb") as fh:
                fh.write(buf.getvalue())
            print(f"  {os.path.basename(path)}: {before//1024}K -> "
                  f"{after//1024}K ({(before-after)*100//before}% smaller)")


def main():
    wanted = referenced_images()
    if not wanted:
        print("No hero images referenced in posts.")

    manifest = {}
    full_webp = set()
    print("Generating variants...")
    for path in sorted(glob.glob(os.path.join(IMAGE_DIR, "*"))):
        ext = os.path.splitext(path)[1].lower()
        if ext not in (".webp", ".jpg", ".jpeg", ".png"):
            continue
        rel = path.replace(os.sep, "/")
        # Only process images a post actually uses as a hero. Icons and
        # the social card have fixed sizes and must not be touched.
        if rel not in wanted:
            continue
        widths, is_webp = build(path)
        if widths:
            stem = os.path.splitext(os.path.basename(path))[0]
            manifest[stem] = widths
            if not is_webp:
                full_webp.add(stem)

    os.makedirs("_data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        fh.write("# Generated by .github/scripts/resize_images.py. Do not edit.\n")
        fh.write("# widths: what exists on disk. full_webp: true when the\n")
        fh.write("# widest candidate is a generated .webp rather than the\n")
        fh.write("# original (that happens when the original is a jpg/png).\n")
        for stem in sorted(manifest):
            fh.write(f"{stem}:\n")
            fh.write("  widths:\n")
            for w in manifest[stem]:
                fh.write(f"    - {w}\n")
            fh.write(f"  full_webp: {str(stem in full_webp).lower()}\n")

    print(f"\nWrote {DATA_FILE} with {len(manifest)} image(s).\n")
    optimise_pngs()


if __name__ == "__main__":
    main()
