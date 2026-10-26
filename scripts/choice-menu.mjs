#!/usr/bin/env node
// Prints one page of real library ids. Interview popups copy these lines and never invent an id.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const has = (rel) => existsSync(path.join(ROOT, rel));
const read = (rel) => (has(rel) ? readFileSync(path.join(ROOT, rel), "utf8") : "");

// The edition comes from the files that shipped, so one script serves every tier.
// elite: style demos exist (DEV, ELITE). pro: style prompts exist. free: scene templates only.
export const edition = () => {
  if (demoIds().length) return "elite";
  if (styleFileIds().length) return "pro";
  return "free";
};
export const lookKeys = () => (edition() === "free" ? ["scene"] : ["scene", "style", "recipe", "technique", "layout"]);

const STYLE_GROUPS = [
  ["paper", "มีคนนั่งตัดกระดาษหรือแปะสติกเกอร์ด้วยมือ", {
    "06-collage": "มีคนตัดรูปจากหนังสือพิมพ์มาแปะ ชิ้นรูปขยับกระตุกนิดๆ",
    "19-paperclip": "รูปจริงถูกตัดเป็นสติกเกอร์ขอบขาว แล้วภาพเลื่อนไปดูทีละจุดบนผืนเดียวกัน",
    "05-cel-boil": "เส้นวาดด้วยมือและสั่นนิดๆ เหมือนการ์ตูนที่ยังมีชีวิต",
  }],
  ["flat", "รูปแบนสีทึบ หรือเส้นดินสอที่ค่อยๆ วาดเอง", {
    "02-line-art": "เส้นเส้นเดียวค่อยๆ วาดทั้งเรื่องเอง พื้นว่างเยอะ อ่านง่าย",
    "01-flat-vector": "รูปแบนสีทึบ ไม่มีเงา ไม่มีแสงฟุ้ง เหมือนสติกเกอร์สีพื้น",
    "09-bauhaus": "วงกลม สามเหลี่ยม และสี่เหลี่ยมขยับเป็นจังหวะเหมือนโปสเตอร์",
  }],
  ["world", "เป็นเมืองของเล่น หรือของที่วางอยู่จริงมีแสงและเงา", {
    "03-isometric": "คุณมองเมืองของเล่นจากมุมสูง แล้วบ้านค่อยๆ งอกขึ้นทีละหลัง",
    "04-3d-render": "ของชิ้นนั้นวางอยู่จริง มีแสงนุ่มและเงา ให้รู้สึกว่าหยิบได้",
    "22-hud": "คุณมองจอเครื่อง มีกรอบและตัวเลขวิ่ง แล้วหยุดที่ค่าจริง",
  }],
];

const GLOW_GROUPS = [
  ["glow-flow", "ของไหลมาชนกัน หรือรูปหนึ่งกลายเป็นอีกรูป", {
    "07-liquid": "ของเหลวหนืดไหลมาชนกัน แล้วกลายเป็นรูปใหม่",
    "08-morph": "รูปหนึ่งค่อยๆ กลายเป็นอีกรูป โดยภาพไม่กระโดดตัด",
  }],
  ["glow-retro", "แสงฟุ้ง เกมยุคก่อน หรือจุดสี่เหลี่ยมแบบเกมเก่า", {
    "12-aurora-glass": "แสงสีฟุ้งช้าๆ อยู่หลังกระจกฝ้า",
    "10-synthwave": "ท้องฟ้าแบบเกมยุคก่อน มีเส้นตารางเรืองแสง",
    "20-pixel": "ทุกอย่างเป็นจุดสี่เหลี่ยมแบบเกมสมัยก่อน",
  }],
  ["glow-caption", "ตัวหนังสือเด้งขึ้นมาก่อน แล้วมีสติกเกอร์อารมณ์แปะข้างประโยค", {
    "18-hanazi": "ตัวหนังสือเด้งขึ้นมาให้หยุดอ่าน แล้วมีสติกเกอร์อารมณ์แปะข้างประโยค",
  }],
];

