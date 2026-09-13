import type { Ashfold, Ent, Float } from "../sim/game";
import { tileAt, type MapData } from "../world/mapgen";
import { REGIONS } from "../data/world";
import { NPCS } from "../data/world";
import type { Tile } from "../types";

const TILE = 32;
const sheets: Record<string, HTMLCanvasElement | HTMLImageElement> = {};
const textures: Record<string, HTMLImageElement> = {};
let groundCache: { id: string; c: HTMLCanvasElement; hour: number; rev: number } | null = null;

export function loadArt() {
  const s = ["player", "rat", "hada", "ora", "bram", "cow", "goblin"];
  for (const n of s) {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => { sheets[n] = chroma(im); };
    im.src = `/sprites/${n}.png`;
    sheets[n] = im;
  }
  for (const n of ["grass", "cobble", "water", "dirt", "wood"]) {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.src = `/tiles/${n}.jpg`;
    textures[n] = im;
  }
}

function chroma(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d");
  if (!x || !img.naturalWidth) return img;
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
    const mag = (r - 255) * (r - 255) + g * g + (b - 255) * (b - 255);
    const pink = r > 160 && b > 90 && g < 150 && r > g + 25 && (r + b) > g * 2;
    if (mag < 22000 || pink) d.data[i + 3] = 0;
  }
  x.putImageData(d, 0, 0);
  return c;
}

export function render(ctx: CanvasRenderingContext2D, g: Ashfold, w: number, h: number, hover: { x: number; y: number } | null) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (ctx.canvas.width !== Math.floor(w * dpr) || ctx.canvas.height !== Math.floor(h * dpr)) {
    ctx.canvas.width = Math.floor(w * dpr);
    ctx.canvas.height = Math.floor(h * dpr);
    ctx.canvas.style.width = w + "px";
    ctx.canvas.style.height = h + "px";
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const camX = g.cam.x * TILE - w / 2;
  const camY = g.cam.y * TILE - h / 2;
  ctx.fillStyle = "#0c0a08";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(-camX, -camY);
  drawGround(ctx, g);
  drawPath(ctx, g);
  const list = [...g.ents.filter((e) => e.hp > 0), ...g.fires.map((f) => ({ kind: "fire" as const, x: f.x, y: f.y }))];
  list.sort((a, b) => a.y - b.y);
  for (const gi of g.ground) drawItem(ctx, gi.x * TILE, gi.y * TILE);
  ctx.imageSmoothingEnabled = false;
  for (const o of list) {
    if ("kind" in o && o.kind === "fire") drawFire(ctx, o.x * TILE, o.y * TILE, g.time);
    else drawEnt(ctx, o as Ent, g);
  }
  ctx.imageSmoothingEnabled = true;
  for (const f of g.floats) drawFloat(ctx, f);
  if (hover) {
    ctx.strokeStyle = "rgba(232,220,200,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(hover.x * TILE + 1, hover.y * TILE + 1, TILE - 2, TILE - 2);
  }
  ctx.restore();
  drawLight(ctx, g, w, h);
  drawRadar(ctx, g, w, h);
}

function drawGround(ctx: CanvasRenderingContext2D, g: Ashfold) {
  const m = g.map;
  const hourBand = Math.floor(g.hour);
  if (!groundCache || groundCache.id !== m.id || groundCache.rev !== g.mapRev || Math.abs(groundCache.hour - hourBand) > 2) {
    const c = document.createElement("canvas");
    c.width = m.w * TILE;
    c.height = m.h * TILE;
    const cctx = c.getContext("2d")!;
    cctx.imageSmoothingEnabled = true;
    paintMap(cctx, m, g);
    groundCache = { id: m.id, c, hour: hourBand, rev: g.mapRev };
  }
  ctx.drawImage(groundCache.c, 0, 0);
  ctx.globalAlpha = 0.12 + Math.sin(g.time * 1.4) * 0.04;
  ctx.fillStyle = "#8ec4c8";
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const t = tileAt(m, x, y);
      if (t === "water" || t === "fish" || t === "deep") {
        if (((x + y + Math.floor(g.time * 2)) & 3) === 0) ctx.fillRect(x * TILE + 8, y * TILE + ((Math.floor(g.time * 3) + x) % TILE), 10, 2);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function paintMap(ctx: CanvasRenderingContext2D, m: MapData, g: Ashfold) {
  const wealth = REGIONS[m.id]?.wealth ?? 0.4;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const t = tileAt(m, x, y);
      const px = x * TILE, py = y * TILE;
      const tex = texFor(t);
      const img = tex && textures[tex]?.complete && textures[tex].naturalWidth ? textures[tex] : null;
      if (img) {
        const ox = (x * 17) % 224, oy = (y * 13) % 224;
        ctx.drawImage(img, ox, oy, TILE, TILE, px, py, TILE, TILE);
        if (t === "plaza" && wealth < 0.4) {
          ctx.fillStyle = "rgba(40,30,20,0.18)";
          ctx.fillRect(px, py, TILE, TILE);
        }
      } else {
        ctx.fillStyle = colorFor(t, x, y);
        ctx.fillRect(px, py, TILE, TILE);
        if (t === "path") {
          ctx.fillStyle = "rgba(90,70,50,0.25)";
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        }
      }
      decorate(ctx, t, px, py, x, y, wealth);
    }
  }
  for (const b of m.buildings) drawBuilding(ctx, b, wealth);
  for (const p of m.props) drawProp(ctx, p);
}

