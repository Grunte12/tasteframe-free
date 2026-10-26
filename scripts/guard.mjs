#!/usr/bin/env node
// Tasteframe workflow guard. Exit 0 only when the requested phase is actually open.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validScene, validStyle, validRecipe, validTechnique, validLayout, styleVideo, edition, lookKeys, TUNE } from "./choice-menu.mjs";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = ["interview", "brief", "director", "confirm", "assets", "build", "qa", "render"];
const TUNE_KEYS = Object.keys(TUNE);
const ANSWERS = ["who", "purpose", "why", "lifestyle", "taste", "notMe", "scene", "style", "recipe", "technique", "layout", ...TUNE_KEYS];
const LOOK = { scene: validScene, style: validStyle, recipe: validRecipe, technique: validTechnique, layout: validLayout };
const EDITION = edition();
const LOOK_KEYS = lookKeys();
const REQUIRED = [...ANSWERS.filter((k) => !LOOK[k]), ...LOOK_KEYS];
const SOURCE_EXT = new Set([".html", ".htm", ".tsx", ".jsx", ".vue", ".css", ".mp4"]);

const blank = () => ({
  phase: "interview",
  packageStatus: "unconfirmed",
  answers: Object.fromEntries(ANSWERS.map((k) => [k, ""])),
  interviewConfirmed: false,
  briefConfirmed: false,
  styleId: "",
  shelfUrl: "",
  demoAttested: [],
  packageConfirmed: false,
  summaryShown: {},
  confirmations: {},
  tasteSet: "",
  newSet: false,
  assets: [],
});

const printHelp = () => {
  console.log(`usage: node scripts/guard.mjs <command> --project <absolute path of the user's work folder>
  init | recall                         start, then print EDITION, SETS or RECALL, ASK and ROUNDS
  use-set --name <set> | new-set [--name <set>]   pick a saved taste set, or start (and later name) a new one
  sets | forget-set --name <set>        list taste sets; delete one only when the user asks
  answer --key <key> --value <text>     record one answer; look keys take an ID from choice-menu
  reuse-look | drop-look                keep or drop the remembered look
  summary --stage <interview|brief|package>   run right after you show the user the summary
  confirm-interview | confirm-brief | confirm-package --user-said "<user's reply, copied exactly>"
                                        only after the user answers that summary with a yes
  set-direction --style <id> --shelf <SHELF from choice-menu examples>
  enter --phase <interview|brief|director|confirm|assets|build|qa|render>   prints REQUIRED_READ
  attest-demo --file <name>             after you open the style source file
  remember-asset --path <file> --note <text>   a real file for this job only
  check-write | check-shell | check-deliver`);
};
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : "";
};

const project = () => {
  const given = opt("project");
  if (given && !path.isAbsolute(given)) fail(`--project must be an absolute path to the user's work folder, got ${given}`);
  const dir = path.resolve(given || process.cwd());
  if (dir === SKILL_ROOT || dir.startsWith(SKILL_ROOT + path.sep)) fail("the project folder must be outside the skill folder; pass --project <absolute path of the user's work folder>");
  return dir;
};
const statePath = (dir) => path.join(dir, ".tasteframe-state.json");

const readState = (dir) => {
  const p = statePath(dir);
  if (!existsSync(p)) return null;
  const raw = JSON.parse(readFileSync(p, "utf8"));
  return { ...blank(), ...raw, answers: { ...blank().answers, ...(raw.answers || {}) } };
};
const writeState = (dir, state) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(statePath(dir), JSON.stringify(state, null, 2) + "\n");
};

// Taste sets: each named set keeps only how the user likes things to look and sound, never who the brand is or what a job said.
// The user picks a set (or starts a new one) at the start of every job, so one job never leaks into the next.
const TASTE_DIR = path.join(SKILL_ROOT, "portfolio", "tastes");
const OLD_DNA = path.join(SKILL_ROOT, "portfolio", "dna.md");
const IDENTITY_KEYS = ["who", "why", "lifestyle", "notMe"];
const TASTE_KEYS = ["taste", ...TUNE_KEYS];
const LOOK_FIELDS = ["scene", "styleId", "recipeId", "techniqueId", "layoutId", "shelf"];
const demoDir = (styleId) => path.join(SKILL_ROOT, "library", "extra-styles", "demos", styleId);
// What the build must copy from: the demo folder (elite), the style prompt (pro), or nothing (free).
const sourceDir = (styleId) => (EDITION === "elite" ? demoDir(styleId) : path.join(SKILL_ROOT, "references", "styles-mg15"));
const sourceReady = (styleId) => Boolean(styleId) && (EDITION === "elite" ? existsSync(demoDir(styleId)) : existsSync(path.join(sourceDir(styleId), `${styleId}.md`)));
const needsStyle = EDITION !== "free";