const SHOT_GROUPS = [
  ["walk", "ภาพพาคุณเดินดูของทีละจุด ไม่ได้กระโดดข้าม", ["camera"]],
  ["type", "ตัวหนังสือหรือของค่อยๆ เข้ามา จนคุณอ่านทัน", ["typography", "ui-entrance"]],
  ["join", "ตอนเริ่ม ตอนจบ หรือตอนเปลี่ยนเรื่อง ตายังตามเรื่องทัน", ["opening", "outro", "transition"]],
  ["proof", "มีตัวเลข แสง หรือการกดปุ่ม แล้วเห็นผลจนเชื่อ", ["data", "effects", "rhythm", "interaction"]],
];

const SCENE_SAY = {
  product: "เพื่อนเลื่อนดูคลิปแล้วต้องหยุด เพราะเห็นของชัดๆ ก่อนจะรู้ราคา แล้วค่อยตัดสินใจซื้อ",
  restaurant: "คนหิวเลื่อนผ่านตอนดึก เห็นอาหารใกล้จนอยากเดินไปร้านหรือกดสั่ง",
  "real-estate": "คนหาที่อยู่ เห็นห้องทีละมุม จนพอจะทักไปขอนัดดูของจริง",
  affiliate: "รีวิวของที่ใช้จริง ให้คนดูอยากซื้อตาม",
  "launch-video": "เปิดตัวของใหม่ ให้คนเห็นว่ามันช่วยแก้ปัญหาอะไร",
  "online-course": "ขายคอร์ส ให้คนเห็นว่าเรียนแล้วได้อะไร",
};

const SHOT_SECTION_SAY = {
  camera: "ภาพพาคุณเดินดูของทีละจุด",
  data: "ตัวเลขหรือกราฟขยับ ให้เห็นว่าอะไรเปลี่ยนไป",
  effects: "มีแสงหรือจังหวะกระแทก จนต้องเงยหน้าดู",
  interaction: "มีคนเอื้อมไปกดใช้ของจริง แล้วหน้าจอตอบกลับ",
  opening: "ภาพแรกทำให้นิ้วหยุดเลื่อน",
  outro: "ภาพท้ายทำให้รู้ว่าควรทำอะไรต่อ",
  rhythm: "จังหวะเร็วบ้างช้าบ้าง จนไม่รู้สึกว่าถูกเร่งทั้งเรื่อง",
  transition: "เรื่องเปลี่ยนไปอีกช่วง แต่ตายังรู้ว่ามันคือเรื่องเดิม",
  typography: "ตัวหนังสือขยับ จนอ่านรู้เรื่องโดยไม่ต้องเพ่ง",
  "ui-entrance": "ของบนหน้าจอค่อยๆ โผล่เข้ามาทีละชิ้น",
};

const PAIR = {
  camera: "camera",
  data: "data",
  effects: "light",
  interaction: "product",
  opening: "hooks",
  outro: "logo",
  rhythm: "pacing",
  transition: "transitions",
  typography: "text",
  "ui-entrance": "entrances",
};

const TECHNIQUE_KEY = [
  ["hooks", "ตัวเปิด"],
  ["entrances", "การเข้าเฟรม"],
  ["camera", "กล้อง"],
  ["text", "ตัวอักษร"],
  ["transitions", "ทรานซิชัน"],
  ["data", "ข้อมูลและตัวเลข"],
  ["product", "สาธิตสินค้า"],
  ["logo", "โลโก้และฉากจบ"],
  ["depth", "ความลึกและ 3D"],
  ["light", "แสง สี และผิวสัมผัส"],
  ["pacing", "จังหวะและโครงสร้าง"],
  ["layout", "เลย์เอาต์"],
];

