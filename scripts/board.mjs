#!/usr/bin/env node
// Build mood-board pictures the user sees in the chat before a choice popup, so a non-designer sees each option instead of reading about it.
// One PNG per question; the cards are lettered A B C to match the popup options.
// usage: node scripts/board.mjs style [group] [offset] --project <dir> [--pick <styleId>]   same list as choice-menu styles
//        node scripts/board.mjs tune --project <dir> [--file <dir>/boards/tune.json]          colour, type, motion and sound boards
//        node scripts/board.mjs storyboard --project <dir> [--file <dir>/storyboard.json]     one sketch frame per beat
// Needs Chrome or Chromium (or CHROME_PATH) to take the picture; without it the board is opened as an HTML page.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { edition, shelfMedia, styleChoices, TUNE } from "./choice-menu.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] || "" : "";
};
const VALUE_FLAGS = new Set(["--project", "--file", "--pick"]);
const [kind, arg, offset] = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
const fail = (message) => {
  console.error(`BOARD FAIL: ${message}`);
  process.exit(1);
};

const project = opt("project");
if (!project || !path.isAbsolute(project)) fail("pass --project <absolute path of the user's work folder>");
const LETTERS = "ABCDEFGH";
const W = 1600;
const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const readJson = (file) => {
  if (!existsSync(file)) fail(`missing ${file}`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }
};
// "Prompt-Bold" → family Prompt, weight 700, so storyboard font names work as written.
const WEIGHTS = { thin: 100, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
const fontOf = (name, fallbackWeight = 700) => {
  const [family, style] = String(name || "").split("-");
  return { family: family || "Noto Sans Thai", weight: WEIGHTS[String(style || "").toLowerCase()] || fallbackWeight };
};
const fontLink = (families) => {
  const list = [...new Set(["Noto Sans Thai", ...families].filter(Boolean))];
  const query = list.map((family) => `family=${family.trim().replace(/ /g, "+")}:wght@400;500;700;800;900`).join("&");
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&display=block">`;
};

// One fixed-size canvas per picture, so the screenshot always holds the whole board.
const canvas = (title, note, body, height, families = []) => `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>${fontLink(families)}
<style>
*{box-sizing:border-box}html,body{margin:0;width:${W}px;height:${height}px;overflow:hidden}
body{background:#f4f2ee;color:#1d1d1f;font:20px/1.5 "Noto Sans Thai",sans-serif;padding:44px 48px}
h1{font-size:38px;line-height:1.2;margin:0}.note{color:#6e6e73;margin:6px 0 28px;font-size:20px}
.row{display:grid;gap:24px;grid-template-columns:repeat(var(--n),1fr)}
.card{background:#fff;border:2px solid #e5e2dc;border-radius:22px;padding:20px;display:flex;flex-direction:column;gap:12px}
.card.pick{border:3px solid #0a7d4f}
.badge{display:flex;align-items:center;gap:10px}
.letter{width:48px;height:48px;border-radius:50%;background:#1d1d1f;color:#fff;display:grid;place-items:center;font-weight:800;font-size:26px}
.rec{background:#0a7d4f;color:#fff;border-radius:99px;padding:3px 14px;font-size:17px;font-weight:700}
.label{font-weight:800;font-size:24px;line-height:1.3}.desc{color:#55555a;font-size:18px;line-height:1.45}
.thumbs{display:grid;gap:8px;grid-template-columns:repeat(var(--t),1fr)}
.thumbs img{width:100%;aspect-ratio:16/9;object-fit:contain;border-radius:12px;display:block;background:#222}
.phone{aspect-ratio:9/16;height:500px;border-radius:26px;overflow:hidden;padding:30px 22px;display:flex;flex-direction:column;gap:12px;margin:0 auto;border:2px solid #e5e2dc}
.phone .h{font-size:34px;line-height:1.15}.phone .s{font-size:17px;opacity:.85}.phone .price{font-size:48px;line-height:1}
.phone .cta{margin-top:auto;border-radius:99px;padding:10px 16px;font-weight:700;text-align:center;font-size:18px}
.sw{display:flex;gap:8px;justify-content:center}.sw i{width:34px;height:34px;border-radius:9px;border:2px solid #e5e2dc;display:block}
.stage{background:#f7f6f3;border-radius:16px;height:150px;position:relative;overflow:hidden}
.stage .ghost{position:absolute;top:47px;width:56px;height:56px;border-radius:14px;background:#1d1d1f}.stage .end{position:absolute;top:24px;bottom:24px;width:0;border-left:3px dashed #b8b4ac}
.wave{display:flex;align-items:center;gap:4px;height:150px;background:#f7f6f3;border-radius:16px;padding:0 16px}.wave i{flex:1;border-radius:4px;background:#1d1d1f;display:block}
.strip{display:grid;gap:22px;grid-template-columns:repeat(5,1fr)}
.frame{border-radius:18px;overflow:hidden;padding:20px 16px;display:flex;flex-direction:column;gap:10px;border:2px solid #e5e2dc}
.frame .vis{border:2px dashed currentColor;opacity:.5;border-radius:12px;padding:10px;font-size:14px;flex:1;display:flex;align-items:center;justify-content:center;text-align:center}
.meta{font-size:15px;color:#55555a;margin-top:8px;line-height:1.45}.meta b{color:#1d1d1f}
.warn{display:inline-block;background:#fff3cd;color:#664d03;border-radius:10px;padding:6px 14px;font-size:17px;margin-bottom:22px}
</style></head><body><h1>${esc(title)}</h1><p class="note">${esc(note)}</p>${body}</body></html>`;

const badge = (i, pick) => `<div class="badge"><div class="letter">${LETTERS[i]}</div>${pick ? '<span class="rec">แนะนำ</span>' : ""}</div>`;
const card = (i, pick, inner) => `<div class="card${pick ? " pick" : ""}">${badge(i, pick)}${inner}</div>`;
const row = (cards) => `<div class="row" style="--n:${cards.length}">${cards.join("")}</div>`;
const LOOK_NOTE = "ดูภาพแล้วตอบด้วยตัวอักษรเดียวกันในคำถาม กรอบเขียวคือแบบที่แนะนำ";

const styleBoards = () => {
  if (edition() === "free") fail("edition free has no style library; use the tune board instead");
  const menu = styleChoices(arg, offset);
  if (!menu) fail(`unknown style group ${arg}`);
  const media = shelfMedia().styles;
  const pick = opt("pick") || menu.items[0]?.id;
  const posters = menu.items.map((item) => item.styles.map((id) => media[id]?.poster).filter(Boolean).slice(0, 4));
  const cards = menu.items.map((item, i) => {
    const thumbs = `<div class="thumbs" style="--t:${Math.min(posters[i].length, 2) || 1}">${posters[i].map((src) => `<img src="${esc(src)}" alt="">`).join("")}</div>`;
    return card(i, item.id === pick, `${thumbs}<div class="desc">${esc(item.say)}</div>`);
  });
  const more = menu.next != null ? `<p class="note" style="margin-top:20px">ยังมีแบบอื่นอีก เลือก «ดูแบบที่เหลือ» ในคำถามได้</p>` : "";
  // Height follows the cards: thumbnails are 16:9 in a grid of up to two columns inside each card.
  const inner = (W - 96 - 24 * (cards.length - 1)) / cards.length - 44;
  const thumbRows = Math.max(...posters.map((list) => Math.ceil(list.length / 2) || 1));
  const cols = posters.some((list) => list.length > 1) ? 2 : 1;
  const thumbH = ((inner - 8 * (cols - 1)) / cols) * (9 / 16);
  const height = Math.round(170 + 60 + thumbRows * (thumbH + 8) + 140 + (more ? 70 : 0) + 44);
  return [{
    name: arg ? `style-${arg}${offset ? `-${offset}` : ""}` : "style",
    cards: menu.items.map((item, i) => `${LETTERS[i]}=${item.id}`),
    height,
    html: (h) => canvas(menu.ask, LOOK_NOTE, row(cards) + more, h),
  }];
};

// Motion is shown as onion-skin frames: where the square sits at equal moments, so the spacing tells the feel.
const EASE = {
  smooth: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  bounce: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  snap: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  float: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  spring: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};
const motionStage = (ease) => {
  const f = EASE[ease] || EASE.smooth;
  const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1];
  // The dashed line is where the move ends; 0.85 of the stage leaves room for bounce and spring to overshoot it.
  const x = (p) => `calc(16px + (100% - 88px) * ${(0.85 * p).toFixed(3)})`;
  return `<div class="stage"><div class="end" style="left:calc(${x(1)} + 28px)"></div>${steps.map((t, i) => `<div class="ghost" style="left:${x(f(t))};opacity:${(0.12 + 0.88 * (i / (steps.length - 1))).toFixed(2)}"></div>`).join("")}</div>`;
};
// Sound is shown as a loudness shape over the clip: soft, steady, punchy or building.
const ENERGY = {
  soft: (x) => 0.25 + 0.15 * Math.sin(x * 9),
  steady: (x) => 0.5 + 0.12 * Math.sin(x * 23),
  punchy: (x) => (Math.sin(x * 40) > 0.55 ? 0.95 : 0.3 + 0.1 * Math.sin(x * 13)),
  build: (x) => 0.15 + 0.8 * x + 0.06 * Math.sin(x * 31),
};
const soundWave = (energy) => {
  const f = ENERGY[energy] || ENERGY.steady;
  return `<div class="wave">${Array.from({ length: 40 }, (_, i) => `<i style="height:${Math.round(Math.min(1, Math.max(0.06, f(i / 39))) * 130)}px"></i>`).join("")}</div>`;
};

