#!/usr/bin/env node
/**
 * Generates simplified, original SVG drawings for the road signs referenced in
 * content/signs.json (and markings in content/markings.json).
 *
 * These are original geometric drawings made for this project — not official
 * artwork. They are intentionally simple so the dark theme stays legible.
 *
 * Usage: node tools/signs/generate.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const contentDir = join(root, 'content');
const outDir = join(root, 'apps', 'web', 'public', 'signs');

const RED = '#d92b2b';
const BLUE = '#1657c8';
const DARK = '#101418';
const LIGHT = '#ffffff';
const GREY = '#6b7280';
const YELLOW = '#ffd400';

const INK = (onDark) => (onDark ? LIGHT : DARK);

const open = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img">${body}</svg>`;

const txt = (x, y, size, str, color = DARK, weight = 700, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle" dominant-baseline="middle" ${extra}>${str}</text>`;

/* ------------------------------------------------------------------ shapes */

const shapes = {
  triangle: () =>
    `<polygon points="256,58 470,450 42,450" fill="${LIGHT}" stroke="${RED}" stroke-width="40" stroke-linejoin="round"/>`,
  'triangle-down': () =>
    `<polygon points="256,454 44,62 468,62" fill="${LIGHT}" stroke="${RED}" stroke-width="40" stroke-linejoin="round"/>`,
  'circle-red': () =>
    `<circle cx="256" cy="256" r="232" fill="${LIGHT}" stroke="${RED}" stroke-width="44"/>`,
  'circle-blue': () =>
    `<circle cx="256" cy="256" r="232" fill="${BLUE}" stroke="${LIGHT}" stroke-width="20"/>`,
  'circle-grey': () =>
    `<circle cx="256" cy="256" r="232" fill="${LIGHT}" stroke="${GREY}" stroke-width="40"/>`,
  'circle-blue-cross': () =>
    `<circle cx="256" cy="256" r="232" fill="${BLUE}" stroke="${RED}" stroke-width="40"/>
     <path d="M96,96 L416,416 M416,96 L96,416" stroke="${RED}" stroke-width="34" stroke-linecap="round" opacity="0.95"/>`,
  'rect-blue': () =>
    `<rect x="30" y="86" width="452" height="340" rx="26" fill="${BLUE}" stroke="${LIGHT}" stroke-width="18"/>`,
  'rect-white': () =>
    `<rect x="30" y="86" width="452" height="340" rx="26" fill="${LIGHT}" stroke="${DARK}" stroke-width="16"/>`,
  diamond: () =>
    `<rect x="112" y="112" width="288" height="288" rx="18" transform="rotate(45 256 256)" fill="${YELLOW}" stroke="${RED}" stroke-width="38"/>`,
  octagon: () =>
    `<polygon points="166,34 346,34 478,166 478,346 346,478 166,478 34,346 34,166" fill="${RED}" stroke="${LIGHT}" stroke-width="20"/>`,
  plate: () =>
    `<rect x="10" y="186" width="492" height="140" rx="12" fill="${LIGHT}" stroke="${DARK}" stroke-width="10"/>`,
  'plate-tall': () =>
    `<rect x="10" y="120" width="492" height="272" rx="12" fill="${LIGHT}" stroke="${DARK}" stroke-width="10"/>`,
};

/* ------------------------------------------------------------------ glyphs */

