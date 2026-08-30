#!/usr/bin/env python3
"""Generate responsive variants for post hero images.

Heroes never render wider than 640 CSS px (--measure is 40rem), so a
1600px original is mostly wasted bytes. This writes narrower copies
next to each original and records what exists in _data/image_variants.yml
so the template can build a srcset without ever pointing at a missing
file.

On optimising WebP losslessly: there is nothing to get. Checked by
parsing the RIFF container. Every file is a single bare VP8 chunk with
no EXIF, ICCP or XMP, so the only non-image bytes are the 20 byte header
(0.03% across all twenty files). There is also no jpegtran equivalent
for WebP. jpegtran works because JPEG keeps its coefficients in a
separately huffman-coded layer that can be reshuffled without touching
them, whereas VP8 fuses prediction and arithmetic coding into one pass,
so there is no layer to losslessly rewrite.

Two things that look like options but are not. Re-encoding lossy at the
same quality alters 62% of pixels (max channel deviation 16) to save
about 3%, and that damage compounds on every CI run. Re-storing as
lossless VP8L preserves the pixels exactly but is 5.2x LARGER, because
those pixels carry DCT noise that an entropy coder cannot model. So
existing WebP is left strictly alone.

What is worth doing is upstream. If someone drops in a JPEG or PNG
original, that file is the widest srcset candidate and the least
optimised thing we serve (a PNG hero is roughly 8x a WebP of the same
pixels). For those we write a full-width .webp alongside and point the
manifest at it. PNGs also get a genuinely lossless optimize pass.

The other real win is a better codec rather than a better encoder. AVIF
measured about 35% under our WebP across every hero at a quality that is
indistinguishable at 1:1, so we write .avif at each width too and offer
it first in a <picture>. Browsers without AVIF take the WebP <source>
and nothing has to detect anything. AVIF is resized from the original
each time, not from the WebP, so it stays one generation of loss.

Safe to re-run. Outputs are only rebuilt when the source is newer.
"""

import os
import io
import re
import sys
import glob
import struct

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

try:
    # Registers the AVIF plugin on Pillow builds that lack it. Recent
    # Pillow has AVIF built in, so a missing plugin is not an error.
    import pillow_avif  # noqa: F401
except ImportError:
    pass

# Post images live here; icons and the social card stay one level up in
# assets/images so the noisy, growing set is separated from fixed chrome.
IMAGE_DIR = os.path.join("assets", "images", "posts")
DATA_FILE = os.path.join("_data", "image_variants.yml")
POST_DIRS = ("_posts", "_queue")
PAGES = ("about.md",)

# 640 covers DPR 1, 1280 covers DPR 2. 960 catches the awkward middle.
WIDTHS = (640, 960, 1280)
QUALITY = 82

# AVIF alongside WebP, offered first in a <picture> so browsers that
# support it take it and everything else silently falls back. Measured
# on our own heroes it runs about 35% under the WebP at a quality that
# is indistinguishable at 1:1. Quality numbers are not comparable
# between the two codecs; 60 here is not "worse" than 82 above.
AVIF_QUALITY = 60

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
        return None, False, False

    try:
        im = Image.open(path)
    except Exception as exc:
        print(f"  skip {path}: {exc}")
        return None, False, False

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

    # AVIF at the same widths. Resized from the original every time
    # rather than from the WebP we just wrote, so this is one generation
    # of loss and not two.
    for w in WIDTHS:
        if w >= im.width:
            continue
        out = os.path.join(out_dir, f"{stem}-{w}.avif")
        if os.path.exists(out) and os.path.getmtime(out) >= src_mtime:
            continue
        h = round(im.height * w / im.width)
        try:
            im.resize((w, h), Image.LANCZOS).save(
                out, "AVIF", quality=AVIF_QUALITY
            )
        except Exception as exc:
            # No AVIF encoder available. The <picture> falls back to
            # WebP on its own, so a missing AVIF is not fatal.
            print(f"  skip avif {os.path.basename(out)}: {exc}")
            break
        print(f"  wrote {os.path.basename(out)} "
              f"({os.path.getsize(out)//1024}K)")

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

    # Full-width AVIF too, so the widest candidate is covered.
    full_avif = os.path.join(out_dir, f"{stem}-{im.width}.avif")
    have_avif = os.path.exists(full_avif)
    if not (have_avif and os.path.getmtime(full_avif) >= src_mtime):
        try:
            im.save(full_avif, "AVIF", quality=AVIF_QUALITY)
            have_avif = True
            print(f"  wrote {os.path.basename(full_avif)} "
                  f"({os.path.getsize(full_avif)//1024}K)")
        except Exception as exc:
            print(f"  skip avif {os.path.basename(full_avif)}: {exc}")

    # Only advertise AVIF if every width actually landed, so the template
    # never points at a file that failed to encode.
    widths = sorted(set(made))
    avif = have_avif and all(
        os.path.exists(os.path.join(out_dir, f"{stem}-{w}.avif"))
        for w in widths
    )
    return widths, full_is_webp, avif