// tune.json: { headline, sub, price, cta,
//   color:[{label,desc,bg,ink,accent,secondary}], type:[{label,desc,display,body}],
//   motion:[{label,desc,ease: smooth|bounce|snap|float|spring}], sound:[{label,desc,energy: soft|steady|punchy|build}] }
// Option 1 of each list is the recommendation.
const tuneBoards = () => {
  const data = readJson(opt("file") || path.join(project, "boards", "tune.json"));
  const text = { headline: data.headline || "ชื่อแบรนด์ของคุณ", sub: data.sub || "", price: data.price || "", cta: data.cta || "ดูเพิ่ม" };
  const base = (data.color || [])[0] || { bg: "#ffffff", ink: "#1d1d1f", accent: "#1d1d1f", secondary: "#e5e2dc" };
  const firstType = (data.type || [])[0];
  const baseDisplay = fontOf(firstType?.display, 800);
  const baseBody = fontOf(firstType?.body, 400);
  const phone = (c, display, body) => `<div class="phone" style="background:${esc(c.bg)};color:${esc(c.ink)}">
<div class="h" style="font-family:'${esc(display.family)}';font-weight:${display.weight}">${esc(text.headline)}</div>
${text.sub ? `<div class="s" style="font-family:'${esc(body.family)}';font-weight:${body.weight}">${esc(text.sub)}</div>` : ""}
${text.price ? `<div class="price" style="font-family:'${esc(display.family)}';font-weight:900;color:${esc(c.accent)}">${esc(text.price)}</div>` : ""}
<div class="cta" style="background:${esc(c.accent)};color:${esc(c.bg)};font-family:'${esc(body.family)}'">${esc(text.cta)}</div>
<div style="height:8px;border-radius:4px;background:${esc(c.secondary || c.accent)}"></div></div>`;
  const words = (o) => `<div class="label">${esc(o.label)}</div><div class="desc">${esc(o.desc)}</div>`;
  const parts = {
    color: {
      height: 900,
      families: [baseDisplay.family, baseBody.family],
      render: (c) => `${phone(c, baseDisplay, baseBody)}<div class="sw">${["bg", "ink", "accent", "secondary"].filter((k) => c[k]).map((k) => `<i style="background:${esc(c[k])}"></i>`).join("")}</div>${words(c)}`,
    },
    type: {
      height: 860,
      families: (data.type || []).flatMap((t) => [fontOf(t.display).family, fontOf(t.body).family]),
      render: (t) => `${phone(base, fontOf(t.display, 800), fontOf(t.body, 400))}${words(t)}`,
    },
    motion: { height: 560, families: [], render: (m) => `${motionStage(m.ease)}<div class="desc">ภาพจางคือตำแหน่งก่อนหน้า ระยะห่างบอกความเร็ว เส้นประคือจุดหยุด</div>${words(m)}` },
    sound: { height: 540, families: [], render: (s) => `${soundWave(s.energy)}<div class="desc">ความสูงคือความดังตลอดคลิป</div>${words(s)}` },
  };
  return Object.entries(parts).filter(([key]) => (data[key] || []).length).map(([key, part]) => ({
    name: `tune-${key}`,
    cards: data[key].map((o, i) => `${LETTERS[i]}=${o.label}`),
    height: part.height,
    html: (h) => canvas(TUNE[key].ask, LOOK_NOTE, row(data[key].map((o, i) => card(i, i === 0, part.render(o)))), h, part.families),
  }));
};