function texFor(t: Tile): string | null {
  if (t === "grass" || t === "tree" || t === "oak" || t === "yew" || t === "willow" || t === "maple" || t === "flax" || t === "farm" || t === "hops") return "grass";
  if (t === "plaza" || t === "path" || t === "shrine" || t === "bank" || t === "stall") return "cobble";
  if (t === "water" || t === "deep" || t === "fish" || t === "dock" || t === "reeds") return "water";
  if (t === "dirt" || t === "sand" || t === "ash" || t === "swamp" || t === "grave" || t === "copper" || t === "tin" || t === "iron" || t === "coal" || t === "stone" || t === "clay") return "dirt";
  if (t === "floor" || t === "bed" || t === "anvil" || t === "furnace" || t === "range" || t === "vat" || t === "door") return "wood";
  return null;
}

function colorFor(t: Tile, x: number, y: number): string {
  const n = ((x * 73 + y * 37) & 7);
  const pal: Record<string, string> = {
    snow: n > 3 ? "#d8e0e8" : "#c8d4e0", ice: "#b8d0dc", lava: n > 4 ? "#c04020" : "#a02818",
    wall: "#2a221c", swamp: "#2a3a28", sand: "#c4a068", ash: "#4a4038",
    crystal: "#7ab0b8", mithril: "#5a6a88", adamant: "#3a6a48", runite: "#4a5a78",
    mushroom: "#3a4a32", trap: "#4a3a28", altar: "#3a3a48", hops: "#3a5a32",
  };
  return pal[t] ?? "#3a4a32";
}