const wheel = (cx, cy, r = 24, color = DARK) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="${LIGHT}"/>`;

const carSide = (color, x = 0, y = 0, scale = 1) => `
  <g transform="translate(${x} ${y}) scale(${scale})" fill="${color}">
    <path d="M96,300 h300 q22,0 22,20 v34 h-344 v-34 q0,20 22,20 z"/>
    <path d="M140,300 l46,-70 h140 l44,70 z"/>
    <rect x="132" y="248" width="236" height="58" rx="16" opacity="0.95"/>
    <circle cx="176" cy="356" r="30" fill="${color}"/><circle cx="176" cy="356" r="13" fill="${LIGHT}"/>
    <circle cx="342" cy="356" r="30" fill="${color}"/><circle cx="342" cy="356" r="13" fill="${LIGHT}"/>
  </g>`;

const glyphs = {
  car: (color = DARK) => carSide(color, 0, 0, 1),
  truck: () => `
    <g fill="${DARK}">
      <rect x="86" y="206" width="196" height="112" rx="10"/>
      <path d="M292,236 h74 l52,56 v26 h-126 z"/>
      <rect x="300" y="246" width="52" height="34" rx="6" fill="${LIGHT}"/>
      <circle cx="140" cy="330" r="28"/><circle cx="140" cy="330" r="12" fill="${LIGHT}"/>
      <circle cx="356" cy="330" r="28"/><circle cx="356" cy="330" r="12" fill="${LIGHT}"/>
    </g>`,
  bus: (color = DARK) => `
    <g fill="${color}">
      <rect x="118" y="150" width="276" height="184" rx="18"/>
      <rect x="140" y="176" width="106" height="52" rx="8" fill="${LIGHT}"/>
      <rect x="266" y="176" width="106" height="52" rx="8" fill="${LIGHT}"/>
      <rect x="140" y="248" width="232" height="18" rx="6" fill="${LIGHT}" opacity="0.75"/>
      <circle cx="172" cy="346" r="26" fill="${color}"/><circle cx="172" cy="346" r="11" fill="${LIGHT}"/>
      <circle cx="340" cy="346" r="26" fill="${color}"/><circle cx="340" cy="346" r="11" fill="${LIGHT}"/>
    </g>`,
  bike: (color = DARK) => `
    <g fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round">
      <circle cx="156" cy="330" r="66"/><circle cx="356" cy="330" r="66"/>
      <path d="M156,330 l64,-96 h72 l64,96 M220,234 h96 M284,330 l-40,-96"/>
    </g>`,
  pedestrian: (color = DARK) => `
    <g fill="${color}">
      <circle cx="256" cy="150" r="30"/>
      <rect x="238" y="190" width="36" height="86" rx="16"/>
      <path d="M244,270 l-30,84 h22 l26,-70 l26,70 h22 l-30,-84 z"/>
      <path d="M232,206 l-52,54 h20 l44,-42 z"/>
      <path d="M280,206 l54,40 l-14,18 l-48,-36 z"/>
    </g>`,
  children: () => `
    <g fill="${DARK}">
      <circle cx="196" cy="172" r="24"/><rect x="182" y="204" width="28" height="70" rx="12"/>
      <path d="M188,266 l-22,64 h18 l20,-52 l20,52 h18 l-22,-64 z"/>
      <circle cx="308" cy="200" r="20"/><rect x="296" y="226" width="24" height="60" rx="10"/>
      <path d="M300,280 l-18,54 h16 l16,-44 l16,44 h16 l-18,-54 z"/>
      <circle cx="380" cy="330" r="26"/>
    </g>`,
  tram: () => `
    <g fill="${DARK}">
      <path d="M196,96 h120 l-22,44 h-76 z"/>
      <rect x="146" y="150" width="220" height="180" rx="20"/>
      <rect x="168" y="176" width="80" height="54" rx="8" fill="${LIGHT}"/>
      <rect x="264" y="176" width="80" height="54" rx="8" fill="${LIGHT}"/>
      <circle cx="196" cy="344" r="24"/><circle cx="196" cy="344" r="10" fill="${LIGHT}"/>
      <circle cx="316" cy="344" r="24"/><circle cx="316" cy="344" r="10" fill="${LIGHT}"/>
    </g>`,
  railway: () => `
    <g fill="${DARK}">
      <rect x="120" y="330" width="272" height="18" rx="6"/>
      <rect x="150" y="300" width="24" height="90" rx="6"/>
      <rect x="338" y="300" width="24" height="90" rx="6"/>
      <rect x="150" y="180" width="24" height="150" rx="8"/>
      <rect x="150" y="180" width="212" height="30" rx="10"/>
      <path d="M362,210 l30,-16 v-52 h-30 z" fill="${RED}"/>
      <path d="M104,392 h304 v-24 h-304 z"/>
    </g>`,
  crossbuck: () => `
    <g stroke="${RED}" stroke-width="34" stroke-linecap="round">
      <path d="M150,180 l212,212"/><path d="M362,180 l-212,212"/>
    </g>
    <rect x="100" y="330" width="312" height="22" rx="8" fill="${DARK}"/>
    <g fill="${DARK}"><rect x="150" y="300" width="24" height="80" rx="6"/><rect x="338" y="300" width="24" height="80" rx="6"/></g>`,
  'junction-equal': () => `
    <g fill="${DARK}">
      <rect x="230" y="120" width="52" height="272" rx="8"/>
      <rect x="120" y="230" width="272" height="52" rx="8"/>
    </g>`,
  descent: () => `
    <path d="M96,300 L416,300 L416,392 Z" fill="${DARK}" opacity="0.12"/>
    <path d="M96,392 L416,240" stroke="${DARK}" stroke-width="18" stroke-linecap="round"/>
    ${txt(280, 200, 108, '10%', DARK)}`,
  ascent: () => `
    <path d="M96,240 L416,392 L96,392 Z" fill="${DARK}" opacity="0.12"/>
    <path d="M96,240 L416,392" stroke="${DARK}" stroke-width="18" stroke-linecap="round"/>
    ${txt(280, 200, 108, '10%', DARK)}`,
  slippery: () => `
    <g fill="none" stroke="${DARK}" stroke-width="14" stroke-linecap="round" opacity="0.75">
      <path d="M120,330 q60,-40 120,0 q60,40 120,0"/>
      <path d="M120,370 q60,-40 120,0 q60,40 120,0"/>
    </g>
    <g transform="translate(0,-40) scale(0.86)" opacity="0.95">${carSide(DARK)}</g>`,
  uneven: () => `
    <path d="M96,340 q80,-90 160,0 q80,90 160,0" fill="none" stroke="${DARK}" stroke-width="22" stroke-linecap="round"/>`,
  'pedestrian-crossing': () => `
    <g fill="${DARK}">
      <rect x="92" y="250" width="328" height="14" rx="4"/>
      <rect x="92" y="288" width="328" height="14" rx="4"/>
      <rect x="92" y="326" width="328" height="14" rx="4"/>
    </g>
    <g transform="translate(180,-30) scale(0.9)">${glyphs.pedestrian()}</g>`,
  roadworks: () => `
    <g fill="${DARK}">
      <circle cx="220" cy="168" r="26"/>
      <path d="M200,206 h40 l22,86 h-84 z"/>
      <path d="M210,292 l-22,80 h20 l22,-66 l20,66 h20 l-22,-80 z"/>
      <path d="M286,214 l60,110 h-20 l-52,-96 z"/>
      <path d="M96,388 q40,-46 80,0 z"/>
    </g>`,
  'main-road': () => '',
  'end-main-road': () => `
    <g stroke="${GREY}" stroke-width="12" opacity="0.6">
      <path d="M150,150 l212,212"/><path d="M362,150 l-212,212"/>
    </g>`,
  yield: () => '',
  stop: () => `${txt(256, 262, 96, 'STOP', LIGHT, 800, 'letter-spacing="6"')}`,
  'arrow-up-both': (color = DARK) => `
    <g fill="${color}">
      <path d="M196,420 h40 v-140 h-40 z"/>
      <path d="M216,150 l70,110 h-140 z"/>
      <path d="M276,92 h40 v140 h-40 z"/>
      <path d="M296,372 l70,-110 h-140 z"/>
    </g>`,
  'no-entry': () => `<rect x="96" y="228" width="320" height="56" rx="10" fill="${LIGHT}"/>`,
  'no-cars': (color = DARK) => carSide(color, 0, 0, 0.9),
  'no-overtaking': () => `
    <g transform="translate(-26,-30) scale(0.72)" opacity="0.95">${carSide(DARK)}</g>
    <g transform="translate(58,26) scale(0.72)">${carSide(RED)}</g>`,
  'no-overtaking-truck': () => `
    <g transform="translate(0,-24) scale(0.62)">${glyphs.truck()}</g>
    <g transform="translate(120,40) scale(0.5)">${glyphs.truck()}</g>
    <g transform="translate(240,20) scale(0.5)">${carSide(RED)}</g>`,
  weight: () => `${txt(256, 258, 150, '8', DARK)}${txt(256, 400, 54, 'т', DARK)}`,
  height: () => `${txt(256, 250, 140, '3.5', DARK)}${txt(256, 396, 52, 'м', DARK)}`,
  speed: () => `${txt(256, 258, 190, '40', DARK)}`,
  'speed-off': () => `
    ${txt(256, 258, 190, '40', GREY)}
    <path d="M96,96 L416,416" stroke="${GREY}" stroke-width="34" stroke-linecap="round"/>`,
  exclamation: () => `
    <path d="M232,130 h48 l-10,180 h-28 z" fill="${DARK}"/>
    <circle cx="256" cy="366" r="28" fill="${DARK}"/>`,
  parking: (color = DARK) => `${txt(256, 264, 220, 'P', color, 800)}`,
  'arrow-right': (color = DARK) => `
    <g fill="${color}">
      <path d="M236,140 h44 v110 h78 l-100,130 l-100,-130 h78 z"/>
    </g>`,
  'arrow-left': (color = DARK) => `
    <g fill="${color}" transform="rotate(90 256 256)">
      <path d="M236,140 h44 v110 h78 l-100,130 l-100,-130 h78 z"/>
    </g>`,
  'arrow-straight': (color = DARK) => `
    <g fill="${color}" transform="rotate(-90 256 256)">
      <path d="M236,140 h44 v110 h78 l-100,130 l-100,-130 h78 z"/>
    </g>`,
  'arrow-straight-right': (color = DARK) => `
    <g fill="${color}">
      <path d="M196,300 h60 v-84 h44 l-74,-96 l-74,96 h44 z"/>
      <path d="M290,300 h60 v-84 h44 l-74,-96 l-74,96 h44 z"/>
    </g>`,
  'arrow-straight-left': (color = DARK) => `
    <g fill="${color}">
      <path d="M150,300 h60 v-84 h44 l-74,-96 l-74,96 h44 z"/>
      <path d="M240,300 h60 v-84 h44 l-74,-96 l-74,96 h44 z"/>
    </g>`,
  'bypass-right': (color = DARK) => `
    <g fill="${color}">
      <path d="M196,412 v-90 q0,-70 70,-70 h30 l-46,-58 l46,-58 l-46,58 z"/>
      <path d="M186,412 h60 v-90 q0,-40 40,-40 h96 v60 h-76 q-20,0 -20,20 v50 z"/>
    </g>`,
  'bypass-left': (color = DARK) => `
    <g fill="${color}" transform="translate(512,0) scale(-1,1)">
      <path d="M196,412 v-90 q0,-70 70,-70 h30 l-46,-58 l46,-58 l-46,58 z"/>
      <path d="M186,412 h60 v-90 q0,-40 40,-40 h96 v60 h-76 q-20,0 -20,20 v50 z"/>
    </g>`,
  roundabout: (color = DARK) => `
    <g fill="none" stroke="${color}" stroke-width="22" stroke-linecap="round">
      <path d="M256,150 a106,106 0 1 1 -96,60"/>
    </g>
    <path d="M150,196 l10,66 l-66,-10 z" fill="${color}"/>
    <circle cx="256" cy="256" r="26" fill="${color}"/>`,
  'car': () => carSide(DARK, 0, 0, 1),
  'car-road': () => carSide(LIGHT, 0, 0, 1),
  'car-white': () => carSide(LIGHT),
  motorway: () => `
    <g fill="${LIGHT}">
      <path d="M180,430 l30,-250 h44 l-14,250 z"/>
      <path d="M332,430 l-30,-250 h-44 l14,250 z" opacity="0.55"/>
      <rect x="120" y="150" width="272" height="26" rx="8"/>
      <rect x="150" y="110" width="26" height="80" rx="6"/>
      <rect x="336" y="110" width="26" height="80" rx="6"/>
    </g>`,
  'motorway-end': () => `
    <g fill="${LIGHT}">
      <path d="M180,430 l30,-250 h44 l-14,250 z"/>
      <path d="M332,430 l-30,-250 h-44 l14,250 z" opacity="0.55"/>
    </g>
    <g stroke="${GREY}" stroke-width="12" opacity="0.9">
      <path d="M110,120 l292,292"/><path d="M402,120 l-292,292"/>
    </g>`,
  'one-way': (color = LIGHT) => `
    <g fill="${color}">
      <path d="M110,220 h180 v-56 l120,92 l-120,92 v-56 h-180 z"/>
    </g>`,
  'one-way-end': () => `
    <g fill="${LIGHT}">
      <path d="M110,220 h180 v-56 l120,92 l-120,92 v-56 h-180 z"/>
    </g>
    <g stroke="${GREY}" stroke-width="12" opacity="0.9">
      <path d="M110,120 l292,292"/><path d="M402,120 l-292,292"/>
    </g>`,
  residential: () => `
    <g fill="${LIGHT}">
      <path d="M110,250 l96,-80 l96,80 v18 h-24 v96 h-144 v-96 h-24 z"/>
      <rect x="196" y="286" width="40" height="78" fill="${BLUE}" opacity="0.55"/>
    </g>
    <g transform="translate(232,150) scale(0.62)">${glyphs.pedestrian(LIGHT)}</g>
    <circle cx="386" cy="360" r="24" fill="${LIGHT}"/>`,
  'lane-arrows': () => `
    <g fill="${LIGHT}">
      <path d="M96,300 h72 v-46 h40 l-56,-70 l-56,70 h40 z"/>
      <path d="M212,300 h72 v-46 h40 l-56,-70 l-56,70 h40 z"/>
      <path d="M328,300 h72 v-46 h40 l-56,-70 l-56,70 h40 z"/>
    </g>
    <g fill="${LIGHT}" opacity="0.85">
      <rect x="96" y="356" width="72" height="18" rx="6"/>
      <rect x="212" y="356" width="72" height="18" rx="6"/>
      <rect x="328" y="356" width="72" height="18" rx="6"/>
    </g>`,
  'bus-stop': () => `
    <g transform="translate(0,20) scale(0.92)">${glyphs.bus()}</g>
    <circle cx="256" cy="150" r="0" fill="${LIGHT}"/>`,
  'speed-bump': () => `
    <path d="M96,340 q160,-160 320,0 z" fill="${DARK}"/>
    <g stroke="${LIGHT}" stroke-width="18" opacity="0.85">
      <path d="M170,300 l40,-40"/><path d="M240,270 l40,-40"/><path d="M310,300 l40,-40"/>
    </g>`,
  'recommended-speed': () => `${txt(256, 264, 190, '60', LIGHT)}`,
  'dead-end': () => `
    <g fill="${LIGHT}">
      <rect x="226" y="120" width="60" height="180" rx="8"/>
      <rect x="140" y="286" width="232" height="52" rx="8"/>
    </g>
    <rect x="140" y="356" width="232" height="26" rx="8" fill="${RED}"/>`,
  directions: () => `
    <g fill="${LIGHT}">
      <path d="M110,196 h150 v-44 l96,72 l-96,72 v-44 h-150 z"/>
      <path d="M256,320 h150 v-44 l-96,72 l96,72 v-44 h-150 z"/>
    </g>`,
  'junction-guide': () => `
    <g fill="${LIGHT}">
      <path d="M150,300 h56 v-46 h34 l-62,-76 l-62,76 h34 z"/>
      <path d="M290,300 h56 v-46 h34 l-62,-76 l-62,76 h34 z"/>
      <rect x="150" y="356" width="212" height="16" rx="6"/>
    </g>`,
  'first-aid': (color = LIGHT) => `
    <g fill="${color}">
      <rect x="212" y="140" width="88" height="232" rx="12"/>
      <rect x="140" y="212" width="232" height="88" rx="12"/>
    </g>`,
  fuel: () => `
    <g fill="${LIGHT}">
      <rect x="150" y="150" width="150" height="230" rx="14"/>
      <rect x="180" y="186" width="90" height="60" rx="8" fill="${BLUE}" opacity="0.65"/>
      <rect x="330" y="200" width="34" height="120" rx="12"/>
      <path d="M300,250 h-24 v-24" stroke="${LIGHT}" stroke-width="14" fill="none"/>
    </g>`,
  'car-wash': () => `
    <g fill="${LIGHT}">
      ${carSide(LIGHT, 0, 20, 0.86)}
      <rect x="132" y="120" width="248" height="20" rx="8"/>
      <g fill="${LIGHT}" opacity="0.9">
        <circle cx="180" cy="160" r="10"/><circle cx="216" cy="180" r="8"/>
        <circle cx="256" cy="158" r="10"/><circle cx="296" cy="182" r="8"/>
        <circle cx="336" cy="160" r="10"/>
      </g>
    </g>`,
  phone: () => `
    <path d="M170,140 q-40,0 -40,44 v40 q0,120 100,170 q60,30 100,6 l-30,-70 q-10,-22 -34,-14 l-24,12 q-30,-14 -46,-44 l14,-22 q12,-24 -8,-34 z" fill="${LIGHT}"/>`,
  wc: () => `
    <g fill="${LIGHT}">
      ${glyphs.pedestrian(LIGHT)}
    </g>
    <g fill="${LIGHT}" transform="translate(120,40) scale(0.7)">${glyphs.pedestrian(LIGHT)}</g>`,
  hotel: () => `
    <g fill="${LIGHT}">
      <rect x="110" y="240" width="292" height="52" rx="10"/>
      <rect x="110" y="292" width="292" height="30" rx="8"/>
      <rect x="136" y="196" width="82" height="46" rx="12"/>
      <rect x="130" y="322" width="20" height="46" rx="6"/>
      <rect x="362" y="322" width="20" height="46" rx="6"/>
    </g>`,
  zone: () => `
    ${txt(256, 218, 46, '100 м', DARK)}
    <path d="M120,270 h272" stroke="${DARK}" stroke-width="10"/>
    <path d="M330,246 l34,24 l-34,24 z" fill="${DARK}"/>`,
  'zone-end': () => `
    <path d="M112,150 v212" stroke="${DARK}" stroke-width="18" stroke-linecap="round"/>
    <g stroke="${DARK}" stroke-width="12" opacity="0.8">
      <path d="M140,150 l180,212"/><path d="M320,150 l-180,212"/>
    </g>`,
  'zone-start': () => `
    <path d="M112,150 v212" stroke="${DARK}" stroke-width="18" stroke-linecap="round"/>
    <path d="M150,256 h230" stroke="${DARK}" stroke-width="12" stroke-dasharray="26 20"/>`,
  'vehicle-type': () => `
    <g transform="translate(0,30) scale(0.78)">${carSide(DARK)}</g>`,
  'truck-plate': () => `<g transform="translate(0,40) scale(0.8)">${glyphs.truck()}</g>`,
  'days-weekend': () => `
    <g fill="${DARK}">
      <rect x="140" y="170" width="232" height="180" rx="14"/>
      <rect x="170" y="210" width="52" height="46" rx="6" fill="${LIGHT}"/>
      <rect x="240" y="210" width="52" height="46" rx="6" fill="${LIGHT}"/>
      <rect x="310" y="210" width="52" height="46" rx="6" fill="${LIGHT}"/>
      <rect x="170" y="272" width="52" height="46" rx="6" fill="${LIGHT}"/>
      <rect x="240" y="272" width="52" height="46" rx="6" fill="${LIGHT}"/>
      <rect x="310" y="272" width="52" height="46" rx="6" fill="${LIGHT}"/>
    </g>`,
  time: () => `
    <circle cx="256" cy="256" r="110" fill="none" stroke="${DARK}" stroke-width="18"/>
    <path d="M256,256 v-70 M256,256 l54,34" stroke="${DARK}" stroke-width="18" stroke-linecap="round"/>`,
};

/* --------------------------------------------------------------- markings */

const markingShapes = {
  solid: `<rect x="150" y="60" width="52" height="392" fill="#e8eaee"/><rect x="310" y="60" width="52" height="392" fill="#e8eaee" opacity="0.55"/>`,
  'double-solid': `<rect x="200" y="60" width="40" height="392" fill="#e8eaee"/><rect x="272" y="60" width="40" height="392" fill="#e8eaee"/>`,
  dashed: `<g fill="#e8eaee"><rect x="240" y="60" width="34" height="120" rx="6"/><rect x="240" y="210" width="34" height="120" rx="6"/><rect x="240" y="360" width="34" height="120" rx="6"/></g>`,
  'solid-approach': `<g fill="#e8eaee"><rect x="200" y="60" width="34" height="120" rx="6"/><rect x="200" y="200" width="34" height="110" rx="6"/><rect x="200" y="330" width="34" height="122" rx="6"/></g>`,
  'dashed-wide': `<g fill="#e8eaee"><rect x="240" y="50" width="34" height="170" rx="6"/><rect x="240" y="250" width="34" height="170" rx="6"/></g>`,
  'stop-line': `<rect x="90" y="300" width="332" height="44" rx="8" fill="#e8eaee"/>`,
  zebra: `<g fill="#e8eaee"><rect x="90" y="140" width="332" height="46" rx="6"/><rect x="90" y="216" width="332" height="46" rx="6"/><rect x="90" y="292" width="332" height="46" rx="6"/><rect x="90" y="368" width="332" height="46" rx="6"/></g>`,
  'lane-arrows': `<g fill="#e8eaee"><path d="M170,400 h60 v-90 h50 l-80,-110 l-80,110 h50 z"/><path d="M300,400 h60 v-90 h50 l-80,-110 l-80,110 h50 z" opacity="0.8"/></g>`,
  'stop-word': `<text x="256" y="280" font-family="Inter, Arial, sans-serif" font-size="112" font-weight="800" fill="#e8eaee" text-anchor="middle">STOP</text>`,
};

/* ----------------------------------------------------------------- output */

const signs = JSON.parse(readFileSync(join(contentDir, 'signs.json'), 'utf8'));
const markings = JSON.parse(readFileSync(join(contentDir, 'markings.json'), 'utf8'));

mkdirSync(outDir, { recursive: true });

let generated = 0;
const missing = [];

for (const sign of signs) {
  const shape = shapes[sign.shape];
  const glyph = glyphs[sign.glyph];
  if (!shape) {
    missing.push(`sign ${sign.code}: unknown shape "${sign.shape}"`);
    continue;
  }
  if (typeof glyph !== 'function') {
    missing.push(`sign ${sign.code}: unknown glyph "${sign.glyph}"`);
    continue;
  }
  const ink = sign.shape === 'circle-blue' || sign.shape === 'rect-blue' ? LIGHT : DARK;
  const body = `${shape()}${glyph(ink)}`;
  writeFileSync(join(outDir, `s_${sign.code}.svg`), open(body), 'utf8');
  generated += 1;
}

for (const marking of markings) {
  const draw = markingShapes[marking.kind];
  if (!draw) {
    missing.push(`marking ${marking.id}: unknown kind "${marking.kind}"`);
    continue;
  }
  const body = `<rect x="0" y="0" width="512" height="512" fill="#1b2029"/>${draw}`;
  writeFileSync(join(outDir, `m_${marking.id}.svg`), open(body), 'utf8');
  generated += 1;
}

writeFileSync(
  join(outDir, 'index.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      signs: signs.map((s) => ({ code: s.code, file: `s_${s.code}.svg`, group: s.group })),
      markings: markings.map((m) => ({ id: m.id, file: `m_${m.id}.svg` })),
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`[signs] generated ${generated} files in apps/web/public/signs`);

if (missing.length) {
  console.error(`[signs] ${missing.length} problem(s):`);
  for (const line of missing) console.error(`  - ${line}`);
  process.exit(1);
}

if (!existsSync(join(outDir, 's_1.22.svg'))) {
  console.error('[signs] sanity check failed: s_1.22.svg missing');
  process.exit(1);
}