const storyboardBoards = () => {
  const sb = readJson(opt("file") || path.join(project, "storyboard.json"));
  const beats = sb.beats || [];
  if (!beats.length) fail("storyboard has no beats");
  const fw = Number(sb.project?.format?.width) || 1080;
  const fh = Number(sb.project?.format?.height) || 1920;
  const c = { bg: "#ffffff", ink: "#1d1d1f", accent: "#1d1d1f", ...(sb.brand?.colors || {}) };
  const display = fontOf(sb.brand?.fonts?.display, 800);
  const body = fontOf(sb.brand?.fonts?.body, 400);
  const frame = (b, i) => `<div><div class="frame" style="aspect-ratio:${fw}/${fh};background:${esc(c.bg)};color:${esc(c.ink)}">
${b.headline ? `<div style="font-family:'${esc(display.family)}';font-weight:${display.weight};font-size:26px;line-height:1.15">${esc(b.headline)}</div>` : ""}
${b.subtext ? `<div style="font-family:'${esc(body.family)}';font-size:15px">${esc(b.subtext)}</div>` : ""}
<div class="vis">${esc(b.visual)}</div></div>
<div class="meta"><b>${i + 1}. ${esc(b.startSec)}–${esc(b.endSec)} วิ</b> ${esc(b.purpose)}${b.cameraMove ? `<br>กล้อง: ${esc(b.cameraMove)}` : ""}${b.voLine ? `<br>เสียงพูด: ${esc(b.voLine)}` : ""}${b.sfx ? `<br>เสียงประกอบ: ${esc(b.sfx)}` : ""}</div></div>`;
  const total = beats.at(-1)?.endSec;
  // Five frames a row; the row height follows the video format so landscape boards are not mostly empty.
  const frameH = ((W - 96 - 4 * 22) / 5) * (fh / fw);
  const rows = Math.ceil(beats.length / 5);
  return [{
    name: "storyboard",
    cards: [`${beats.length} beats`],
    height: Math.round(200 + rows * (frameH + 220)),
    html: (h) => canvas(sb.project?.title || "สตอรี่บอร์ด", `${beats.length} ฉาก${total ? ` ยาว ${total} วินาที` : ""} อ่านจากซ้ายไปขวา`, `<div class="warn">ภาพร่างลำดับฉาก ยังไม่ใช่ภาพจริง กรอบเส้นประคือภาพที่จะใส่</div><div class="strip">${beats.map(frame).join("")}</div>`, h, [display.family, body.family]),
  }];
};