const SWAP = [
  [/แบบ\s*A/g, "แบบแรก"],
  [/แบบ\s*B/g, "แบบถัดไป"],
  [/แบบ\s*C/g, "อีกแบบ"],
  [/คนละตำแหน่ง\/มุม\/ระยะ/g, "คนละที่"],
  [/ทั้งหน้าแบบมุมสูง/g, "ทั้งหน้าจากข้างบน"],
  [/baseline|เบสไลน์/gi, "เส้นบรรทัด"],
  [/หน้า\s*UI|ตัว\s*UI|\bUI\b|อินเทอร์เฟซ|interface/gi, "หน้าจอ"],
  [/3\s*มิติ|สามมิติ|\b3D\b/gi, "มีความลึก"],
  [/ฮาล์ฟโทน|halftone/gi, "จุดสิ่งพิมพ์"],
  [/เมตาบอล|metaball/gi, "ก้อนเหลว"],
  [/พารัลแลกซ์|parallax/gi, "ชั้นหน้ากับชั้นหลัง"],
  [/โมชันเบลอ|motion blur|\bblur\b/gi, "เบลอ"],
  [/perspective/gi, "มุมมอง"],
  [/opacity/gi, "ความจาง"],
  [/cubic-bezier\([^)]*\)|easing|spring/gi, ""],
  [/เคอร์เซอร์|cursor/gi, "ลูกศรเมาส์"],
  [/เทอร์มินัล|terminal/gi, "หน้าต่างพิมพ์คำสั่ง"],
  [/สกรีนช็อต|screenshot/gi, "ภาพหน้าจอ"],
  [/ไอคอน|icon/gi, "รูปเล็ก"],
  [/แคปชัน|caption/gi, "คำบรรยาย"],
  [/ป๊อปอัพ|popover|modal|โมดัล/gi, "หน้าต่างเล็ก"],
  [/แดชบอร์ด|dashboard/gi, "หน้าสรุป"],
  [/ฟีเจอร์/g, "จุดเด่น"],
  [/แบรนด์/g, "ร้าน"],
  [/โหมด/g, "แบบ"],
  [/วลี/g, "ประโยค"],
  [/กั๊กไว้/g, "เก็บไว้ทีหลัง"],
  [/แคลมป์/g, "ตัวหนีบ"],
  [/ล็อกอัป|lockup/gi, "ชื่อที่อยู่กับที่"],
  [/ล็อก/g, "ลงตัว"],
  [/ไทโปกราฟี|typography/gi, "ตัวหนังสือ"],
  [/เลย์เอาต์|layout/gi, "การจัดของในภาพ"],
  [/ทรานซิชัน|transition/gi, "ช่วงที่เรื่องเปลี่ยน"],
  [/ไอโซเมตริก|isometric/gi, "มุมสูงแบบเมืองของเล่น"],
  [/พิกเซล|pixel/gi, "จุดสี่เหลี่ยม"],
  [/เรดาร์|\bHUD\b|\bFUI\b/gi, "วงบนจอเครื่อง"],
  [/กริด/g, "ตาราง"],
  [/การ์ด/g, "แผ่น"],
  [/กล้อง/g, "ภาพ"],
  [/เฟรม/g, "ภาพ"],
  [/ช็อต/g, "ช่วง"],
  [/ซูมเข้าไป/g, "กระชากเข้าไปใกล้"],
  [/ซูม/g, "เข้าใกล้"],
  [/แพน/g, "เลื่อนดู"],
  [/สแลม|\bslam\b/gi, "กระแทก"],
  [/ฮีโร่|\bhero\b/gi, "ของชิ้นหลัก"],
  [/\bmacro\b/gi, "ภาพใกล้"],
  [/\borbit\b/gi, "หมุนรอบของ"],
  [/\bCTA\b/g, "การชวนให้ทำต่อ"],
  [/\bhook\b/gi, "จังหวะแรก"],
  [/\bfade\b/gi, "ค่อยๆ จาง"],
  [/องศา/g, "มุม"],
  [/วิป|\bwhip\b/gi, "สะบัด"],
  [/\bglyph\b|\bmask\b|\bshader\b|\bSVG\b/gi, ""],
  [/~?\d+(?:\.\d+)?\s*(?:px|fps|f|ms|วิ|ใบ|px)?/gi, ""],
  [/\([^)]*\)/g, ""],
];

const shorten = (text) => {
  if (text.length <= 120) return text;
  const cut = text.slice(0, 120);
  const marks = [" แล้ว", " และ", " จน", " เพราะ", " แต่", " "];
  let at = -1;
  for (const mark of marks) at = Math.max(at, cut.lastIndexOf(mark));
  return (at > 36 ? cut.slice(0, at) : cut).replace(/[,\s]+$/, "");
};

