#!/usr/bin/env node
// Build 1200x630 share cards for posts and the homepage.
// The title sits on the hero photo. The Pages workflow runs this before
// Jekyll. JPEGs and _data/share_manifest.yml are not committed. A card
// is redrawn only when its photo, title, or this script changes.
//
// Queued posts are never scanned. New files in _posts/ get a card on
// the next build.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const OUT_DIR = join(ROOT, "assets", "images", "share");
const CACHE = join(ROOT, ".share-cache");
const CACHE_OUT = join(CACHE, "out");
const MANIFEST = join(ROOT, "_data", "share_manifest.yml");
const LOGO = join(ROOT, "assets", "images", "logo.svg");
const SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf";
const SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf";
const LAYOUT = "afterpickup-share-v1";
const DOMAIN = "afterpickup.com";

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function read(path) {
  return readFileSync(path);
}

function yamlScalar(value) {
  return JSON.stringify(String(value));
}

function unquote(value) {
  const text = value.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  let key = null;
  let list = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s+-\s+/.test(line) && key && Array.isArray(list)) {
      list.push(unquote(line.replace(/^\s+-\s+/, "")));
      continue;
    }
    const found = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!found) continue;
    key = found[1];
    const raw = found[2].trim();
    if (raw === "" || raw === "|" || raw === ">" || raw === ">-" || raw === "|-") {
      list = [];
      data[key] = list;
      continue;
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      data[key] = raw
        .slice(1, -1)
        .split(",")
        .map((part) => unquote(part))
        .filter(Boolean);
      list = null;
      continue;
    }
    data[key] = unquote(raw);
    list = null;
  }
  return data;
}

function postSlug(name) {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
}

