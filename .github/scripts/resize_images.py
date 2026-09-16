#!/usr/bin/env python3
"""Generate responsive AVIF variants for post hero images.

Heroes never render wider than 640 CSS px (--measure is 40rem), so a
1600px original is mostly wasted bytes on a screen that supports AVIF.
This writes narrower AVIF copies next to each original and records what
exists in _data/image_variants.yml so the template can build a srcset
without ever pointing at a missing file.

Only two things are ever served: AVIF at several widths, and the
original file (whatever format it was uploaded as) as the single
fallback for anything that does not support AVIF. There is no WebP
tier in between. AVIF has been Baseline "high" since January 2024, so
the population that would hit the fallback is small and shrinking, and
for that population the original is exactly one request either way
(no benefit from generating intermediate sizes they will not use
heuristically before the browser even knows they lack AVIF support).
The cost is real but narrow: that visitor gets the flat 1600px file
instead of a size matched to their viewport.

On optimising WebP/PNG losslessly, kept for the record even though
WebP is no longer generated here: there is nothing to get from an
existing WebP. Checked by parsing the RIFF container. A bare VP8 chunk
has no EXIF/ICCP/XMP to strip, there is no jpegtran equivalent because
VP8 fuses prediction and arithmetic coding into one pass, and
re-encoding lossy alters most pixels for ~3% while lossless VP8L
re-storage is over 5x LARGER. PNGs do still get a genuinely lossless
optimize=True pass.

Safe to re-run. Outputs are rebuilt when the source *content* changes
(sha256 of the original), not when mtime says the source is newer.
GitHub Actions checkout gives every file the same (or newer) mtime, so
comparing timestamps would skip a swapped hero and leave stale AVIFs.
"""

import os
import io
import re
import sys
import glob
import hashlib
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

# The only generated tier. Quality 60 measured indistinguishable at 1:1
# against our previous WebP output while running noticeably smaller.
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


def file_sha256(path):
    with open(path, "rb") as fh:
        return hashlib.file_digest(fh, "sha256").hexdigest()


def load_source_hashes(path):
    """Read source_hash values from a previous manifest, if any.

    The file is tiny and we write it ourselves, so a line scan is enough
    and we do not need a YAML library in CI.
    """
    hashes = {}
    if not os.path.exists(path):
        return hashes
    stem = None
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if not line.strip() or line.startswith("#"):
                continue
            if re.match(r"^\S.*:$", line):
                stem = line.split(":", 1)[0]
            elif stem and line.strip().startswith("source_hash:"):
                hashes[stem] = line.split(":", 1)[1].strip()
    return hashes


def variant_current(out, source_changed):
    """Keep an existing AVIF only when the source bytes have not changed.

    A missing stored hash is treated as unknown, not as a change, so the
    first run after this logic lands can record hashes without rewriting
    every variant. A swapped hero still rebuilds: either its hash no
    longer matches, or the stale files were deleted so they are missing.
    """
    return os.path.exists(out) and not source_changed


def build(path, prev_hash=None):
    """Return (widths, avif_available, source_hash) for one original."""
    stem, ext = os.path.splitext(os.path.basename(path))
    if is_variant(stem):
        return None, False, None

    try:
        im = Image.open(path)
    except Exception as exc:
        print(f"  skip {path}: {exc}")
        return None, False, None

    im = im.convert("RGB")
    made = []
    src_hash = file_sha256(path)
    # None != hash would look like a change and rewrite every AVIF on
    # the first run. Only a *known* previous hash that differs counts.
    source_changed = prev_hash is not None and prev_hash != src_hash
    out_dir = os.path.dirname(path)

    # AVIF at each width, resized from the original so this is one
    # generation of loss rather than a re-encode of a re-encode.
    for w in WIDTHS:
        # Never upscale. A source smaller than the target is already fine.
        if w >= im.width:
            continue
        out = os.path.join(out_dir, f"{stem}-{w}.avif")
        made.append(w)
        if variant_current(out, source_changed):
            continue
        h = round(im.height * w / im.width)
        try:
            im.resize((w, h), Image.LANCZOS).save(
                out, "AVIF", quality=AVIF_QUALITY
            )
        except Exception as exc:
            # No AVIF encoder available. Nothing below this width will
            # succeed either, and the manifest omits avif entirely when
            # any expected file is missing, so the template falls back
            # to the plain original rather than pointing at nothing.
            print(f"  skip avif {os.path.basename(out)}: {exc}")
            break
        print(f"  wrote {os.path.basename(out)} ({os.path.getsize(out)//1024}K)")

    # Full-width AVIF too, so the widest candidate is covered and a
    # browser that supports AVIF never falls back to the heavier original.
    full_avif = os.path.join(out_dir, f"{stem}-{im.width}.avif")
    have_avif = os.path.exists(full_avif)
    if not variant_current(full_avif, source_changed):
        try:
            im.save(full_avif, "AVIF", quality=AVIF_QUALITY)
            have_avif = True
            print(f"  wrote {os.path.basename(full_avif)} "
                  f"({os.path.getsize(full_avif)//1024}K)")
        except Exception as exc:
            print(f"  skip avif {os.path.basename(full_avif)}: {exc}")

    made.append(im.width)

    # Only advertise AVIF if every width actually landed, so the template
    # never points at a file that failed to encode.
    widths = sorted(set(made))
    avif = have_avif and all(
        os.path.exists(os.path.join(out_dir, f"{stem}-{w}.avif"))
        for w in widths
    )
    return widths, avif, src_hash


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

    # Strip first. Doing it after would change the source bytes, so the
    # content hash would miss and every variant would rebuild for a
    # metadata-only edit.
    print("Stripping WebP metadata...")
    for path in sorted(glob.glob(os.path.join(IMAGE_DIR, "*.webp"))):
        saved = strip_webp_metadata(path)
        if saved:
            print(f"  {os.path.basename(path)}: {saved} bytes of "
                  f"metadata removed")

    manifest = {}
    has_avif = set()
    source_hashes = {}
    prev_hashes = load_source_hashes(DATA_FILE)
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
        stem = os.path.splitext(os.path.basename(path))[0]
        widths, avif, src_hash = build(path, prev_hashes.get(stem))
        if widths:
            manifest[stem] = widths
            source_hashes[stem] = src_hash
            if avif:
                has_avif.add(stem)

    os.makedirs("_data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        fh.write("# Generated by .github/scripts/resize_images.py. Do not edit.\n")
        fh.write("# widths: avif variants that exist on disk. avif: true when\n")
        fh.write("# one exists at every width, so the template can offer an\n")
        fh.write("# AVIF <source> and fall back to the plain original otherwise.\n")
        fh.write("# source_hash: sha256 of the original; variants rebuild when\n")
        fh.write("# it changes, because checkout mtimes are not trustworthy.\n")
        for stem in sorted(manifest):
            fh.write(f"{stem}:\n")
            fh.write("  widths:\n")
            for w in manifest[stem]:
                fh.write(f"    - {w}\n")
            fh.write(f"  avif: {str(stem in has_avif).lower()}\n")
            fh.write(f"  source_hash: {source_hashes[stem]}\n")

    print(f"\nWrote {DATA_FILE} with {len(manifest)} image(s).\n")
    optimise_pngs()


if __name__ == "__main__":
    main()