const say = (raw) => {
  let text = String(raw).split(/—|–|\sใช้กับ|\sใช้เมื่อ|\sเหมาะกับ/)[0];
  for (const [pattern, to] of SWAP) text = text.replace(pattern, to);
  text = text
    .replace(/[A-Za-z][A-Za-z0-9_./+-]*/g, "")
    .replace(/[()[\]{}~]/g, " ")
    .replace(/\s*[/,|]+\s*/g, " ")
    .replace(/(ไป){2,}/g, "ไป")
    .replace(/(เข้า){2,}/g, "เข้า")
    .replace(/(ภาพ){2,}/g, "ภาพ")
    .replace(/บน\s+เส้นบรรทัด\s+เดียว/g, "บนเส้นบรรทัดเดียว")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, "");
  if (text.length < 18) text = "ภาพขยับให้เรื่องเดินต่อ และยังดูออกว่าเรื่องเกี่ยวกับอะไร";
  return shorten(text);
};

const LEAK = /เฟรม|การ์ด|กล้อง|พิกเซล|ฮาล์ฟโทน|เมตาบอล|ไทโป|เลย์เอาต์|ทรานซิชัน|ช็อต|ซูม|สแลม|เบสไลน์|เรดาร์|กริด|องศา|ฟีเจอร์|แบรนด์|โหมด|วลี|px|fps|\bUI\b|\bCTA\b|hero|macro|orbit|3D|HUD|bezier|shader|opacity|parallax|perspective|easing|spring|blur|mask|glyph|pixel|layout|transition|isometric|affiliate|launch|scale|terminal|hook|fade|slam|frame|camera|card|[A-Za-z]{3,}/;

const styleMap = () => {
  const map = new Map();
  for (const [, , items] of [...STYLE_GROUPS, ...GLOW_GROUPS]) {
    for (const [id, label] of Object.entries(items)) map.set(id, label);
  }
  return map;
};

export const demoIds = () => {
  const dir = path.join(ROOT, "library", "extra-styles", "demos");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

export const styleFileIds = () => {
  const dir = path.join(ROOT, "references", "styles-mg15");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^\d{2}-[a-z0-9-]+\.md$/.test(name))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
};

// Ids the user may pick: demo folders when they shipped, otherwise style prompt files.
export const styleIds = () => (demoIds().length ? demoIds() : styleFileIds());
export const validStyle = (id) => styleIds().includes(id);

const sceneFiles = () => {
  const dir = path.join(ROOT, "templates", "scenes");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const id = name.replace(/\.md$/, "");
      return { id, sight: SCENE_SAY[id] || say("คลิปนี้มีงานแบบนี้อยู่ในคลัง") };
    });
};

export const validScene = (id) => sceneFiles().some((scene) => scene.id === id);

