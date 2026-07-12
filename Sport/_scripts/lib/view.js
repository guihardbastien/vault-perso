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

function fmtKm(n) {
  return `${fmtNum(n, 2)} km`;
}

/* Allure en min/km → "6:15 min/km". */
function fmtAllure(minPerKm) {
  if (minPerKm == null || !isFinite(minPerKm)) return "—";
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} min/km`;
}

/* Nombre depuis une valeur dataview (gère "62,5" et les nombres). */
function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
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

/* Pesées de la personne courante (Sport/Athlètes/<P>/Poids.md), triées par date :
   [{ date: "YYYY-MM-DD", poids }]. */
function weighIns(dv) {
  if (dv.__sportWeighIns) return dv.__sportWeighIns;
  const page = dv.page(`${personRoot(dv)}/Poids.md`);
  const lists = page?.file?.lists ? Array.from(page.file.lists) : [];
  const out = lists
    .filter((l) => l.date !== undefined && l.poids !== undefined)
    .map((l) => {
      const d = l.date;
      const date = d && typeof d.toFormat === "function" ? d.toFormat("yyyy-MM-dd") : String(d ?? "");
      return { date, poids: toNum(l.poids) };
    })
    .filter((w) => w.date && w.poids != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  dv.__sportWeighIns = out;
  return out;
}

/* Poids de corps de référence à une date : moyenne des pesées des 7 jours
   glissants se terminant à dateStr ; sinon pesée la plus récente antérieure ;
   sinon null. */
function bodyWeightAt(ws, dateStr) {
  if (!ws.length || !dateStr) return ws.length ? ws[ws.length - 1].poids : null;
  const end = new Date(dateStr + "T00:00:00");
  const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  const startStr = start.toISOString().slice(0, 10);
  const fen = ws.filter((w) => w.date >= startStr && w.date <= dateStr);
  if (fen.length) return fen.reduce((a, w) => a + w.poids, 0) / fen.length;
  const avant = ws.filter((w) => w.date <= dateStr);
  return avant.length ? avant[avant.length - 1].poids : null;
}

/* Séries d'une page : items de liste portant un champ exo + une mesure.
   Types : muscu (reps × poids), pdc (reps × poids de corps + lest éventuel),
   temps (duree en minutes), distance (km + duree optionnelle → allure).
   `bw` = poids de corps de référence (kg) pour les séries pdc, ou null. */
function getSets(page, bw = null) {
  const lists = page.file?.lists ? Array.from(page.file.lists) : [];
  const sets = [];
  for (const l of lists) {
    if (l.exo === undefined) continue;
    const base = {
      exo: String(l.exo),
      fun: l.fun !== undefined && l.fun !== null ? Number(l.fun) : null,
      douleur: l.douleur !== undefined && l.douleur !== null ? String(l.douleur) : null,
      gravite: l.gravite !== undefined && l.gravite !== null ? String(l.gravite) : null,
      reps: null,
      poids: null,
      lest: 0,
      duree: null,
      km: null,
      allure: null,
      total: null,
    };
    if (l.pdc) {
      const reps = toNum(l.reps);
      if (reps == null) continue;
      const lest = toNum(l.lest) ?? 0;
      const charge = bw != null ? bw + lest : null;
      sets.push({
        ...base,
        kind: "pdc",
        reps,
        poids: charge,
        lest,
        total: charge != null ? reps * charge : null,
      });
    } else if (l.km !== undefined && l.km !== null) {
      const km = toNum(l.km);
      if (km == null) continue;
      const duree = toNum(l.duree);
      sets.push({
        ...base,
        kind: "distance",
        km,
        duree,
        allure: duree != null && km > 0 ? duree / km : null,
      });
    } else if (l.duree !== undefined && l.duree !== null) {
      const duree = toNum(l.duree);
      if (duree == null) continue;
      sets.push({ ...base, kind: "temps", duree });
    } else if (l.reps !== undefined && l.poids !== undefined) {
      const reps = toNum(l.reps);
      const poids = toNum(l.poids);
      if (reps == null || poids == null) continue;
      sets.push({ ...base, kind: "muscu", reps, poids, total: reps * poids });
    }
  }
  return sets;
}

/* getSets avec le poids de corps de la personne résolu à la date de la page. */
function getSetsFor(dv, page) {
  return getSets(page, bodyWeightAt(weighIns(dv), pageDateStr(page)));
}

/* Cumuls d'un ensemble de séries : kg déplacés (muscu + pdc), minutes, km,
   et nombre de séries pdc au total inconnu (aucune pesée). */
function sumSets(sets) {
  const out = { kg: 0, min: 0, km: 0, pdcInconnu: 0 };
  for (const s of sets) {
    if (s.total != null) out.kg += s.total;
    else if (s.kind === "pdc") out.pdcInconnu++;
    if (s.duree != null && s.kind === "temps") out.min += s.duree;
    if (s.km != null) out.km += s.km;
  }
  return out;
}

/* Description courte d'une série : "8 × 60 kg", "10 × PDC+10 kg", "45 min",
   "2 km en 12 min (6:00 min/km)". */
function setDesc(s) {
  if (s.kind === "pdc") {
    const lest = s.lest ? `+${fmtNum(s.lest)} kg` : "";
    return `${s.reps} × PDC${lest}`;
  }
  if (s.kind === "temps") return fmtDuration(s.duree);
  if (s.kind === "distance") {
    let d = fmtKm(s.km);
    if (s.duree != null) d += ` en ${fmtDuration(s.duree)} (${fmtAllure(s.allure)})`;
    return d;
  }
  return `${s.reps} × ${fmtKg(s.poids)}`;
}

/* Valeur principale d'un groupe selon son type : kg, minutes ou km. */
function groupMain(g) {
  if (g.kind === "temps") return { val: g.min, str: fmtDuration(g.min), unit: "min" };
  if (g.kind === "distance") return { val: g.km, str: fmtKm(g.km), unit: "km" };
  if (g.kind === "pdc" && g.pdcInconnu) return { val: null, str: "— kg", unit: "kg" };
  return { val: g.total, str: fmtKg(g.total), unit: "kg" };
}

function funAvg(sets) {
  const fs = sets.map((s) => s.fun).filter((f) => f != null && !isNaN(f));
  if (!fs.length) return null;
  return fs.reduce((a, b) => a + b, 0) / fs.length;
}

/* Regroupe les séries par exercice, dans l'ordre d'apparition.
   `kind` = type de la première série ; total (kg), min, km = cumuls du groupe. */
function groupSets(sets) {
  const m = new Map();
  for (const s of sets) {
    if (!m.has(s.exo)) m.set(s.exo, []);
    m.get(s.exo).push(s);
  }
  return [...m.entries()].map(([exo, ss]) => {
    const sum = sumSets(ss);
    return {
      exo,
      sets: ss,
      kind: ss[0].kind,
      total: sum.kg,
      min: sum.min,
      km: sum.km,
      pdcInconnu: sum.pdcInconnu,
      fun: funAvg(ss),
    };
  });
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

/* Meilleure série en charge (muscu / pdc avec pesée connue). */
function bestSet(sets) {
  let best = null;
  for (const s of sets) {
    if (s.poids == null || s.reps == null) continue;
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

/* Graphique multi-courbes SVG — series : [{ name, color, points: [{label, y}] }],
   toutes les courbes partagent l'axe X de la série la plus longue. */
function svgChartMulti(series, { unit = "kg", height = 200, title = "" } = {}) {
  const all = series.flatMap((s) => s.points);
  if (!all.length) return "";
  const w = 560;
  const h = height;
  const pad = { t: 16, r: 16, b: 26, l: 52 };
  const ys = all.map((p) => p.y);
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
  const n = Math.max(...series.map((s) => s.points.length));
  const X = (i, len) => (len === 1 ? pad.l + iw / 2 : pad.l + (i / (len - 1)) * iw);
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;

  const grid = [dMin, (dMin + dMax) / 2, dMax]
    .map((v) => {
      const y = Y(v).toFixed(1);
      return (
        `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="var(--background-modifier-border)" stroke-width="1"/>` +
        `<text x="${pad.l - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--text-muted)">${fmtNum(v, 1)}</text>`
      );
    })
    .join("");

  const curves = series
    .map((s) => {
      const len = s.points.length;
      const poly = s.points.map((p, i) => `${X(i, len).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
      const dots = s.points
        .map(
          (p, i) =>
            `<circle cx="${X(i, len).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3" fill="${s.color}">` +
            `<title>${esc(s.name)} — ${esc(p.label)} : ${fmtNum(p.y)} ${unit}</title></circle>`
        )
        .join("");
      return `<polyline points="${poly}" fill="none" stroke="${s.color}" stroke-width="2"/>` + dots;
    })
    .join("");

  const ref = series.find((s) => s.points.length === n).points;
  const xlabels =
    `<text x="${pad.l}" y="${h - 8}" font-size="10" fill="var(--text-muted)">${esc(ref[0].label)}</text>` +
    (n > 1
      ? `<text x="${w - pad.r}" y="${h - 8}" text-anchor="end" font-size="10" fill="var(--text-muted)">${esc(ref[n - 1].label)}</text>`
      : "");

  const legend = series
    .map(
      (s) =>
        `<span style="margin-right:1.2em;"><span style="display:inline-block;width:10px;height:10px;` +
        `border-radius:5px;background:${s.color};margin-right:4px;"></span>${esc(s.name)}</span>`
    )
    .join("");
  const cap = title
    ? `<div style="font-size:0.8em;color:var(--text-muted);margin-bottom:2px;">${esc(title)}</div>`
    : "";

  return (
    `<div style="overflow-x:auto;">${cap}` +
    `<div style="font-size:0.8em;margin-bottom:2px;">${legend}</div>` +
    `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;">` +
    grid +
    curves +
    xlabels +
    `</svg></div>`
  );
}

Object.assign(input, {
  esc,
  fmtNum,
  fmtKg,
  fmtKm,
  fmtAllure,
  toNum,
  funStr,
  humeurLabel,
  pageDateStr,
  personRoot,
  sessionsAsc,
  weighIns,
  bodyWeightAt,
  getSets,
  getSetsFor,
  sumSets,
  setDesc,
  groupMain,
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
  svgChartMulti,
});