const section = (text, name) => {
  const match = text.match(new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return match ? match[1] : "";
};
const field = (block, key) => {
  const match = block.match(new RegExp(`^${key}: *(.*)$`, "m"));
  return match ? match[1].trim() : "";
};
const linesOf = (block) => block.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("- "));
const setName = (name) => String(name || "").replace(/[\\/:*?"<>|#\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
const setFile = (name) => path.join(TASTE_DIR, `${name}.md`);
const listSets = () => (existsSync(TASTE_DIR) ? readdirSync(TASTE_DIR).filter((file) => file.endsWith(".md")).map((file) => file.slice(0, -3)).sort() : []);
const parseSet = (name, text) => {
  // Old dna.md files kept taste under "ตัวตน" next to brand facts; only the taste keys are read from it.
  const tasteBlock = section(text, "รสนิยม") || section(text, "ตัวตน");
  const lookBlock = section(text, "ลุคปัจจุบัน");
  return {
    name,
    profile: Object.fromEntries(TASTE_KEYS.map((key) => [key, field(tasteBlock, key)])),
    look: Object.fromEntries(LOOK_FIELDS.map((key) => [key, field(lookBlock, key)])),
    likes: linesOf(section(text, "ชอบ")),
    dropped: linesOf(section(text, "ไม่เอาแล้ว")),
    shifts: linesOf(section(text, "การเปลี่ยนลุค")),
    // a job line keeps only the date and the look ids; what the clip said stays in that job's folder
    jobs: linesOf(section(text, "งาน")).map((line) => line.split(" | ").slice(0, 6).join(" | ")),
  };
};
const readSet = (name) => parseSet(name, name && existsSync(setFile(name)) ? readFileSync(setFile(name), "utf8") : "");
const block = (lines) => (lines.length ? `${lines.join("\n")}\n` : "");
const writeSet = (set) => {
  if (!set.name) return;
  const taste = TASTE_KEYS.map((key) => `${key}: ${set.profile[key] || ""}`).join("\n");
  const look = LOOK_FIELDS.map((key) => `${key}: ${set.look[key] || ""}`).join("\n");
  const body = `# ชุดรสนิยม: ${set.name}

ตัวตรวจเป็นคนเขียนไฟล์นี้เท่านั้น เอเจนต์ใช้คำสั่ง recall ห้ามเปิดไฟล์นี้เอง
เก็บแค่รสนิยมเรื่องภาพ เสียง และจังหวะ ไม่เก็บข้อมูลแบรนด์หรือเนื้อหาของงาน

## รสนิยม

${taste}

## ลุคปัจจุบัน

${look}

## ชอบ

${block(set.likes)}
## ไม่เอาแล้ว

${block(set.dropped)}
## การเปลี่ยนลุค

${block(set.shifts)}
## งาน

${block(set.jobs)}`;
  mkdirSync(TASTE_DIR, { recursive: true });
  writeFileSync(setFile(set.name), body);
};
// A skill folder from before taste sets has one dna.md; its taste becomes the set "ชุดเดิม" and the file is renamed, not read again.
const migrateOldDna = () => {
  if (!existsSync(OLD_DNA) || listSets().length) return;
  const old = parseSet("ชุดเดิม", readFileSync(OLD_DNA, "utf8"));
  if (TASTE_KEYS.some((key) => realWords(old.profile[key])) || old.look.styleId) {
    writeSet(old);
    console.log("MIGRATED: the old memory is now the taste set ชุดเดิม; brand facts and job text were left in portfolio/dna-old.md");
  }
  renameSync(OLD_DNA, path.join(path.dirname(OLD_DNA), "dna-old.md"));
};
const realWords = (value) => String(value || "").trim().length >= 4;
const lookReady = (answers) => LOOK_KEYS.every((key) => String(answers?.[key] || "").trim());
const chosen = (state) => Boolean(state.tasteSet) || state.newSet === true;
// a saved look counts only while its style is still in the library and was not dropped
const lookKept = (set) => Boolean(set.look.styleId) && needsStyle && validStyle(set.look.styleId) && !set.dropped.includes(`- style ${set.look.styleId}`);
// Fill this job's empty taste answers from the chosen set; brand and purpose are always asked again.
const recallInto = (state) => {
  migrateOldDna();
  const set = readSet(state.tasteSet);
  const ask = [];
  if (!chosen(state)) {
    if (listSets().length) return { set, ask: ["set"] };
    state.newSet = true;
  }
  for (const key of TASTE_KEYS) {
    if (!String(state.answers[key] || "").trim() && realWords(set.profile[key])) state.answers[key] = set.profile[key];
  }
  for (const key of [...IDENTITY_KEYS, "taste", "purpose", "scene"]) {
    if (!String(state.answers[key] || "").trim()) ask.push(key);
  }
  if (lookKept(set)) {
    if (!lookReady(state.answers)) ask.push("look");
  } else {
    for (const key of LOOK_KEYS) {
      if (key !== "scene" && !String(state.answers[key] || "").trim()) ask.push(key);
    }
  }
  for (const key of TUNE_KEYS) {
    if (!String(state.answers[key] || "").trim()) ask.push(key);
  }
  if (state.newSet && !state.tasteSet) ask.push("set-name");
  return { set, ask };
};
const printRecall = (state, set, ask) => {
  console.log(`EDITION: ${EDITION}`);
  if (ask[0] === "set") {
    console.log("SETS:");
    for (const name of listSets()) {
      const saved = readSet(name);
      console.log(`- ${name} | ${saved.profile.taste || "-"} | ${saved.jobs.length} jobs${saved.jobs.length ? `, last ${saved.jobs.at(-1).slice(2, 12)}` : ""}`);
    }
    console.log("ASK: set");
    console.log("ROUNDS: 0 set: ask first which taste set to use, one option per set plus «สร้างชุดใหม่»; then run use-set --name <set> or new-set, and recall again");
    return;
  }
  console.log(`SET: ${state.tasteSet || "(new, not named yet)"}`);
  console.log("RECALL:");
  for (const key of TASTE_KEYS) {
    if (set.profile[key]) console.log(`- keep ${key}: ${set.profile[key]}`);
  }
  if (lookKept(set)) {
    console.log(`- keep look: scene ${set.look.scene} | style ${set.look.styleId} | recipe ${set.look.recipeId} | technique ${set.look.techniqueId} | layout ${set.look.layoutId}`);
  }
  if (set.dropped.length) console.log(`- dropped: ${set.dropped.join(", ").replaceAll("- ", "")}`);
  if (set.shifts.length) console.log(`- last shift: ${set.shifts.at(-1).replace(/^- /, "")}`);
  const styles = set.likes.filter((line) => line.startsWith("- style ")).slice(-8);
  if (styles.length) console.log(`- likes: ${styles.join(", ").replaceAll("- ", "")}`);
  const recent = set.jobs.slice(-3);
  if (recent.length) {
    console.log("RECENT LOOKS:");
    for (const job of recent) console.log(job);
  }
  console.log(ask.length ? `ASK: ${ask.join(", ")}` : "ASK: none");
  const rounds = [
    ["1 identity", ask.filter((key) => IDENTITY_KEYS.includes(key) || key === "taste" || key === "purpose")],
    ["2 look", ask.filter((key) => key === "look" || LOOK_KEYS.includes(key))],
    ["3 tune", ask.filter((key) => TUNE_KEYS.includes(key))],
  ].filter(([, keys]) => keys.length);
  if (rounds.length) console.log(`ROUNDS: ${rounds.map(([name, keys]) => `${name}: ${keys.join(" ")}`).join(" | ")}`);
  if (ask.some((key) => TUNE_KEYS.includes(key))) console.log("TUNE: after the look is locked, run `node scripts/choice-menu.mjs tune <key>` for each tune key");
  if (ask.includes("set-name")) console.log("SET-NAME: before the interview summary, suggest a short name from the user's taste words, put it in the summary, and run new-set --name <name>");
};
// Switching or starting a set clears what the previous set filled in, so nothing from it stays in this job.
const clearTaste = (state) => {
  for (const key of [...TASTE_KEYS, "style", "recipe", "technique", "layout"]) state.answers[key] = "";
  state.styleId = "";
};
const rememberTaste = (state) => {
  const set = readSet(state.tasteSet);
  for (const key of TASTE_KEYS) set.profile[key] = state.answers[key];
  writeSet(set);
};
const likeLine = (kind, id) => `- ${kind} ${id}`;
const rememberJob = (state) => {
  const set = readSet(state.tasteSet);
  for (const key of TASTE_KEYS) set.profile[key] = state.answers[key];
  const next = {
    scene: state.answers.scene,
    styleId: state.styleId,
    recipeId: state.answers.recipe,
    techniqueId: state.answers.technique,
    layoutId: state.answers.layout,
    shelf: state.shelfUrl,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  for (const key of ["scene", "styleId", "recipeId", "techniqueId", "layoutId"]) {
    const before = set.look[key];
    if (before && next[key] && before !== next[key]) set.shifts.push(`- ${stamp} | ${key} | ${before} → ${next[key]}`);
  }
  set.look = next;
  for (const [kind, id] of [["scene", next.scene], ["style", next.styleId], ["recipe", next.recipeId], ["technique", next.techniqueId], ["layout", next.layoutId]]) {
    const line = likeLine(kind, id);
    if (!id) continue;
    if (!set.likes.includes(line)) set.likes.push(line);
    set.dropped = set.dropped.filter((item) => item !== line);
  }
  set.jobs.push(`- ${stamp} | ${next.scene} | ${next.styleId} | ${next.recipeId} | ${next.techniqueId} | ${next.layoutId}`);
  writeSet(set);
};
const fail = (msg) => {
  console.error(`GUARD DENY: ${msg}`);
  process.exit(1);
};
const ok = (msg) => {
  console.log(`GUARD OK: ${msg}`);
};

const SKIP_ONLY = /ทำเลย|ไม่ต้องถาม|ไม่อยากตอบ|ถามเยอะ|แล้วแต่|just do it|skip/i;
const NO = /ไม่ใช่|ไม่ถูก|ไม่โอเค|ไม่ผ่าน|ไม่เอา|(?<!ไม่ต้อง)แก้|\bno\b/i;
const YES = /ยืนยัน|ใช่|โอเค|ตกลง|ถูกต้อง|ถูกแล้ว|ได้เลย|ผ่าน|เอาตามนี้|ok|yes|confirm/i;
// A yes must answer a summary the user saw; a request to skip questions is not a yes.
const confirmGate = (s, stage) => {
  const said = opt("user-said").trim();
  if (!s.summaryShown?.[stage]) fail(`show the ${stage} summary to the user, run summary --stage ${stage}, then wait for their reply`);
  if (said.length < 2) fail(`confirm needs --user-said with the user's reply to the ${stage} summary, copied exactly`);
  if (NO.test(said)) fail(`"${said}" asks for a change; make it, show the ${stage} summary again, and wait for a yes`);
  if (SKIP_ONLY.test(said) && !YES.test(said)) fail(`"${said}" asks to skip questions; it is not a yes to the ${stage} summary. Show the summary and ask for a yes`);
  s.confirmations = { ...(s.confirmations || {}), [stage]: { said, at: new Date().toISOString() } };
};

const answersReady = (s) => REQUIRED.every((k) => String(s.answers?.[k] || "").trim().length > 0);
const demoReady = (s) => {
  if (!needsStyle) return true;
  if (!sourceReady(s.styleId)) return false;
  if (!Array.isArray(s.demoAttested) || s.demoAttested.length === 0) return false;
  return s.demoAttested.every((rel) => existsSync(path.join(sourceDir(s.styleId), rel)));
};
const directionReady = (s) => !needsStyle || (sourceReady(s.styleId) && /^https:\/\//.test(s.shelfUrl || ""));

const prereq = {
  interview: () => true,
  brief: (s) => answersReady(s) && s.interviewConfirmed,
  director: (s) => prereq.brief(s) && s.briefConfirmed,
  confirm: (s) => prereq.director(s) && directionReady(s),
  assets: (s) => prereq.confirm(s) && s.packageConfirmed,
  build: (s) => prereq.assets(s) && demoReady(s),
  qa: (s) => prereq.build(s),
  render: (s) => prereq.qa(s),
};

const reason = (phase, s) => {
  if (phase === "brief" && !answersReady(s)) return "interview answers are incomplete";
  if (phase === "brief" && !s.interviewConfirmed) return "interview was not confirmed";
  if (phase === "director" && !s.briefConfirmed) return "brief was not confirmed";
  if (phase === "confirm" && needsStyle && !s.styleId) return "direction has no styleId";
  if (phase === "confirm" && needsStyle && !sourceReady(s.styleId)) return `style source missing for ${s.styleId}`;
  if (phase === "confirm" && needsStyle && !/^https:\/\//.test(s.shelfUrl || "")) return "direction has no https shelf URL";
  if ((phase === "assets" || phase === "build" || phase === "qa" || phase === "render") && !s.packageConfirmed) return "packageStatus is not confirmed";
  if ((phase === "build" || phase === "qa" || phase === "render") && !demoReady(s)) return "style source files were not attested";
  return `phase ${phase} is not open`;
};

if (cmd === "init") {
  const dir = project();
  mkdirSync(dir, { recursive: true });
  const state = readState(dir) || blank();
  const { set, ask } = recallInto(state);
  writeState(dir, state);
  ok(`interview open at ${dir}`);
  printRecall(state, set, ask);
} else if (cmd === "recall") {
  const dir = project();
  const state = readState(dir) || blank();
  const { set, ask } = recallInto(state);
  if (readState(dir)) writeState(dir, state);
  ok("recall");
  printRecall(state, set, ask);
} else if (cmd === "sets") {
  migrateOldDna();
  ok("taste sets");
  for (const name of listSets()) console.log(`- ${name} | ${readSet(name).profile.taste || "-"}`);
} else if (cmd === "use-set" || cmd === "new-set") {
  const dir = project();
  const s = readState(dir) || fail("no state; run init");
  if (s.phase !== "interview") fail("a taste set is chosen only during interview");
  const name = setName(opt("name"));
  if (cmd === "use-set") {
    if (!listSets().includes(name)) fail(`no taste set ${name}; sets: ${listSets().join(", ") || "none"}`);
    if (s.tasteSet !== name) clearTaste(s);
    s.tasteSet = name;
    s.newSet = false;
  } else {
    if (opt("name") && name.length < 2) fail("the set name needs real words");
    if (name && listSets().includes(name) && name !== s.tasteSet) fail(`a taste set named ${name} already exists; pick another name or use-set it`);
    if (!s.newSet) clearTaste(s);
    s.newSet = true;
    s.tasteSet = name;
  }
  s.summaryShown = { ...(s.summaryShown || {}), interview: false };
  const { set, ask } = recallInto(s);
  writeState(dir, s);
  ok(s.tasteSet ? `taste set ${s.tasteSet}` : "new taste set; name it before the interview summary");
  printRecall(s, set, ask);
} else if (cmd === "forget-set") {
  const name = setName(opt("name"));
  if (!listSets().includes(name)) fail(`no taste set ${name}`);
  if (!/ลบ|forget|delete|remove/i.test(opt("user-said"))) fail(`forget-set needs --user-said with the user's own request to delete ${name}`);
  rmSync(setFile(name));
  ok(`taste set ${name} deleted`);
} else if (cmd === "answer") {
  const dir = project();
  const key = opt("key");
  const value = opt("value");
  if (!REQUIRED.includes(key) || !value.trim()) fail(`answer requires --key {${REQUIRED.join("|")}} and --value`);
  if (LOOK[key] && !LOOK[key](value.trim())) fail(`${value.trim()} is not a real ${key} id`);
  if (!LOOK[key] && !realWords(value)) fail(`${key} needs the user's own words or your recommendation in words, not a placeholder`);
  const s = readState(dir) || blank();
  if (s.phase !== "interview") fail("answers are only recorded during interview");
  if (!chosen(s)) fail("ask which taste set to use first; run use-set or new-set");
  s.answers[key] = value.trim();
  if (key === "style") s.styleId = value.trim();
  s.summaryShown = { ...(s.summaryShown || {}), interview: false };
  const set = readSet(s.tasteSet);
  const dropped = likeLine(key, value.trim());
  if (set.dropped.includes(dropped)) {
    set.dropped = set.dropped.filter((item) => item !== dropped);
    writeSet(set);
  }
  writeState(dir, s);
  ok(`recorded ${key}`);
} else if (cmd === "reuse-look") {
  const dir = project();
  const s = readState(dir) || fail("no state; run init");
  if (s.phase !== "interview") fail("a saved look can be reused only during interview");
  if (!needsStyle) fail(`edition ${EDITION} has no saved looks; answer scene instead`);
  const set = readSet(s.tasteSet);
  if (!set.look.styleId) fail("this taste set has no saved look");
  if (set.dropped.includes(likeLine("style", set.look.styleId))) fail("that style was dropped");
  const copy = { scene: set.look.scene, style: set.look.styleId, recipe: set.look.recipeId, technique: set.look.techniqueId, layout: set.look.layoutId };
  for (const [key, value] of Object.entries(copy)) {
    if (!value || !LOOK[key](value)) fail(`saved ${key} is no longer in the library`);
    if (!s.answers.scene || key !== "scene") s.answers[key] = value;
  }
  s.styleId = set.look.styleId;
  writeState(dir, s);
  ok("reused the saved look");
} else if (cmd === "drop-look") {
  const dir = project();
  const s = readState(dir) || fail("no state; run init");
  if (s.phase !== "interview") fail("a look can be dropped only during interview");
  const set = readSet(s.tasteSet);
  if (!set.look.styleId) fail("this taste set has no look to drop");
  for (const [kind, id] of [["style", set.look.styleId], ["recipe", set.look.recipeId], ["technique", set.look.techniqueId], ["layout", set.look.layoutId]]) {
    const line = likeLine(kind, id);
    if (id && !set.dropped.includes(line)) set.dropped.push(line);
    set.likes = set.likes.filter((item) => item !== line);
  }
  set.look = Object.fromEntries(LOOK_FIELDS.map((key) => [key, ""]));
  writeSet(set);
  for (const key of ["style", "recipe", "technique", "layout"]) s.answers[key] = "";
  s.styleId = "";
  writeState(dir, s);
  ok("dropped the saved look");
} else if (cmd === "summary") {
  const dir = project();
  const s = readState(dir) || fail("no state; run init");
  const stage = opt("stage");
  const phaseOf = { interview: "interview", brief: "brief", package: "confirm" };
  if (!phaseOf[stage]) fail("summary needs --stage interview|brief|package");
  if (s.phase !== phaseOf[stage]) fail(`the ${stage} summary is shown only while phase is ${phaseOf[stage]}`);
  if (stage === "interview" && !answersReady(s)) fail(reason("brief", s));
  if (stage === "interview" && !s.tasteSet) fail("name the new taste set first: suggest a short name from the user's taste words and run new-set --name <name>");
  s.summaryShown = { ...(s.summaryShown || {}), [stage]: true };
  writeState(dir, s);
  ok(`${stage} summary shown; end your turn and wait for the user's reply`);
} else if (cmd === "confirm-interview") {
  const dir = project();
  const s = readState(dir) || fail("no state; run init");
  if (!answersReady(s)) fail(reason("brief", s));
  confirmGate(s, "interview");
  s.interviewConfirmed = true;
  writeState(dir, s);
  if (!s.tasteSet) fail("name the new taste set first with new-set --name <name>");
  rememberTaste(s);
  ok(`interview confirmed and taste set ${s.tasteSet} updated`);
} else if (cmd === "confirm-brief") {
  const dir = project();
  const s = readState(dir) || fail("no state");
  if (s.phase !== "brief") fail("brief can be confirmed only while phase is brief");
  confirmGate(s, "brief");
  s.briefConfirmed = true;
  writeState(dir, s);
  ok("brief confirmed");
} else if (cmd === "set-direction") {
  const dir = project();
  const s = readState(dir) || fail("no state");
  if (s.phase !== "director") fail("style is chosen only during director");
  if (!needsStyle) fail(`edition ${EDITION} has no style library; enter confirm next`);
  const styleId = opt("style");
  const shelfUrl = opt("shelf");
  if (!sourceReady(styleId)) fail(`no style source for ${styleId}`);
  if (s.answers.style && styleId !== s.answers.style) fail(`style must stay ${s.answers.style}`);
  const clip = styleVideo(styleId);
  if (!clip) fail(`no example clip for ${styleId}; run node scripts/choice-menu.mjs examples ${styleId}`);
  if (shelfUrl !== clip) fail(`shelf must be the style clip from examples: ${clip}`);
  s.styleId = styleId;
  s.shelfUrl = shelfUrl;
  writeState(dir, s);
  ok(`direction ${styleId}`);
  // same recipe + technique as the last job reads as a repeat; the agent varies one unless the user kept the look on purpose
  const last = readSet(s.tasteSet).jobs.at(-1)?.split(" | ") || [];
  if (last[3] && last[3] === s.answers.recipe && last[4] === s.answers.technique) console.log(`REPEAT: recipe ${last[3]} + technique ${last[4]} match the last job; change the technique or say in the package summary that the look is kept on purpose`);
} else if (cmd === "confirm-package") {
  const dir = project();
  const s = readState(dir) || fail("no state");
  if (s.phase !== "confirm") fail("package is confirmed only during confirm");
  if (!prereq.confirm(s)) fail(reason("confirm", s));
  confirmGate(s, "package");
  s.packageConfirmed = true;
  s.packageStatus = "confirmed";
  writeState(dir, s);
  rememberJob(s);
  ok(`package confirmed and taste set ${s.tasteSet} updated`);
} else if (cmd === "remember-asset") {
  const file = opt("path");
  const note = opt("note");
  if (!file || !existsSync(file) || !statSync(file).isFile()) fail("asset path must be a file that exists");
  if (!note.trim()) fail("asset needs --note");
  const dir = project();
  const s = readState(dir) || fail("no state; run init");
  s.assets = [...(s.assets || []), `${file} | ${note.trim()}`];
  writeState(dir, s);
  ok("asset remembered for this job");
} else if (cmd === "attest-demo") {
  const dir = project();
  const s = readState(dir) || fail("no state");
  if (!needsStyle) fail(`edition ${EDITION} has no style source to attest; enter build`);
  if (!s.packageConfirmed) fail("attest the demo only after the package is confirmed");
  const rel = opt("file");
  if (EDITION === "pro" && rel !== `${s.styleId}.md`) fail(`in edition pro, attest ${s.styleId}.md`);
  const abs = path.join(sourceDir(s.styleId), rel);
  if (!s.styleId || !existsSync(abs) || !statSync(abs).isFile()) fail(`demo file not found: ${rel}`);
  s.demoAttested = [...new Set([...(s.demoAttested || []), rel])];
  writeState(dir, s);
  ok(`attested ${rel}`);
} else if (cmd === "enter") {
  const dir = project();
  const phase = opt("phase");
  if (!ORDER.includes(phase)) fail(`unknown phase ${phase}`);
  let s = readState(dir);
  if (!s) {
    if (phase !== "interview") fail("no state; run init");
    mkdirSync(dir, { recursive: true });
    s = blank();
  }
  const at = ORDER.indexOf(s.phase);
  const to = ORDER.indexOf(phase);
  if (to !== at && to !== at + 1) fail(`cannot enter ${phase} from ${s.phase}`);
  if (!prereq[phase](s)) fail(reason(phase, s));
  s.phase = phase;
  writeState(dir, s);
  const reads = {
    interview: ["references/phases/phase-0-grill.md", "templates/taste-profile.md"],
    brief: ["references/phases/phase-1-brief.md", "templates/brief.md"],
    director: [
      "references/phases/phase-2-director.md",
      `templates/scenes/${s.answers.scene}.md`,
      "references/timing-and-cutting.md §1 §2 §5",
      `references/styles-mg15/${s.answers.style}.md`,
      `library/extra-styles/demos/${s.answers.style}/cues.json`,
    ],
    confirm: [],
    assets: ["references/phases/phase-3-assets.md"],
    build: [
      `references/styles-mg15/${s.styleId}.md`,
      "references/phases/phase-4-build.md",
      "references/thai-layer.md §1 §2 §3",
    ],
    qa: ["references/phases/phase-5-qa.md", "references/model-routing.md §2 §4", "references/tells-registry.md", "references/styles-mg15/rubric.md"],
    render: ["references/phases/phase-6-render.md"],
  };
  // Print only files this edition shipped, so a cut tier never points at a missing file.
  const styled = (rel) => !rel.includes("styles") || (s.styleId || s.answers.style);
  // "file §1 §2" means read only those sections, through scripts/section.mjs.
  const fileOf = (entry) => entry.split(" §")[0];
  const shipped = reads[phase].filter(styled).filter((entry) => existsSync(path.join(SKILL_ROOT, fileOf(entry))));
  ok(`entered ${phase}`);
  console.log(`EDITION: ${EDITION}`);
  console.log("REQUIRED_READ:");
  for (const entry of shipped) {
    const parts = entry.split(" §");
    console.log(parts.length > 1 ? `- node scripts/section.mjs ${parts[0]} ${parts.slice(1).join(" ")}` : `- ${entry}`);
  }
  if (phase === "build" && EDITION === "elite") {
    console.log("BUILD_FROM:");
    console.log(`- copy library/extra-styles/demos/${s.styleId}/ into the project, then grep its functions and read only the parts you change`);
  }
  if (!shipped.length && phase === "confirm") console.log("- none; confirm the package with the user, then confirm-package");
  else if (!shipped.length) console.log(`- none in edition ${EDITION}; do this phase from TASTE.md, then enter the next phase`);
  if (phase === "director" && !needsStyle) {
    console.log("LOCKED_LOOK:");
    console.log(`- scene ${s.answers.scene}`);
    console.log("- no style library in this edition; build the look from TASTE.md and the scene template");
  }
  if (phase === "director" && needsStyle) {
    console.log("LOCKED_LOOK:");
    console.log(`- scene ${s.answers.scene}`);
    console.log(`- style ${s.answers.style}`);
    console.log(`- recipe ${s.answers.recipe}`);
    console.log(`- technique ${s.answers.technique}`);
    console.log(`- layout ${s.answers.layout}`);
    console.log("OPEN_ONE:");
    console.log(`- node scripts/section.mjs references/shot-recipes.md "### ${s.answers.recipe}"`);
    console.log(`- grep -n "\\*\\*${s.answers.technique}\\*\\*" references/techniques.md`);
    console.log(`- grep -n "\\*\\*${s.answers.layout}\\*\\*" references/techniques.md`);
    console.log("WATCH_EXAMPLES:");
    console.log(`- node scripts/choice-menu.mjs examples ${s.answers.style} ${s.answers.recipe}`);
    console.log("- a small sub-agent watches the clips and returns JSON; follow references/reference-shelf.md");
  }
} else if (cmd === "check-write" || cmd === "check-shell" || cmd === "check-deliver") {
  const dir = project();
  const s = readState(dir);
  if (!s) {
    ok("no tasteframe state");
  } else if (cmd === "check-deliver") {
    if (!prereq.render(s) || !ORDER.slice(ORDER.indexOf("qa")).includes(s.phase)) fail(reason("render", s));
    ok("delivery allowed");
  } else if (cmd === "check-shell") {
    const command = opt("command") || "";
    if (/scripts\/guard\.mjs/.test(command)) ok("guard command");
    else if (/\bffprobe\b/.test(command) && !/\bffmpeg\b/.test(command)) ok("probe");
    else if (/scripts\/contact-sheet\.sh/.test(command)) ok("contact sheet");
    else if (/\b(remotion(\s+\S+)?\s+render|ffmpeg|hyperframes|render\.mjs)\b/.test(command) && ORDER.indexOf(s.phase) < ORDER.indexOf("build")) fail(`render and frame tools start at phase build; now ${s.phase}`);
    else if (/\b(npm\s+(install|create)|npx\s+create-|npx\s+remotion)\b/.test(command) && ORDER.indexOf(s.phase) < ORDER.indexOf("build")) fail(`scaffolding requires phase build; now ${s.phase}`);
    else ok("shell allowed");
  } else {
    const file = path.resolve(opt("path") || "");
    const rel = path.relative(dir, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) ok("outside project");
    else if (rel === ".tasteframe-state.json") ok("state file");
    else {
      const ext = path.extname(file).toLowerCase();
      const source = SOURCE_EXT.has(ext) || rel.endsWith(".js") || rel.endsWith(".mjs") || rel.endsWith(".ts");
      if (source && ORDER.indexOf(s.phase) < ORDER.indexOf("build")) fail(`cannot write ${rel} before phase build; now ${s.phase}`);
      ok("write allowed");
    }
  }
} else {
  if (cmd === "help" || !cmd) {
    printHelp();
    process.exit(cmd ? 0 : 1);
  }
  fail("usage: help | init | recall | sets | use-set | new-set | forget-set | answer | reuse-look | drop-look | summary | confirm-interview | confirm-brief | set-direction | confirm-package | remember-asset | attest-demo | enter | check-write | check-shell | check-deliver");
}