const shotSections = () => {
  const blocks = read("references/shot-recipes.md").split(/\n(?=## )/);
  return blocks.flatMap((block) => {
    const head = block.match(/^## .+?\(([a-z0-9-]+)\)/);
    if (!head) return [];
    const items = [];
    const parts = block.split(/\n(?=### )/);
    for (const part of parts) {
      const id = (part.match(/^### ([a-z0-9-]+)/) || [])[1];
      if (!id) continue;
      const sight = (part.match(/- หน้าตา:\s*(.+)/) || [])[1] || id;
      items.push({ id, sight: say(sight) });
    }
    return [{ id: head[1], items }];
  });
};

export const validRecipe = (id) => shotSections().some((section) => section.items.some((item) => item.id === id));

const techniqueSections = () => {
  const blocks = read("references/techniques.md").split(/\n(?=## )/);
  return blocks.flatMap((block) => {
    const heading = block.split("\n", 1)[0];
    const found = TECHNIQUE_KEY.find(([, marker]) => heading.includes(marker));
    if (!found) return [];
    const items = [...block.matchAll(/^- \*\*([a-z0-9-]+)\*\* — (.+)$/gm)].map((match) => ({
      id: match[1],
      sight: say((match[2].split(":").slice(1).join(":") || match[2]).trim()),
    }));
    return [{ id: found[0], items }];
  });
};

export const validTechnique = (id) => techniqueSections().some((section) => section.items.some((item) => item.id === id));

export const validLayout = (id) => {
  const layout = techniqueSections().find((section) => section.id === "layout");
  return Boolean(layout && layout.items.some((item) => item.id === id));
};

export const shelfUrls = () => {
  const urls = [...read("references/reference-shelf.md").matchAll(/https:\/\/[^\s)|]+/g)].map((match) => match[0]);
  return [...new Set(urls)];
};

export const shelfMedia = () => {
  const text = read("references/shelf-media.json");
  return text ? JSON.parse(text) : { styles: {}, recipes: {} };
};

export const styleVideo = (id) => (shelfMedia().styles[id] || {}).video || "";

const HARD = /นึกภาพว่า|อาการ|สำเนา|โคจร|ภายใน|ขณะ|ซึ่ง|ผ่าน|องค์ประกอบ|วัตถุ|หัวข้อ|มิติ|ความรู้สึกของ|เชิง|ช่องไฟ|ตัวอักษรหัว/;

export const lintText = (text) => {
  const problems = [];
  if (!text) return ["empty text"];
  if (text.length > 70) problems.push(`too long (${text.length} chars, keep under 70)`);
  const leak = text.match(LEAK);
  if (leak) problems.push(`design or English word: ${leak[0]}`);
  const hard = text.match(HARD);
  if (hard) problems.push(`hard or formal word: ${hard[0]}`);
  if ((text.match(/[,،、]| และ | แล้ว /g) || []).length > 2) problems.push("too many ideas in one line, keep one picture");
  return problems;
};

export const TUNE = {
  color: {
    ask: "อยากให้คลิปของคุณเป็นสีโทนไหน",
    base: /#[0-9a-f]{6}|palette|colou?r|色/i,
  },
  type: {
    ask: "อยากให้ตัวหนังสือในคลิปดูเป็นแบบไหน",
    base: /font|type|typograph|letter|word|text|字/i,
  },
  motion: {
    ask: "อยากให้ของในคลิปขยับเร็วหรือช้า",
    base: /^Rules:|ease|overshoot|stagger|squash|settle|缓动|节奏|视觉特征/i,
  },
  sound: {
    ask: "อยากให้คลิปมีเสียงแบบไหน",
    base: /^Sound:|BPM|whoosh|音/i,
  },
};

const tuneBase = (key, styleId) => {
  if (!styleId) return [];
  const text = read(`references/styles-mg15/${styleId}.md`);
  const seed = text.split(/^# /m).filter((part) => /^(Creative seed|Signature features)/.test(part)).join("\n");
  return seed.split("\n").map((line) => line.trim()).filter((line) => line && TUNE[key].base.test(line)).slice(0, 6);
};

const page = (items, offset) => {
  const start = Number(offset) || 0;
  const rest = items.slice(start);
  const more = rest.length > 4;
  return { slice: rest.slice(0, more ? 3 : 4), next: more ? start + (more ? 3 : 4) : null };
};

const printItems = (items, offset, ask, raw = false) => {
  if (ask) console.log(`ASK ${ask}`);
  if (raw) console.log("REWRITE each RAW line as a short everyday LABEL and DESC, then check both with lint; never show RAW as is");
  const shown = page(items, offset);
  for (const item of shown.slice) {
    console.log(`${raw ? "RAW" : "SAY"} ${item.sight}`);
    console.log(`ID ${item.id}`);
  }
  if (shown.next != null) console.log(`NEXT ${shown.next}`);
};

const print = (lines) => {
  for (const line of lines) console.log(line);
};

const main = () => {
  const [cmd, arg, offset] = process.argv.slice(2);
  if (cmd === "edition") {
    console.log(`EDITION ${edition()}`);
    console.log(`LOOK ${lookKeys().join(", ")}`);
    return;
  }
  const needsLibrary = ["styles", "shot-groups", "shot-group", "shots", "pair", "techniques", "shelf", "examples"];
  if (needsLibrary.includes(cmd) && edition() === "free") {
    console.error("MENU NONE: this edition has no style library; ask only the keys in ASK");
    process.exit(1);
  }
  if (cmd === "lint") {
    const text = process.argv.slice(3).join(" ").trim();
    const problems = lintText(text);
    console.log(problems.length ? `LINT FAIL: ${problems.join("; ")}` : "LINT OK");
    process.exit(problems.length ? 1 : 0);
  }
  if (cmd === "tune" && TUNE[arg]) {
    const styleId = offset && validStyle(offset) ? offset : "";
    console.log(`ASK ${TUNE[arg].ask}`);
    const base = tuneBase(arg, styleId);
    for (const line of base) console.log(`BASE ${line}`);
    if (styleId && demoIds().includes(styleId)) {
      const demo = `library/extra-styles/demos/${styleId}`;
      if (arg === "type") {
        const fonts = [...read(`${demo}/index.html`).matchAll(/fonts\.load\(["'][^"']*?'([^']+)'/g)].map((match) => match[1]);
        if (fonts.length) console.log(`BASE demo fonts: ${[...new Set(fonts)].join(", ")} (Latin or Chinese only)`);
      }
      console.log(`BASE_FILE ${demo}/${arg === "sound" ? "cues.json" : "index.html"}`);
    }
    if (!base.length && !demoIds().includes(styleId)) console.log("BASE none: build option 1 from the TASTE answers and the real logo file");
    if (arg === "type" && has("references/thai-layer.md")) console.log("BASE_THAI references/thai-layer.md: pick the Thai face here, matched to the option's voice");
    print([
      "BUILD 3 options. Option 1 is your pick: start from BASE, then bend it toward the user's own words and logo.",
      "BUILD option 2 leans closer to what the user said they love. Option 3 is a clear contrast, so the choice means something.",
      "LABEL 2-5 everyday Thai words, a thing a person can picture. Example: เขียวใบชากับครีม",
      "DESC one short sentence: what it looks or sounds like, then why it fits, using the user's own words.",
      "CHECK every LABEL and DESC with: node scripts/choice-menu.mjs lint \"<text>\"",
    ]);
    return;
  }
  if (cmd === "scenes") {
    printItems(sceneFiles(), offset, "คลิปนี้จะเน้นโชว์อะไร");
    return;
  }
  if (cmd === "styles" && !arg) {
    console.log("ASK ชอบภาพแบบไหนมากกว่ากัน");
    for (const [id, label] of STYLE_GROUPS) {
      console.log(`SAY ${label}`);
      console.log(`ID ${id}`);
    }
    console.log("SAY นึกภาพว่าเป็นของเหลว แสงฟุ้ง เกมเก่า หรือตัวหนังสือที่เด้งขึ้นมา");
    console.log("ID glow");
    const known = new Set(styleMap().keys());
    for (const id of styleIds()) if (!known.has(id)) {
      console.log("SAY นึกภาพว่าภาพนี้มีอยู่ในคลัง แต่ยังไม่มีคำอธิบายภาษาคน");
      console.log(`ID ${id}`);
    }
    return;
  }
  if (cmd === "styles" && arg === "glow") {
    console.log("ASK ชอบแบบไหนมากที่สุด");
    for (const [id, label] of GLOW_GROUPS) {
      console.log(`SAY ${label}`);
      console.log(`ID ${id}`);
    }
    return;
  }
  if (cmd === "styles" && arg) {
    const group = [...STYLE_GROUPS, ...GLOW_GROUPS].find(([id]) => id === arg);
    if (!group) {
      console.error(`unknown style group ${arg}`);
      process.exit(1);
    }
    const items = Object.entries(group[2]).filter(([id]) => validStyle(id)).map(([id, sight]) => ({ id, sight }));
    printItems(items, offset, "แบบไหนใกล้ที่คุณชอบที่สุด");
    return;
  }
  if (cmd === "shot-groups") {
    console.log("ASK อยากให้คลิปเล่าเรื่องแบบไหน");
    for (const [id, label] of SHOT_GROUPS) {
      console.log(`SAY ${label}`);
      console.log(`ID ${id}`);
    }
    return;
  }
  if (cmd === "shot-group" && arg) {
    const group = SHOT_GROUPS.find(([id]) => id === arg);
    if (!group) {
      console.error(`unknown shot group ${arg}`);
      process.exit(1);
    }
    printItems(
      group[2].map((id) => ({ id, sight: SHOT_SECTION_SAY[id] || say(id) })),
      offset,
      "ส่วนไหนสำคัญที่สุดในคลิปนี้",
    );
    return;
  }
  if (cmd === "shots" && arg) {
    const section = shotSections().find((item) => item.id === arg);
    if (!section) {
      console.error(`unknown shot section ${arg}`);
      process.exit(1);
    }
    printItems(section.items, offset, "อยากให้ช่วงเด่นของคลิปเป็นแบบไหน", true);
    return;
  }
  if (cmd === "pair" && arg) {
    const technique = PAIR[arg];
    if (!technique) {
      console.error(`unknown shot section ${arg}`);
      process.exit(1);
    }
    console.log(technique);
    return;
  }
  if (cmd === "techniques" && arg) {
    const section = techniqueSections().find((item) => item.id === arg);
    if (!section) {
      console.error(`unknown technique section ${arg}`);
      process.exit(1);
    }
    const ask = arg === "layout"
      ? "อยากให้สินค้ากับตัวหนังสืออยู่ตรงไหนบนจอ"
      : "อยากให้คนดูจำคลิปนี้ได้จากอะไร";
    printItems(section.items, offset, ask, true);
    return;
  }
  if (cmd === "shelf") {
    for (const url of shelfUrls()) console.log(url);
    return;
  }
  if (cmd === "examples") {
    const media = shelfMedia();
    const style = media.styles[arg];
    if (!style) {
      console.error(`EXAMPLES NONE: no example clip for style ${arg || "(missing)"}`);
      process.exit(1);
    }
    console.log(`STYLE_VIDEO ${style.video}`);
    console.log(`STYLE_POSTER ${style.poster}`);
    if (offset) {
      const clips = media.recipes[offset] || [];
      if (!clips.length) console.log(`RECIPE_VIDEO none for ${offset}`);
      for (const url of clips) console.log(`RECIPE_VIDEO ${url}`);
    }
    console.log("WATCH send these links to a small sub-agent; it builds a contact sheet with scripts/contact-sheet.sh and returns only the JSON in references/reference-shelf.md");
    console.log(`SHELF ${style.video}`);
    return;
  }
  if (cmd === "check") {
    if (edition() === "free") {
      const leaks = Object.values(SCENE_SAY).filter((text) => LEAK.test(text));
      if (leaks.length) {
        for (const leak of leaks) console.error(`LEAK ${leak}`);
        process.exit(1);
      }
      console.log(`MENU OK edition=free scenes=${sceneFiles().length}`);
      return;
    }
    const missing = styleIds().filter((id) => !styleMap().has(id));
    const shots = shotSections();
    const techniques = techniqueSections();
    const techniqueIds = new Set(techniques.map((section) => section.id));
    const tuneLeaks = Object.values(TUNE).filter((item) => LEAK.test(item.ask));
    if (tuneLeaks.length) {
      console.error(`TUNE LEAK: ${tuneLeaks.map((item) => item.ask).join(" | ")}`);
      process.exit(1);
    }
    const says = [
      ...Object.values(SCENE_SAY),
      ...STYLE_GROUPS.flatMap(([, label, items]) => [label, ...Object.values(items)]),
      ...GLOW_GROUPS.flatMap(([, label, items]) => [label, ...Object.values(items)]),
      ...SHOT_GROUPS.map(([, label]) => label),
      ...Object.values(SHOT_SECTION_SAY),
      ...shots.flatMap((section) => section.items.map((item) => item.sight)),
      ...techniques.flatMap((section) => section.items.map((item) => item.sight)),
    ];
    const leaks = says.filter((text) => LEAK.test(text));
    if (missing.length || shots.length !== 10 || techniqueIds.size !== 12 || leaks.length) {
      console.error(`MENU GAP styles=${missing.join(",") || "ok"} shots=${shots.length} techniques=${[...techniqueIds].join(",")}`);
      for (const leak of leaks.slice(0, 20)) console.error(`LEAK ${leak}`);
      process.exit(1);
    }
    console.log(`MENU OK edition=${edition()} styles=${styleMap().size} shots=${shots.reduce((sum, section) => sum + section.items.length, 0)} techniques=${techniques.reduce((sum, section) => sum + section.items.length, 0)} says=${says.length}`);
    return;
  }
  console.error("usage: edition | scenes | styles [group] | shot-groups | shot-group <id> | shots <section> [offset] | pair <section> | techniques <section> [offset] | shelf | examples <styleId> [recipeId] | check");
  process.exit(1);
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
