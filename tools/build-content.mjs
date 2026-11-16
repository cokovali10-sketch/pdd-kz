#!/usr/bin/env node
/**
 * Validates the canonical content in `content/` and emits the static bundle the
 * web app consumes (`apps/web/public/content/v1/*.json`).
 *
 * Usage:
 *   node tools/build-content.mjs           # validate + write
 *   node tools/build-content.mjs --check   # validate only (used in CI)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const outDir = join(root, 'apps', 'web', 'public', 'content', 'v1');
const checkOnly = process.argv.includes('--check');

const read = (p) => JSON.parse(readFileSync(join(contentDir, p), 'utf8'));
const readDir = async (dir) => {
  const { readdirSync } = await import('node:fs');
  return readdirSync(join(contentDir, dir))
    .filter((f) => f.endsWith('.json'))
    .sort();
};

const locales = ['ru', 'kk', 'en'];
const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const isText = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasLocales = (v) => isText(v) && locales.every((l) => typeof v[l] === 'string' && v[l].trim().length > 0);
const checkText = (label, v) => {
  if (!hasLocales(v)) {
    fail(`${label}: text must contain non-empty "ru", "kk" and "en" strings`);
    return false;
  }
  return true;
};

const topics = read('topics.json');
const examProfiles = read('exam-profiles.json');
const signs = read('signs.json');
const markings = read('markings.json');
const pdd = read('pdd/chapters.json');
const fines = read('fines.json');

const questionFiles = await readDir('questions');
const questions = questionFiles.flatMap((f) => read(`questions/${f}`));

/* --------------------------------------------------------------- topics */

const topicIds = new Set();
for (const [i, topic] of topics.entries()) {
  if (!topic.id) fail(`topics[${i}]: missing id`);
  if (topicIds.has(topic.id)) fail(`topics: duplicate id "${topic.id}"`);
  topicIds.add(topic.id);
  checkText(`topic "${topic.id}".title`, topic.title);
  checkText(`topic "${topic.id}".short`, topic.short);
  if (typeof topic.order !== 'number') fail(`topic "${topic.id}": order must be a number`);
}

/* -------------------------------------------------------- exam profiles */

const profileIds = new Set();
for (const p of examProfiles) {
  if (!p.id) fail('exam profile: missing id');
  if (profileIds.has(p.id)) fail(`exam profile: duplicate id "${p.id}"`);
  profileIds.add(p.id);
  checkText(`exam profile "${p.id}".name`, p.name);
  if (!Number.isInteger(p.questions) || p.questions < 1) fail(`exam profile "${p.id}": questions must be a positive integer`);
  if (!Number.isInteger(p.minutes) || p.minutes < 0) fail(`exam profile "${p.id}": minutes must be >= 0`);
  if (!Number.isInteger(p.maxErrors) || p.maxErrors < 0) fail(`exam profile "${p.id}": maxErrors must be >= 0`);
}

/* ---------------------------------------------------------------- signs */

const signCodes = new Set();
const signById = new Map();
for (const s of signs) {
  if (!/^\d+(\.\d+)+$/.test(s.code ?? '')) fail(`sign: invalid code "${s.code}"`);
  if (signCodes.has(s.code)) fail(`sign: duplicate code ${s.code}`);
  signCodes.add(s.code);
  signById.set(`s_${s.code}`, s);
  checkText(`sign ${s.code}.title`, s.title);
  checkText(`sign ${s.code}.desc`, s.desc);
  if (!Array.isArray(s.applies) || s.applies.length === 0) fail(`sign ${s.code}: "applies" must be a non-empty array`);
  if (!s.group) fail(`sign ${s.code}: missing group`);
}

for (const m of markings) {
  if (!m.id) fail(`marking: missing id "${m.id}"`);
  checkText(`marking ${m.id}.title`, m.title);
  checkText(`marking ${m.id}.desc`, m.desc);
}

/* ------------------------------------------------------------------ pdd */

const pddPoints = new Set();
for (const ch of pdd) {
  checkText(`pdd chapter ${ch.id}.title`, ch.title);
  for (const point of ch.points ?? []) {
    if (pddPoints.has(point.id)) fail(`pdd: duplicate point ${point.id}`);
    pddPoints.add(point.id);
    checkText(`pdd point ${point.id}.text`, point.text);
  }
}

/* -------------------------------------------------------------- questions */

const questionIds = new Set();
const topicUsage = new Map();
let withDiagram = 0;
let withSigns = 0;

