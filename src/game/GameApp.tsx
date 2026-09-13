import { useEffect, useRef, useState } from "react";
import {
  Backpack, BookOpen, Map as MapIcon, ScrollText, Settings, Shield,
} from "lucide-react";
import { item } from "./data/items";
import { loadArt, render, screenToTile } from "./engine/render";
import { sfxDie, sfxHit, sfxQuest, sfxStep, sfxUi, setMuted, unlockAudio } from "./engine/audio";
import { Ashfold, type Hud, type Verb } from "./sim/game";
import { SKILLS, type PrayerId, type Stance, type WearSlot } from "./types";
import { xpForLevel } from "./xp";

const TABS = [
  { id: "pack", label: "Pack", Icon: Backpack },
  { id: "gear", label: "Gear", Icon: Shield },
  { id: "skills", label: "Skills", Icon: BookOpen },
  { id: "quests", label: "Quests", Icon: ScrollText },
  { id: "map", label: "Map", Icon: MapIcon },
  { id: "opts", label: "Opts", Icon: Settings },
] as const;

const SLOTS: WearSlot[] = ["weapon", "shield", "head", "body", "legs", "neck"];
const PRAYERS: { id: PrayerId; label: string }[] = [
  { id: "protect", label: "Protect" },
  { id: "strength", label: "Strength" },
  { id: "restore", label: "Restore" },
  { id: "smite", label: "Smite" },
];
const STANCES: Stance[] = ["accurate", "aggressive", "defensive"];

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Ashfold | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const pressRef = useRef<{ t: number; x: number; y: number; long: boolean } | null>(null);
  const lastHp = useRef(19);
  const lastQuest = useRef(0);
  const lastPath = useRef(0);
  const deadFx = useRef(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    loadArt();
    const g = new Ashfold();
    gameRef.current = g;
    setHud(g.snapshot());
    lastHp.current = g.hp;
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      g.update(dt);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (canvas && wrap) {
        const r = wrap.getBoundingClientRect();
        const ctx = canvas.getContext("2d");
        if (ctx) render(ctx, g, r.width, r.height, hoverRef.current);
      }
      if (g.hp < lastHp.current) sfxHit();
      lastHp.current = g.hp;
      if (g.dead && !deadFx.current) { deadFx.current = true; sfxDie(); }
      if (!g.dead) deadFx.current = false;
      const done = Object.values(g.quests).filter((n) => n >= 99).length;
      if (done > lastQuest.current) sfxQuest();
      lastQuest.current = done;
      if (g.player.path.length && now - lastPath.current > 280) {
        lastPath.current = now;
        sfxStep();
      }
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        setHud(g.snapshot());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const save = () => g.save();
    const onVis = () => { if (document.hidden) g.save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVis);
      g.save();
    };
  }, []);

  const tileFromEvent = (e: { clientX: number; clientY: number }) => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !canvas) return null;
    const r = canvas.getBoundingClientRect();
    return screenToTile(g, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) return;
    const g = gameRef.current;
    const t = tileFromEvent(e);
    if (!g || !t) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pressRef.current = { t: performance.now(), x: t.x, y: t.y, long: false };
    if (e.button === 2) {
      const canvas = canvasRef.current!;
      const r = canvas.getBoundingClientRect();
      g.click(t.x, t.y, 2, e.clientX - r.left, e.clientY - r.top);
      setHud(g.snapshot());
      pressRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gameRef.current;
    const t = tileFromEvent(e);
    if (!g || !t) return;
    hoverRef.current = t;
    const ent = g.ents.find((x) => x.hp > 0 && (x.x | 0) === t.x && (x.y | 0) === t.y && x.kind !== "player");
    g.hover = ent ? ent.name : "";
    const p = pressRef.current;
    if (p && !p.long && performance.now() - p.t > 420 && e.pointerType !== "mouse") {
      p.long = true;
      const canvas = canvasRef.current!;
      const r = canvas.getBoundingClientRect();
      g.longPress(p.x, p.y, e.clientX - r.left, e.clientY - r.top);
      setHud(g.snapshot());
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gameRef.current;
    const p = pressRef.current;
    pressRef.current = null;
    if (!g || !p || p.long) return;
    if (g.title || g.dead) return;
    const t = tileFromEvent(e) ?? { x: p.x, y: p.y };
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    g.click(t.x, t.y, 0, e.clientX - r.left, e.clientY - r.top);
    setHud(g.snapshot());
  };

  const act = (fn: (g: Ashfold) => void) => {
    const g = gameRef.current;
    if (!g) return;
    fn(g);
    setHud(g.snapshot());
    sfxUi();
  };

  if (!hud) {
    return (
      <div className="ash-root">
        <div className="ash-title-screen">
          <img src="/art/title.jpg" alt="" className="ash-title-art" />
          <div className="ash-title-veil" />
          <div className="ash-title-copy">
            <p className="ash-kicker">The Long Work</p>
            <h1 className="ash-display">ASHFOLD</h1>
            <p className="ash-lede">
              A mill town nobody important wanted. Click the ground to walk.
              Skills are the class. The grind is the plot.
            </p>
            <p className="ash-hint">The mill wheel is thinking.</p>
          </div>
        </div>
      </div>
    );
  }

  const hh = Math.floor(hud.hour) % 24;
  const mm = Math.floor((hud.hour % 1) * 60);
  const clock = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  const phase = hud.hour < 6 ? "Night" : hud.hour < 8 ? "Dawn" : hud.hour < 18 ? "Day" : hud.hour < 20 ? "Dusk" : "Night";
  const tabOn = (id: string) =>
    hud.panel === id ||
    (id === "pack" && (hud.panel.startsWith("craft") || hud.bankOpen || !!hud.shopOpen));

  return (
    <div className="ash-root">
      <div ref={wrapRef} className="ash-stage">
        <canvas
          ref={canvasRef}
          className="ash-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { pressRef.current = null; }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {hud.title && (
        <div
          className="ash-title-screen"
          onClick={() => act((g) => { unlockAudio(); g.begin(); })}
        >
          <img src="/art/title.jpg" alt="" className="ash-title-art" />
          <div className="ash-title-veil" />
          <div className="ash-title-copy">
            <p className="ash-kicker">The Long Work</p>
            <h1 className="ash-display">ASHFOLD</h1>
            <p className="ash-lede">
              A mill town nobody important wanted. Click the ground to walk.
              Skills are the class. The grind is the plot.
            </p>
            <div className="ash-title-actions">
              <button
                className="ash-btn ash-btn-primary"
                onClick={(e) => { e.stopPropagation(); act((g) => { unlockAudio(); g.begin(); }); }}
              >
                {hud.hasSave ? "Continue the work" : "Begin in Millwake"}
              </button>
              {hud.hasSave && (
                <button
                  className="ash-btn"
                  onClick={(e) => { e.stopPropagation(); act((g) => { unlockAudio(); g.newGame(); }); }}
                >
                  New work
                </button>
              )}
            </div>
            <p className="ash-hint">Click anywhere. Right-click or long-press for verbs. Pack holds 28. Death keeps three.</p>
          </div>
        </div>
      )}

      {hud.dead && (
        <div className="ash-modal-wrap">
          <div className="ash-modal">
            <p className="ash-kicker">The world goes thin</p>
            <h2>You fell</h2>
            <p>Three dearest things stayed. The rest wait on a grave. Return, or lose them to time.</p>
            <button className="ash-btn ash-btn-primary" onClick={() => act((g) => g.respawn())}>
              Wake at a bed
            </button>
          </div>
        </div>
      )}

      {!hud.title && (
        <>
          <header className="ash-top">
            <div>
              <p className="ash-kicker">{hud.regionName}</p>
              <p className="ash-clock">{clock} · {phase} · {hud.season} {hud.day}</p>
            </div>
            <div className="ash-combat">Combat {hud.combat}</div>
          </header>

          <aside className="ash-bars">
            <Meter label="HP" value={hud.hp} max={hud.maxHp} kind="hp" />
            <Meter label="Pray" value={hud.pray} max={hud.maxPray} kind="pray" />
            <Meter label="Run" value={hud.run} max={100} kind="run" />
            <Meter label="Spec" value={hud.spec} max={100} kind="spec" />
            {hud.action ? <p className="ash-action">{hud.action}</p> : null}
            {hud.hover ? <p className="ash-hover">{hud.hover}</p> : null}
          </aside>

          <div className="ash-log" aria-live="polite">
            {hud.messages.slice(0, 5).map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>

          <nav className="ash-phone-bar">
            <button type="button" className="ash-pill" onClick={() => act((g) => g.eatBest())}>Eat</button>
            <button type="button" className={"ash-pill" + (hud.running ? " is-on" : "")} onClick={() => act((g) => { g.running = !g.running; })}>Run</button>
            <button type="button" className="ash-pill" onClick={() => act((g) => g.specAttack())}>Spec</button>
            <button type="button" className={"ash-pill" + (hud.prayers.length ? " is-on" : "")} onClick={() => act((g) => g.togglePray("protect"))}>Pray</button>
            <button type="button" className="ash-pill" onClick={() => setSheet((s) => !s)}>{sheet ? "Close" : "Pack"}</button>
          </nav>

          <aside className={"ash-panel" + (sheet ? " is-open" : "")}>
            <div className="ash-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={"ash-tab" + (tabOn(t.id) ? " is-on" : "")}
                  onClick={() => act((g) => { g.panel = t.id; g.bankOpen = false; g.shopOpen = null; setSheet(true); })}
                  title={t.label}
                >
                  <t.Icon className="size-4" strokeWidth={1.75} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="ash-panel-body">
              {hud.shopOpen ? <ShopView hud={hud} act={act} /> : null}
              {hud.bankOpen ? <BankView hud={hud} act={act} /> : null}
              {hud.craft ? <CraftView hud={hud} act={act} /> : null}
              {!hud.shopOpen && !hud.bankOpen && !hud.craft && hud.panel === "pack" ? <PackView hud={hud} act={act} /> : null}
              {hud.panel === "gear" ? <GearView hud={hud} act={act} /> : null}
              {hud.panel === "skills" ? <SkillsView hud={hud} /> : null}
              {hud.panel === "quests" ? <QuestsView hud={hud} /> : null}
              {hud.panel === "map" ? <MapView hud={hud} /> : null}
              {hud.panel === "opts" ? <OptsView hud={hud} act={act} /> : null}
            </div>
          </aside>

          <div className="ash-desk-actions">
            <button type="button" className="ash-pill" onClick={() => act((g) => g.eatBest())}>Eat</button>
            <button type="button" className={"ash-pill" + (hud.running ? " is-on" : "")} onClick={() => act((g) => { g.running = !g.running; })}>Run</button>
            <button type="button" className="ash-pill" onClick={() => act((g) => g.specAttack())}>Spec</button>
            {PRAYERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={"ash-pill" + (hud.prayers.includes(p.id) ? " is-on" : "")}
                onClick={() => act((g) => g.togglePray(p.id))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {hud.dialogue ? (
        <div className="ash-modal-wrap ash-talk">
          <div className="ash-modal">
            <p className="ash-kicker">{hud.dialogue.read}</p>
            <h2>{hud.dialogue.name}</h2>
            {hud.dialogue.lines.map((l, i) => <p key={i}>{l}</p>)}
            <div className="ash-opts">
              {hud.dialogue.opts.map((o) => (
                <button key={o.id} type="button" className="ash-btn" onClick={() => act((g) => g.choose(o.id))}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {hud.menu ? (
        <ul
          className="ash-menu"
          style={{
            left: Math.min(hud.menu.x, (wrapRef.current?.clientWidth ?? 400) - 180),
            top: Math.min(hud.menu.y, (wrapRef.current?.clientHeight ?? 400) - 220),
          }}
        >
          {hud.menu.verbs.map((v, i) => (
            <li key={i}>
              <button type="button" onClick={() => act((g) => g.doVerb(v as Verb))}>{v.label}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Meter({ label, value, max, kind }: { label: string; value: number; max: number; kind: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={"ash-meter ash-meter-" + kind}>
      <span>{label}</span>
      <div className="ash-meter-track"><div style={{ width: pct + "%" }} /></div>
      <b>{Math.floor(value)}/{Math.floor(max)}</b>
    </div>
  );
}

function PackView({ hud, act }: { hud: Hud; act: (fn: (g: Ashfold) => void) => void }) {
  return (
    <div>
      <div className="ash-row">
        <span>Pack</span>
        <span className="ash-muted">{hud.gold} gp</span>
      </div>
      <div className="ash-inv">
        {hud.inv.map((s, i) => (
          <button
            key={i}
            type="button"
            className={"ash-slot" + (s ? "" : " is-empty")}
            title={s ? item(s.id).examine : "Empty"}
            onClick={() => act((g) => g.wear(i))}
          >
            {s ? (
              <>
                <em>{item(s.id).name}</em>
                {s.qty > 1 ? <small>×{s.qty}</small> : null}
              </>
            ) : null}
          </button>
        ))}
      </div>
      <p className="ash-hint">Tap to wear, eat, or bury. Auto-eat is {hud.autoEat ? "on" : "off"}.</p>
    </div>
  );
}

function GearView({ hud, act }: { hud: Hud; act: (fn: (g: Ashfold) => void) => void }) {
  return (
    <div>
      <div className="ash-row"><span>Worn</span><span className="ash-muted">Stance feeds a skill</span></div>
      <ul className="ash-gear">
        {SLOTS.map((sl) => (
          <li key={sl}>
            <span>{sl}</span>
            {hud.worn[sl] ? (
              <button type="button" className="ash-btn ash-btn-tiny" onClick={() => act((g) => g.unequip(sl))}>
                {item(hud.worn[sl]!).name}
              </button>
            ) : <em className="ash-muted">empty</em>}
          </li>
        ))}
      </ul>
      <div className="ash-stance">
        {STANCES.map((s) => (
          <button key={s} type="button" className={"ash-pill" + (hud.stance === s ? " is-on" : "")} onClick={() => act((g) => { g.stance = s; })}>
            {s}
          </button>
        ))}
      </div>
      <label className="ash-check">
        <input type="checkbox" checked={hud.autoEat} onChange={() => act((g) => { g.autoEat = !g.autoEat; })} />
        Auto-eat below half
      </label>
    </div>
  );
}

function SkillsView({ hud }: { hud: Hud }) {
  return (
    <div>
      <div className="ash-row"><span>Skills</span><span className="ash-muted">Use is the class</span></div>
      <ul className="ash-skills">
        {SKILLS.map((s) => {
          const row = hud.skills[s];
          const cur = xpForLevel(row.lvl);
          const next = xpForLevel(Math.min(99, row.lvl + 1));
          const pct = next <= cur ? 100 : ((row.xp - cur) / Math.max(1, next - cur)) * 100;
          return (
            <li key={s} title={hud.skillInfo[s]}>
              <span>{s}</span>
              <b>{row.lvl}</b>
              <div className="ash-xp"><div style={{ width: Math.max(2, pct) + "%" }} /></div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuestsView({ hud }: { hud: Hud }) {
  const live = hud.quests.filter((q) => !q.done && q.step !== "Locked.");
  const rest = hud.quests.filter((q) => q.done || q.step === "Locked.");
  return (
    <div>
      <div className="ash-row"><span>Jobs</span><span className="ash-muted">{live.length} open</span></div>
      <ul className="ash-quests">
        {live.map((q) => (
          <li key={q.id}>
            <strong>{q.name}</strong>
            <p>{q.step}</p>
          </li>
        ))}
        {rest.map((q) => (
          <li key={q.id} className={q.done ? "is-done" : "is-locked"}>
            <strong>{q.name}</strong>
            <p>{q.step}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MapView({ hud }: { hud: Hud }) {
  return (
    <div>
      <div className="ash-row"><span>Continent</span><span className="ash-muted">Roads on the cardinals</span></div>
      <ul className="ash-map">
        {hud.map.map((r) => (
          <li key={r.id} className={r.here ? "is-here" : ""}>
            {r.name}{r.here ? " · you are here" : ""}
          </li>
        ))}
      </ul>
      <p className="ash-hint">Walk off a map edge to take the road. Carts sell rides at a fee.</p>
    </div>
  );
}

function OptsView({ hud, act }: { hud: Hud; act: (fn: (g: Ashfold) => void) => void }) {
  return (
    <div className="ash-opts-col">
      <p>Click the ground to walk. Hold or right-click for verbs. A pack, a dock cart, a bed.</p>
      <label className="ash-check">
        <input type="checkbox" checked={hud.autoEat} onChange={() => act((g) => { g.autoEat = !g.autoEat; })} />
        Auto-eat
      </label>
      <label className="ash-check">
        <input type="checkbox" onChange={(e) => setMuted(e.target.checked)} />
        Mute the mill
      </label>
      <button type="button" className="ash-btn" onClick={() => act((g) => g.save())}>Save now</button>
      <button
        type="button"
        className="ash-btn"
        onClick={() => { if (window.confirm("Abandon this work?")) act((g) => g.newGame()); }}
      >
        New work
      </button>
      <p className="ash-hint">Progress lives in this browser. Close the window; the mill remembers.</p>
    </div>
  );
}

function ShopView({ hud, act }: { hud: Hud; act: (fn: (g: Ashfold) => void) => void }) {
  return (
    <div>
      <div className="ash-row">
        <span>Trade</span>
        <button type="button" className="ash-btn ash-btn-tiny" onClick={() => act((g) => { g.shopOpen = null; g.panel = "pack"; })}>Close</button>
      </div>
      <ul className="ash-list">
        {hud.shopStock.map((s) => (
          <li key={s.id}>
            <button type="button" className="ash-btn" disabled={s.qty <= 0} onClick={() => act((g) => g.buy(s.id))}>
              {item(s.id).name} · {s.gp}gp · ×{s.qty}
            </button>
          </li>
        ))}
      </ul>
      <p className="ash-hint">Tap pack items to sell. Listed prices are a starting posture.</p>
      <div className="ash-inv ash-inv-sm">
        {hud.inv.map((s, i) => (
          <button key={i} type="button" className={"ash-slot" + (s ? "" : " is-empty")} onClick={() => s && act((g) => g.sell(i))}>
            {s ? item(s.id).name : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function BankView({ hud, act }: { hud: Hud; act: (fn: (g: Ashfold) => void) => void }) {
  return (
    <div>
      <div className="ash-row">
        <span>The box</span>
        <button type="button" className="ash-btn ash-btn-tiny" onClick={() => act((g) => { g.bankOpen = false; g.panel = "pack"; })}>Close</button>
      </div>
      <p className="ash-hint">Tap pack to deposit. Tap a stored stack to withdraw.</p>
      <div className="ash-inv ash-inv-sm">
        {hud.inv.map((s, i) => (
          <button key={i} type="button" className={"ash-slot" + (s ? "" : " is-empty")} onClick={() => s && act((g) => g.deposit(i))}>
            {s ? item(s.id).name : ""}
          </button>
        ))}
      </div>
      <ul className="ash-list">
        {hud.bank.map((s, i) => (
          <li key={i}>
            <button type="button" className="ash-btn" onClick={() => act((g) => g.withdraw(i))}>
              {item(s.id).name} ×{s.qty}
            </button>
          </li>
        ))}
        {hud.bank.length === 0 ? <li className="ash-muted">Empty. The lid is patient.</li> : null}
      </ul>
    </div>
  );
}

function CraftView({ hud, act }: { hud: Hud; act: (fn: (g: Ashfold) => void) => void }) {
  const c = hud.craft!;
  return (
    <div>
      <div className="ash-row">
        <span>{c.station}</span>
        <button type="button" className="ash-btn ash-btn-tiny" onClick={() => act((g) => { g.panel = "pack"; })}>Close</button>
      </div>
      <ul className="ash-list">
        {c.list.map((r) => (
          <li key={r.out + r.need}>
            <button type="button" className={"ash-btn" + (r.have ? "" : " is-dim")} onClick={() => act((g) => g.craft(r.out, c.station))}>
              {item(r.out).name} ×{r.n} <small>lv {r.lvl} · {r.need}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
