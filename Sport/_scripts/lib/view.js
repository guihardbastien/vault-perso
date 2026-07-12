/* Bibliothèque partagée des vues Sport.
   Chargement depuis un bloc dataviewjs :
     const lib = {};
     await dv.view("Sport/_scripts/lib", lib);
   Les fonctions sont alors disponibles sur `lib`. */

const HUMEURS = { mauvais: "😞 mauvais", ok: "😐 ok", bon: "😀 bon" };

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtNum(n, dec = 1) {
  return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: dec });
}

function fmtKg(n) {
  return `${fmtNum(n)} kg`;
}

function funStr(f) {
  return f == null ? "—" : fmtNum(f);
}

function humeurLabel(h) {
  return HUMEURS[String(h)] ?? (h ? String(h) : "—");
}

function pageDateStr(p) {
  const d = p.date;
  if (d && typeof d.toFormat === "function") return d.toFormat("yyyy-MM-dd");
  return String(d ?? "");
}

function sortKey(p) {
  return pageDateStr(p) + "T" + String(p.debut ?? "00:00");
}

/* Racine de la personne dont dépend la note courante : "Sport/Athlètes/<Personne>".
   Fonctionne depuis toute note d'un dossier personne (Historique, type, séance…). */
function personRoot(dv) {
  return dv.current().file.path.split("/").slice(0, 3).join("/");
}

/* Toutes les séances de la personne courante (pages de Sport/Athlètes/<Personne>/Séances
   avec type + date), triées chronologiquement. */
function sessionsAsc(dv) {
  return dv
    .pages(`"${personRoot(dv)}/Séances"`)
    .values.filter((p) => p.type && p.date)
    .sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
}

/* Séries d'une page : items de liste portant les champs inline exo/reps/poids. */
function getSets(page) {
  const lists = page.file?.lists ? Array.from(page.file.lists) : [];
  return lists
    .filter((l) => l.exo !== undefined && l.reps !== undefined && l.poids !== undefined)
    .map((l) => {
      const reps = Number(l.reps);
      const poids = Number(l.poids);
      return {
        exo: String(l.exo),
        reps,
        poids,
        fun: l.fun !== undefined && l.fun !== null ? Number(l.fun) : null,
        douleur: l.douleur !== undefined && l.douleur !== null ? String(l.douleur) : null,
        gravite: l.gravite !== undefined && l.gravite !== null ? String(l.gravite) : null,
        total: reps * poids,
      };
    })
    .filter((s) => !isNaN(s.total));
}

function funAvg(sets) {
  const fs = sets.map((s) => s.fun).filter((f) => f != null && !isNaN(f));
  if (!fs.length) return null;
  return fs.reduce((a, b) => a + b, 0) / fs.length;
}

/* Regroupe les séries par exercice, dans l'ordre d'apparition. */
function groupSets(sets) {
  const m = new Map();
  for (const s of sets) {
    if (!m.has(s.exo)) m.set(s.exo, []);
    m.get(s.exo).push(s);
  }
  return [...m.entries()].map(([exo, ss]) => ({
    exo,
    sets: ss,
    total: ss.reduce((a, s) => a + s.total, 0),
    fun: funAvg(ss),
  }));
}

function parseHM(s) {
  const m = String(s ?? "").match(/^(\d{1,2})[:h](\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/* Durée en minutes entre debut et fin (gère le passage de minuit). */
function durationMin(p) {
  const a = parseHM(p.debut);
  const b = parseHM(p.fin);
  if (a == null || b == null) return null;
  return b >= a ? b - a : b + 24 * 60 - a;
}

function fmtDuration(min) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

/* "▲ +121,5 kg (+4,3 %)" / "▼ −4 min" — ou "—" sans occurrence précédente. */
function fmtDelta(cur, prev, unit = "kg") {
  if (prev == null || cur == null) return "—";
  const d = cur - prev;
  const sign = d >= 0 ? "▲ +" : "▼ −";
  let pct = "";
  if (prev !== 0) pct = ` (${d >= 0 ? "+" : "−"}${fmtNum(Math.abs((d / prev) * 100))} %)`;
  return `${sign}${fmtNum(Math.abs(d))} ${unit}${pct}`;
}

function bestSet(sets) {
  let best = null;
  for (const s of sets) {
    if (!best || s.poids > best.poids || (s.poids === best.poids && s.reps > best.reps)) best = s;
  }
  return best;
}

/* 1RM estimé — formule d'Epley : poids × (1 + reps / 30), arrondi au kg. */
function epley(reps, poids) {
  return Math.round(poids * (1 + reps / 30));
}

function painStr(s) {
  if (!s.douleur) return "";
  return `⚠️ ${s.douleur}${s.gravite ? ` (${s.gravite})` : ""}`;
}

function ilink(path, text) {
  const p = esc(path);
  return `<a class="internal-link" data-href="${p}" href="${p}" target="_blank" rel="noopener">${esc(text)}</a>`;
}

/* Graphique en ligne SVG — points : [{ label, y }] dans l'ordre chronologique. */
function svgChart(points, { unit = "kg", color = "var(--text-accent)", height = 180, title = "" } = {}) {
  if (!points.length) return "";
  const w = 560;
  const h = height;
  const pad = { t: 16, r: 16, b: 26, l: 52 };
  const ys = points.map((p) => p.y);
  const dMin = Math.min(...ys);
  const dMax = Math.max(...ys);
  let lo = dMin;
  let hi = dMax;
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const X = (i) => (points.length === 1 ? pad.l + iw / 2 : pad.l + (i / (points.length - 1)) * iw);
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;

  const grid = [dMin, (dMin + dMax) / 2, dMax]
    .map((v) => {
      const y = Y(v).toFixed(1);
      return (
        `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="var(--background-modifier-border)" stroke-width="1"/>` +
        `<text x="${pad.l - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--text-muted)">${fmtNum(v, 0)}</text>`
      );
    })
    .join("");

  const poly = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");

  const dots = points
    .map(
      (p, i) =>
        `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5" fill="${color}">` +
        `<title>${esc(p.label)} : ${fmtNum(p.y)} ${unit}</title></circle>`
    )
    .join("");

  const first = points[0].label;
  const last = points[points.length - 1].label;
  const xlabels =
    `<text x="${pad.l}" y="${h - 8}" font-size="10" fill="var(--text-muted)">${esc(first)}</text>` +
    (points.length > 1
      ? `<text x="${w - pad.r}" y="${h - 8}" text-anchor="end" font-size="10" fill="var(--text-muted)">${esc(last)}</text>`
      : "");

  const cap = title
    ? `<div style="font-size:0.8em;color:var(--text-muted);margin-bottom:2px;">${esc(title)}</div>`
    : "";

  return (
    `<div style="overflow-x:auto;">${cap}` +
    `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;">` +
    grid +
    `<polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2"/>` +
    dots +
    xlabels +
    `</svg></div>`
  );
}

Object.assign(input, {
  esc,
  fmtNum,
  fmtKg,
  funStr,
  humeurLabel,
  pageDateStr,
  personRoot,
  sessionsAsc,
  getSets,
  funAvg,
  groupSets,
  durationMin,
  fmtDuration,
  fmtDelta,
  bestSet,
  epley,
  painStr,
  ilink,
  svgChart,
});