function cards() {
  const posts = [];
  for (const name of readdirSync(join(ROOT, "_posts")).filter((file) => file.endsWith(".md")).sort()) {
    const data = parseFrontMatter(read(join(ROOT, "_posts", name)).toString("utf8"));
    if (!data.title || !data.image || !data.date) continue;
    if (String(data.draft) === "true") continue;
    const tags = Array.isArray(data.tags) ? data.tags : [];
    posts.push({
      slug: postSlug(name),
      date: data.date,
      title: data.title,
      image: data.image,
      alt: data.image_alt || data.title,
      tags,
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const list = [
    {
      id: "home",
      path: "/",
      title: "After Pickup",
      kicker: "Tips and tricks for home and family.",
      image: "/assets/images/posts/family-after-pickup.webp",
      alt: "Caitlin and the kids on the couch after pickup, reading and drawing.",
    },
  ];

  for (const post of posts) {
    list.push({
      id: post.slug,
      path: `/${post.slug}/`,
      title: post.title,
      kicker: DOMAIN,
      image: post.image,
      alt: post.alt,
    });
  }
  return list;
}

function titleSize(title) {
  if (title.length > 52) return 46;
  if (title.length > 36) return 54;
  return 64;
}

function cardHash(card, photo, logo, script) {
  return sha256(Buffer.concat([
    Buffer.from(LAYOUT),
    Buffer.from(JSON.stringify({
      id: card.id,
      title: card.title,
      kicker: card.kicker,
      alt: card.alt,
    })),
    photo,
    logo,
    script,
  ]));
}

function fingerprintOf(list, logo, script) {
  const parts = [Buffer.from(LAYOUT), logo, script];
  for (const card of list) {
    parts.push(Buffer.from(card.id + card.title + card.kicker));
    parts.push(read(join(ROOT, card.image.replace(/^\//, ""))));
  }
  return sha256(Buffer.concat(parts));
}

function h(type, props, ...children) {
  const flat = children.flat().filter((child) => child !== undefined && child !== null && child !== false);
  return { type, props: { ...props, children: flat.length === 1 ? flat[0] : flat } };
}

function lightLogo(svg) {
  return svg
    .replace(/stroke="#2B3A52"/gi, 'stroke="#F7F3EC"')
    .replace(/fill="#4F6157"/gi, 'fill="#C5D4C0"');
}

async function overlay(card, logoDataUri) {
  const { default: satori } = await import("satori");
  const { Resvg } = await import("@resvg/resvg-js");
  const size = titleSize(card.title);
  const tree = h(
    "div",
    {
      style: {
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "linear-gradient(to top, rgba(23,20,15,0.86) 0%, rgba(23,20,15,0.55) 34%, rgba(23,20,15,0) 62%)",
        padding: "0 56px 48px",
      },
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 22, width: "100%" } },
      h("img", { src: logoDataUri, width: 72, height: 72 }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", maxWidth: 980 } },
        h("div", {
          style: {
            fontFamily: "Noto Serif",
            fontSize: size,
            fontWeight: 700,
            color: "#F7F3EC",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
          },
        }, card.title),
        h("div", {
          style: {
            marginTop: 10,
            fontFamily: "Noto Sans",
            fontSize: 26,
            color: "#E4DCD0",
          },
        }, card.kicker),
      ),
    ),
  );
  const svg = await satori(tree, {
    width: W,
    height: H,
    fonts: [
      { name: "Noto Serif", data: read(SERIF), weight: 700, style: "normal" },
      { name: "Noto Sans", data: read(SANS), weight: 400, style: "normal" },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

async function renderCard(card, logoPng) {
  const sharp = (await import("sharp")).default;
  const photoPath = join(ROOT, card.image.replace(/^\//, ""));
  const photo = await sharp(photoPath)
    .resize(W, H, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();
  const logoDataUri = `data:image/png;base64,${logoPng.toString("base64")}`;
  const layer = await overlay(card, logoDataUri);
  return sharp(photo).composite([{ input: layer, top: 0, left: 0 }]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

function writeManifest(list) {
  const lines = list.map((card) => {
    const image = `/assets/images/share/${card.id}.jpg`;
    const alt = `${card.title}. ${card.alt}`.replace(/\s+/g, " ").trim();
    return [
      `- path: ${card.path}`,
      `  image: ${image}`,
      `  alt: ${yamlScalar(alt)}`,
      "  width: 1200",
      "  height: 630",
    ].join("\n");
  });
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, `${lines.join("\n")}\n`);
}

function copyCached(list) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const card of list) {
    const src = join(CACHE_OUT, `${card.id}.jpg`);
    if (!existsSync(src)) throw new Error(`missing cached card ${card.id}`);
    copyFileSync(src, join(OUT_DIR, `${card.id}.jpg`));
  }
  writeManifest(list);
}

async function build(list) {
  const sharp = (await import("sharp")).default;
  for (const font of [SERIF, SANS]) {
    if (!existsSync(font)) {
      throw new Error(`Missing font ${font}. Install fonts-noto-core.`);
    }
  }
  const logoPng = await sharp(Buffer.from(lightLogo(read(LOGO).toString("utf8"))))
    .resize(144, 144)
    .png()
    .toBuffer();
  const script = read(fileURLToPath(import.meta.url));
  mkdirSync(CACHE_OUT, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  let drawn = 0;
  for (const card of list) {
    const photoPath = join(ROOT, card.image.replace(/^\//, ""));
    if (!existsSync(photoPath)) throw new Error(`Missing photo for ${card.id}: ${card.image}`);
    const photo = read(photoPath);
    const hash = cardHash(card, photo, logoPng, script);
    const metaPath = join(CACHE, "meta", `${card.id}.json`);
    const cached = join(CACHE_OUT, `${card.id}.jpg`);
    let reuse = false;
    if (existsSync(metaPath) && existsSync(cached)) {
      const meta = JSON.parse(read(metaPath).toString("utf8"));
      reuse = meta.hash === hash;
    }
    const dest = join(OUT_DIR, `${card.id}.jpg`);
    if (reuse) {
      copyFileSync(cached, dest);
      continue;
    }
    const jpeg = await renderCard(card, logoPng);
    mkdirSync(dirname(metaPath), { recursive: true });
    writeFileSync(cached, jpeg);
    writeFileSync(dest, jpeg);
    writeFileSync(metaPath, JSON.stringify({ hash }));
    drawn += 1;
    console.log(`drew ${card.id}`);
  }
  writeManifest(list);
  const fp = fingerprintOf(list, read(LOGO), script);
  writeFileSync(join(CACHE, "fingerprint"), `${fp}\n`);
  console.log(`share cards ${list.length}, redrawn ${drawn}`);
}

const list = cards();
const mode = process.argv[2];
if (mode === "--fingerprint") {
  process.stdout.write(fingerprintOf(list, read(LOGO), read(fileURLToPath(import.meta.url))));
} else if (mode === "--from-cache") {
  copyCached(list);
  console.log(`restored ${list.length} share cards`);
} else {
  await build(list);
}