for (const q of questions) {
  const at = `question "${q.id ?? '<no id>'}"`;
  if (!q.id) fail(`${at}: missing id`);
  if (questionIds.has(q.id)) fail(`${at}: duplicate id`);
  questionIds.add(q.id);

  checkText(`${at}.text`, q.text);
  checkText(`${at}.explanation`, q.explanation);

  if (!Array.isArray(q.options) || q.options.length < 2) fail(`${at}: at least two options are required`);
  const optionIds = new Set();
  for (const o of q.options ?? []) {
    if (!o.id) fail(`${at}: option without id`);
    if (optionIds.has(o.id)) fail(`${at}: duplicate option id ${o.id}`);
    optionIds.add(o.id);
    checkText(`${at}.option ${o.id}`, o.text);
  }
  if (!optionIds.has(q.correctOptionId)) fail(`${at}: correctOptionId "${q.correctOptionId}" is not among the options`);

  if (!Array.isArray(q.topicIds) || q.topicIds.length === 0) fail(`${at}: at least one topicId is required`);
  for (const t of q.topicIds ?? []) {
    if (!topicIds.has(t)) fail(`${at}: unknown topicId "${t}"`);
    topicUsage.set(t, (topicUsage.get(t) ?? 0) + 1);
  }

  if (!Array.isArray(q.pdDRefs) || q.pdDRefs.length === 0) {
    fail(`${at}: at least one pdDRef is required`);
  } else {
    for (const ref of q.pdDRefs) {
      if (!ref.chapter) {
        fail(`${at}: pdDRef without chapter`);
        continue;
      }
      if (ref.point && !pddPoints.has(ref.point)) warn(`${at}: pdDRef point ${ref.point} is not in the curated PDD text`);
    }
  }

  for (const ref of q.signIds ?? []) {
    if (!signById.has(ref)) fail(`${at}: unknown signIds "${ref}"`);
    withSigns += 1;
  }

  if (q.diagram) {
    const allowed = ['cross', 'roundabout', 'straight'];
    if (!allowed.includes(q.diagram.type)) fail(`${at}: unsupported diagram type "${q.diagram.type}"`);
    if (!Array.isArray(q.diagram.vehicles) || q.diagram.vehicles.length === 0) fail(`${at}: diagram needs at least one vehicle`);
    for (const v of q.diagram.vehicles ?? []) {
      if (!['n', 'e', 's', 'w'].includes(v.arm)) fail(`${at}: vehicle arm must be n/e/s/w`);
      if (typeof v.pos !== 'number' || v.pos < 0 || v.pos > 1) fail(`${at}: vehicle pos must be 0..1`);
    }
    withDiagram += 1;
  }

  if (!['B'].includes(q.category)) warn(`${at}: unsupported category "${q.category}" (only B is implemented)`);
  if (![1, 2, 3].includes(q.difficulty)) warn(`${at}: difficulty should be 1..3`);
}

for (const f of fines) {
  if (!f.id) fail(`fine: missing id`);
  checkText(`fine ${f.id}.title`, f.title);
  if (typeof f.amountMrep !== 'number' || f.amountMrep <= 0) fail(`fine ${f.id}: amountMrep must be a positive number`);
  if (!f.article) fail(`fine ${f.id}: missing article`);
  if (f.status !== 'draft') warn(`fine ${f.id}: expected status "draft" until legally verified`);
}

/* ----------------------------------------------------------------- output */

const contentVersion = createHash('sha256')
  .update(JSON.stringify({ topics, examProfiles, signs, markings, pdd, fines, questions }))
  .digest('hex')
  .slice(0, 12);

const stats = {
  questions: questions.length,
  topics: topics.length,
  signs: signs.length,
  markings: markings.length,
  pddChapters: pdd.length,
  pddPoints: pddPoints.size,
  fines: fines.length,
  questionsWithDiagram: withDiagram,
  questionsWithSigns: withSigns,
  questionsPerTopic: Object.fromEntries([...topicUsage.entries()].sort((a, b) => b[1] - a[1])),
};

if (!checkOnly) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const write = (name, data) =>
    writeFileSync(join(outDir, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  write('manifest.json', {
    version: contentVersion,
    generatedAt: new Date().toISOString(),
    stats,
    files: ['content.json', 'questions.json', 'signs.json', 'markings.json', 'pdd.json', 'fines.json'],
  });
  write('content.json', { version: contentVersion, topics, examProfiles });
  write('questions.json', { version: contentVersion, questions });
  write('signs.json', {
    version: contentVersion,
    signs: signs.map((s) => ({ ...s, id: `s_${s.code}`, file: `/signs/s_${s.code}.svg` })),
  });
  write('markings.json', {
    version: contentVersion,
    markings: markings.map((m) => ({ ...m, id: m.id, file: `/signs/m_${m.id}.svg` })),
  });
  write('pdd.json', { version: contentVersion, chapters: pdd });
  write('fines.json', { version: contentVersion, fines });
}

console.log(`[content] version=${contentVersion}`);
console.log(`[content] questions=${stats.questions} topics=${stats.topics} signs=${stats.signs} markings=${stats.markings} pddPoints=${stats.pddPoints} fines=${stats.fines}`);
console.log(`[content] with diagram=${stats.questionsWithDiagram} with sign refs=${stats.questionsWithSigns}`);

if (warnings.length) {
  console.warn(`[content] ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.warn(`  - ${w}`);
  if (warnings.length > 40) console.warn(`  ... and ${warnings.length - 40} more`);
}

if (errors.length) {
  console.error(`[content] ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (!checkOnly) console.log(`[content] wrote bundle to apps/web/public/content/v1`);