const chrome = () => [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((file) => file && existsSync(file));

const builders = { style: styleBoards, tune: tuneBoards, storyboard: storyboardBoards };
if (!builders[kind]) fail("usage: board.mjs style [group] [offset] | tune | storyboard --project <dir> [--file <json>] [--pick <id>]");
const boards = builders[kind]();
const dir = path.join(project, "boards");
mkdirSync(dir, { recursive: true });
const browser = chrome();
const images = [];
const pages = [];
for (const board of boards) {
  const html = path.join(dir, `${board.name}.html`);
  writeFileSync(html, board.html(board.height));
  pages.push(html);
  console.log(`CARDS ${board.name}: ${board.cards.join(" ")}`);
  if (!browser) continue;
  const png = path.join(dir, `${board.name}.png`);
  try {
    // virtual-time-budget lets the web fonts and poster images arrive before the picture is taken
    execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--virtual-time-budget=15000",
      `--window-size=${W},${board.height}`, `--screenshot=${png}`, pathToFileURL(html).href], { stdio: "ignore", timeout: 60000 });
    if (existsSync(png)) images.push(png);
  } catch {}
}
for (const png of images) console.log(`IMAGE ${png}`);
const then = kind === "storyboard" ? "then show the package summary and wait for a yes" : "then ask the popup and start each option label with its card letter";
if (images.length === boards.length) {
  console.log(`SHOW send every IMAGE into the chat as a picture (Claude desktop: SendUserFile display render; otherwise attach the file). Do not open or read the images yourself; ${then}`);
} else {
  const opener = { darwin: "open", linux: "xdg-open" }[process.platform];
  let opened = false;
  if (opener) {
    try {
      execFileSync(opener, pages, { stdio: "ignore" });
      opened = true;
    } catch {}
  }
  console.log(`${opened ? "OPENED" : "SHOW open"} ${pages.join(" ")} for the user (no Chrome for pictures), ${then}`);
}