function decorate(ctx: CanvasRenderingContext2D, t: Tile, px: number, py: number, x: number, y: number, wealth: number) {
  if (t === "tree" || t === "oak" || t === "yew" || t === "willow" || t === "maple") {
    const col = t === "oak" ? "#2a4a28" : t === "yew" ? "#1a3a28" : t === "willow" ? "#3a5a40" : "#2e4a30";
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(px + 13, py + 18, 6, 10);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 14, t === "oak" ? 14 : 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20,40,20,0.35)";
    ctx.beginPath();
    ctx.ellipse(px + 14, py + 12, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t === "wall") {
    ctx.fillStyle = "#1a1410";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#3a322c";
    ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
  }
  if (t === "door") {
    ctx.fillStyle = "#3a2a20";
    ctx.fillRect(px + 8, py + 4, 16, 24);
    ctx.fillStyle = "#c4a060";
    ctx.fillRect(px + 20, py + 16, 3, 3);
  }
  if (t === "water" || t === "deep") {
    ctx.fillStyle = t === "deep" ? "rgba(10,20,30,0.35)" : "rgba(40,80,90,0.2)";
    ctx.fillRect(px, py, TILE, TILE);
  }
  if (t === "dock") {
    ctx.fillStyle = "#6a5038";
    ctx.fillRect(px, py + 10, TILE, 8);
    ctx.fillStyle = "#4a3828";
    ctx.fillRect(px + 4, py + 8, 4, 16);
  }
  if (t === "fish") {
    ctx.fillStyle = "#d0d8c8";
    ctx.fillRect(px + 12, py + 14, 8, 4);
  }
  if (t === "copper" || t === "tin" || t === "iron" || t === "coal" || t === "mithril" || t === "adamant" || t === "runite" || t === "stone" || t === "clay" || t === "crystal") {
    const c = t === "copper" ? "#c07030" : t === "tin" ? "#a0a090" : t === "iron" ? "#6a6a70" : t === "coal" ? "#1a1a18" : t === "mithril" ? "#6888b0" : t === "adamant" ? "#3a8a58" : t === "crystal" ? "#80d0d8" : "#8a8a80";
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 22);
    ctx.lineTo(px + 16, py + 8);
    ctx.lineTo(px + 26, py + 22);
    ctx.closePath();
    ctx.fill();
  }
  if (t === "farm" || t === "hops" || t === "flax") {
    ctx.fillStyle = t === "flax" ? "#6a8a50" : "#6a5a30";
    for (let i = 0; i < 6; i++) ctx.fillRect(px + 4 + (i * 4), py + 10, 2, 12);
  }
  if (t === "shrine") {
    ctx.fillStyle = "#d0c8b0";
    ctx.fillRect(px + 10, py + 8, 12, 18);
    ctx.fillStyle = "#8a4030";
    ctx.fillRect(px + 14, py + 4, 4, 6);
  }
  if (t === "bank") {
    ctx.fillStyle = "#3a3a48";
    ctx.fillRect(px + 6, py + 8, 20, 16);
    ctx.fillStyle = "#c4a060";
    ctx.fillRect(px + 12, py + 12, 8, 8);
  }
  if (t === "bed") {
    ctx.fillStyle = "#5a3040";
    ctx.fillRect(px + 4, py + 8, 24, 16);
    ctx.fillStyle = "#d0c8b0";
    ctx.fillRect(px + 6, py + 10, 8, 8);
  }
  if (t === "range" || t === "furnace") {
    ctx.fillStyle = "#3a3030";
    ctx.fillRect(px + 6, py + 8, 20, 18);
    ctx.fillStyle = "#c05020";
    ctx.fillRect(px + 12, py + 14, 8, 8);
  }
  if (t === "anvil") {
    ctx.fillStyle = "#4a4a50";
    ctx.fillRect(px + 8, py + 12, 16, 10);
    ctx.fillRect(px + 14, py + 8, 6, 6);
  }
  if (t === "vat") {
    ctx.fillStyle = "#4a3a28";
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 18, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t === "stall" || t === "crate") {
    ctx.fillStyle = "#6a5038";
    ctx.fillRect(px + 6, py + 10, 20, 14);
    ctx.fillStyle = "#8a6a40";
    ctx.fillRect(px + 6, py + 8, 20, 4);
  }
  if (t === "grave") {
    ctx.fillStyle = "#8a8a80";
    ctx.fillRect(px + 11, py + 8, 10, 16);
  }
  if (t === "altar") {
    ctx.fillStyle = "#d8e0e8";
    ctx.beginPath();
    ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t === "mushroom") {
    ctx.fillStyle = "#8a4a68";
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 14, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d0c8b0";
    ctx.fillRect(px + 14, py + 14, 4, 10);
  }
  if (t === "lava") {
    ctx.fillStyle = "#e07030";
    ctx.fillRect(px + 8, py + 8, 6, 6);
  }
  if (wealth > 0.6 && (t === "plaza" || t === "path") && (x + y) % 9 === 0) {
    ctx.fillStyle = "rgba(196,160,96,0.25)";
    ctx.fillRect(px + 14, py + 4, 3, 8);
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number; roof: string; name?: string }, wealth: number) {
  const px = b.x * TILE, py = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
  const roofH = Math.max(TILE * 2, h - TILE);
  ctx.fillStyle = "#241c16";
  ctx.fillRect(px, py, w, roofH);
  ctx.fillStyle = wealth > 0.5 ? "#4a4038" : "#3a322c";
  ctx.fillRect(px + 2, py + 8, w - 4, roofH - 10);
  ctx.fillStyle = b.roof;
  ctx.beginPath();
  ctx.moveTo(px - 4, py + 12);
  ctx.lineTo(px + w / 2, py - 10);
  ctx.lineTo(px + w + 4, py + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(232,220,200,0.12)";
  ctx.beginPath();
  ctx.moveTo(px + w / 2, py - 8);
  ctx.lineTo(px + w / 2, py + roofH - 6);
  ctx.stroke();
  if (b.name) {
    ctx.fillStyle = "rgba(12,10,8,0.62)";
    ctx.fillRect(px + 4, py + h + 2, Math.min(w - 8, b.name.length * 6 + 8), 12);
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "600 10px Figtree, sans-serif";
    ctx.fillText(b.name, px + 8, py + h + 12);
  }
}

function drawProp(ctx: CanvasRenderingContext2D, p: { x: number; y: number; kind: string }) {
  const px = p.x * TILE, py = p.y * TILE;
  if (p.kind === "well" || p.kind === "fountain") {
    ctx.fillStyle = "#6a6a70";
    ctx.beginPath();
    ctx.arc(px + 16, py + 16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a4a58";
    ctx.beginPath();
    ctx.arc(px + 16, py + 16, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.kind === "lamp") {
    ctx.fillStyle = "#3a3028";
    ctx.fillRect(px + 14, py + 8, 4, 18);
    ctx.fillStyle = "#e0c070";
    ctx.beginPath();
    ctx.arc(px + 16, py + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.kind === "table" || p.kind === "desk") {
    ctx.fillStyle = "#5a4030";
    ctx.fillRect(px + 4, py + 10, 24, 12);
  }
  if (p.kind === "wheel") {
    ctx.strokeStyle = "#6a5038";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 16, py + 16, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnt(ctx: CanvasRenderingContext2D, e: Ent, g: Ashfold) {
  const swing = e.swing != null && g.time - e.swing < 0.22 ? (0.22 - (g.time - e.swing)) * 18 : 0;
  const ox = e.dir === 1 ? -swing : e.dir === 2 ? swing : 0;
  const oy = e.dir === 3 ? -swing : e.dir === 0 ? swing : 0;
  const px = e.x * TILE + ox, py = e.y * TILE + oy;
  const bob = Math.sin(g.time * (e.path.length ? 10 : 2.2) + e.x) * (e.path.length ? 1.4 : 0.6);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(px, py + 10, 8 * e.size, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const sheet = e.sprite && sheets[e.sprite];
  const ready = sheet && ((sheet instanceof HTMLImageElement) ? sheet.complete && sheet.naturalWidth : sheet.width);
  if (sheet && ready) {
    const cols = e.sprite === "player" ? 4 : 2;
    const rows = e.sprite === "player" ? 4 : 2;
    const cw = sheet.width / cols, ch = sheet.height / rows;
    const row = e.sprite === "player" ? e.dir : Math.floor((g.time * 2 + e.x) % 2);
    const col = e.sprite === "player" ? (e.path.length ? Math.floor(g.time * 8) % 4 : 0) : Math.floor((g.time * 2) % 2);
    const dw = 36 * e.size, dh = 36 * e.size;
    ctx.drawImage(sheet, col * cw, row * ch, cw, ch, px - dw / 2, py - dh + 8 + bob, dw, dh);
  } else {
    paintPerson(ctx, e, px, py + bob, g);
  }
  if (e.kind !== "player") {
    ctx.fillStyle = "rgba(12,10,8,0.7)";
    ctx.font = "600 10px Figtree, sans-serif";
    const label = e.name;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(px - tw / 2 - 3, py - 28 * e.size, tw + 6, 12);
    ctx.fillStyle = "#e8dcc8";
    ctx.fillText(label, px - tw / 2, py - 19 * e.size);
  }
  if (e.hp < e.maxHp && e.kind !== "worker") {
    ctx.fillStyle = "#2a1814";
    ctx.fillRect(px - 10, py + 12, 20, 3);
    ctx.fillStyle = "#b4443a";
    ctx.fillRect(px - 10, py + 12, 20 * (e.hp / e.maxHp), 3);
  }
}

function paintPerson(ctx: CanvasRenderingContext2D, e: Ent, px: number, py: number, g: Ashfold) {
  const s = 11 * e.size;
  if (e.kind === "creature") {
    ctx.fillStyle = e.hue;
    ctx.beginPath();
    ctx.ellipse(px, py, s, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1210";
    ctx.fillRect(px - 3, py - 3, 2, 2);
    ctx.fillRect(px + 2, py - 3, 2, 2);
    if (e.def.includes("rat")) {
      ctx.strokeStyle = e.hue;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + s, py);
      ctx.quadraticCurveTo(px + s + 10, py + 4, px + s + 8, py + 8);
      ctx.stroke();
    }
    if (e.def.includes("wolf") || e.def.includes("hound") || e.def.includes("lynx")) {
      ctx.beginPath();
      ctx.moveTo(px - 4, py - s * 0.6);
      ctx.lineTo(px - 1, py - s);
      ctx.lineTo(px + 1, py - s * 0.6);
      ctx.fill();
    }
    if (e.def.includes("spider")) {
      ctx.strokeStyle = e.hue;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px - 4, py);
        ctx.lineTo(px - 12, py - 6 + i * 4);
        ctx.stroke();
      }
    }
    return;
  }
  if (e.kind === "caravan") {
    ctx.fillStyle = "#6a4a28";
    ctx.fillRect(px - 14, py - 10, 28, 16);
    ctx.fillStyle = "#3a2a18";
    ctx.beginPath();
    ctx.arc(px - 8, py + 8, 5, 0, Math.PI * 2);
    ctx.arc(px + 8, py + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const npc = e.kind === "npc" ? NPCS[e.def] : null;
  ctx.fillStyle = npc?.cloth ?? e.hue;
  ctx.beginPath();
  ctx.ellipse(px, py + 2, s * 0.7, s * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = npc?.hair ?? "#3a2a20";
  ctx.beginPath();
  ctx.arc(px, py - s * 0.7, s * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8d0b0";
  ctx.beginPath();
  ctx.arc(px, py - s * 0.55, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

function drawFire(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.fillStyle = `rgba(220,90,30,${0.5 + Math.sin(t * 9) * 0.2})`;
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 14 + Math.sin(t * 8) * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c060";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawItem(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#c4a060";
  ctx.fillRect(x - 4, y - 4, 8, 8);
}

function drawPath(ctx: CanvasRenderingContext2D, g: Ashfold) {
  if (!g.player.path.length) return;
  ctx.fillStyle = "rgba(232,220,200,0.35)";
  for (const p of g.player.path) {
    ctx.beginPath();
    ctx.arc(p.x * TILE + 16, p.y * TILE + 16, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloat(ctx: CanvasRenderingContext2D, f: Float) {
  ctx.globalAlpha = Math.max(0, 1 - f.t);
  ctx.fillStyle = f.color;
  ctx.font = "700 12px Figtree, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(f.text, f.x * TILE, f.y * TILE - f.t * 22);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function drawLight(ctx: CanvasRenderingContext2D, g: Ashfold, w: number, h: number) {
  const hr = g.hour;
  let a = 0, col = "8,10,18";
  if (hr < 5 || hr > 21) { a = 0.45; col = "6,8,16"; }
  else if (hr < 7) { a = 0.28; col = "40,24,20"; }
  else if (hr > 19) { a = 0.32; col = "30,18,22"; }
  else if (hr > 17) { a = 0.12; col = "50,28,18"; }
  if (g.region === "underkiln" || g.region === "deepvault" || g.region === "mill_cellar") { a = 0.4; col = "20,10,8"; }
  if (a > 0) {
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawRadar(ctx: CanvasRenderingContext2D, g: Ashfold, w: number, h: number) {
  const rw = 112, rh = 84;
  const pad = 10;
  const x0 = w - rw - pad;
  const y0 = h - rh - pad - (w < 900 ? 56 : 8);
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  ctx.strokeStyle = "rgba(176,141,87,0.45)";
  ctx.lineWidth = 1;
  ctx.fillRect(x0, y0, rw, rh);
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, rw - 1, rh - 1);
  const m = g.map;
  const px = g.player.x | 0, py = g.player.y | 0;
  const spanX = 18, spanY = 14;
  const tw = rw / (spanX * 2 + 1), th = rh / (spanY * 2 + 1);
  for (let j = -spanY; j <= spanY; j++) {
    for (let i = -spanX; i <= spanX; i++) {
      const t = tileAt(m, px + i, py + j);
      ctx.fillStyle = radarColor(t);
      ctx.fillRect(x0 + (i + spanX) * tw, y0 + (j + spanY) * th, tw + 0.4, th + 0.4);
    }
  }
  for (const e of g.ents) {
    if (e.hp <= 0 || e.kind === "player") continue;
    const dx = (e.x | 0) - px, dy = (e.y | 0) - py;
    if (Math.abs(dx) > spanX || Math.abs(dy) > spanY) continue;
    ctx.fillStyle = e.kind === "creature" ? "#b4443a" : e.kind === "npc" ? "#cfc09a" : "#6a8f62";
    ctx.fillRect(x0 + (dx + spanX) * tw + 1, y0 + (dy + spanY) * th + 1, 3, 3);
  }
  ctx.fillStyle = "#e8dcc8";
  ctx.fillRect(x0 + spanX * tw, y0 + spanY * th, 4, 4);
}

function radarColor(t: Tile): string {
  if (t === "water" || t === "deep" || t === "fish") return "#2a4a58";
  if (t === "wall") return "#1a1410";
  if (t === "plaza" || t === "path" || t === "dock") return "#6a5a48";
  if (t === "tree" || t === "oak" || t === "yew" || t === "willow" || t === "maple") return "#2a4a28";
  if (t === "door") return "#c4a060";
  if (t === "sand" || t === "dirt") return "#6a5038";
  if (t === "floor") return "#4a3a30";
  if (t === "lava") return "#a04020";
  if (t === "snow" || t === "ice") return "#8aa0b0";
  return "#3a4a32";
}

export function screenToTile(g: Ashfold, sx: number, sy: number, w: number, h: number) {
  const camX = g.cam.x * TILE - w / 2;
  const camY = g.cam.y * TILE - h / 2;
  return { x: Math.floor((sx + camX) / TILE), y: Math.floor((sy + camY) / TILE) };
}