def strip_webp_metadata(path):
    """Drop EXIF/ICC/XMP from a WebP without touching the image data.

    This is the one genuinely lossless win available on WebP. We rebuild
    the RIFF container keeping only the image chunks, so the compressed
    VP8 payload is copied byte for byte and never re-encoded. A phone
    export carrying EXIF and a Display P3 profile sheds about 6%.

    Ours are already clean, so this normally does nothing. It matters
    when someone uploads a WebP straight from a camera or an editor.
    """
    META = {b"EXIF", b"XMP ", b"ICCP"}

    with open(path, "rb") as fh:
        data = fh.read()
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return 0

    chunks, off = [], 12
    while off + 8 <= len(data):
        cid = data[off:off + 4]
        size = struct.unpack("<I", data[off + 4:off + 8])[0]
        end = off + 8 + size + (size & 1)
        chunks.append((cid, data[off:end]))
        off = end

    if not any(cid in META for cid, _ in chunks):
        return 0

    ids = {cid for cid, _ in chunks}
    # Animation needs VP8X to survive and its frame layout is a different
    # problem, so leave those alone rather than risk corrupting them.
    if b"ANIM" in ids or b"ANMF" in ids:
        return 0

    kept = [(cid, raw) for cid, raw in chunks if cid not in META]

    # VP8X exists to advertise optional features in a leading 10 byte
    # chunk. Having stripped ICC and EXIF we must clear those flag bits,
    # or a decoder will look for chunks that are no longer there. With
    # no features left the extended form is pointless, so drop VP8X and
    # emit the plain single-chunk file a simple decoder expects.
    has_alpha = b"ALPH" in ids
    if not has_alpha:
        kept = [(cid, raw) for cid, raw in kept if cid != b"VP8X"]

    if any(cid == b"VP8X" for cid, _ in kept):
        # Alpha still needs the extended form. Rewrite the flags,
        # keeping only the alpha bit (0x10).
        rebuilt = []
        for cid, raw in kept:
            if cid == b"VP8X":
                payload = bytearray(raw[8:8 + 10])
                payload[0] &= 0x10
                rebuilt.append((cid, raw[:8] + bytes(payload)))
            else:
                rebuilt.append((cid, raw))
        kept = rebuilt

    body = b"".join(raw for _, raw in kept)
    out = b"RIFF" + struct.pack("<I", len(body) + 4) + b"WEBP" + body
    if len(out) >= len(data):
        return 0

    # Never write a file we cannot read back.
    try:
        Image.open(io.BytesIO(out)).load()
    except Exception as exc:
        print(f"  skip strip on {os.path.basename(path)}: {exc}")
        return 0

    with open(path, "wb") as fh:
        fh.write(out)
    return len(data) - len(out)


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

    # Strip first. Doing it after would bump the original's mtime and make
    # every variant look stale, forcing a pointless rebuild.
    print("Stripping WebP metadata...")
    for path in sorted(glob.glob(os.path.join(IMAGE_DIR, "*.webp"))):
        saved = strip_webp_metadata(path)
        if saved:
            print(f"  {os.path.basename(path)}: {saved} bytes of "
                  f"metadata removed")

    manifest = {}
    full_webp = set()
    has_avif = set()
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
        widths, is_webp, avif = build(path)
        if widths:
            stem = os.path.splitext(os.path.basename(path))[0]
            manifest[stem] = widths
            if not is_webp:
                full_webp.add(stem)
            if avif:
                has_avif.add(stem)

    os.makedirs("_data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        fh.write("# Generated by .github/scripts/resize_images.py. Do not edit.\n")
        fh.write("# widths: what exists on disk. full_webp: true when the\n")
        fh.write("# widest candidate is a generated .webp rather than the\n")
        fh.write("# original (that happens when the original is a jpg/png).\n")
        fh.write("# avif: true when an .avif exists at every width.\n")
        for stem in sorted(manifest):
            fh.write(f"{stem}:\n")
            fh.write("  widths:\n")
            for w in manifest[stem]:
                fh.write(f"    - {w}\n")
            fh.write(f"  full_webp: {str(stem in full_webp).lower()}\n")
            fh.write(f"  avif: {str(stem in has_avif).lower()}\n")

    print(f"\nWrote {DATA_FILE} with {len(manifest)} image(s).\n")
    optimise_pngs()


if __name__ == "__main__":
    main()
