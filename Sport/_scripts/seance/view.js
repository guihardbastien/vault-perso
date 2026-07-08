/* Tableau de bord d'une note de séance — usage dans la note :
   await dv.view("Sport/_scripts/seance"); */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const p = dv.current();
const el = dv.el("div", "");
const sets = lib.getSets(p);

if (!sets.length) {
  el.innerHTML =
    `<em>Aucune série pour l'instant — lance la commande <strong>« ➕ Sport : Ajouter une série »</strong> (Cmd+P).</em>`;
} else {
  const groups = lib.groupSets(sets);
  const total = groups.reduce((s, g) => s + g.total, 0);
  const fun = lib.funAvg(sets);
  const dur = lib.durationMin(p);
  const obj = Number(p.objectif) || null;

  let html = "";

  if (obj) {
    const hit = total >= obj;
    const pct = Math.min(100, (total / obj) * 100);
    html += `<div style="margin:0.4em 0 0.8em 0;">`;
    if (hit) {
      html +=
        `<div style="padding:8px 12px;margin-bottom:6px;border-radius:8px;` +
        `background:var(--background-modifier-success);font-weight:700;">` +
        `🎉 Objectif atteint ! ${lib.fmtKg(total)} / ${lib.fmtKg(obj)}</div>`;
    }
    html +=
      `<div style="font-size:0.95em;margin-bottom:4px;">🎯 <strong>${lib.fmtKg(total)}</strong> / ${lib.fmtKg(obj)}` +
      ` <span style="color:var(--text-muted);">(${lib.fmtNum(pct, 0)} %)</span></div>` +
      `<div style="height:8px;border-radius:4px;background:var(--background-modifier-border);">` +
      `<div style="height:8px;width:${pct.toFixed(1)}%;border-radius:4px;background:var(--text-accent);"></div></div>` +
      `</div>`;
  }

  html +=
    `<div style="display:flex;gap:1.6em;flex-wrap:wrap;align-items:baseline;margin-bottom:0.6em;">` +
    `<span>Total séance : <strong style="font-size:1.25em;">${lib.fmtKg(total)}</strong></span>` +
    `<span>Fun : <strong>${lib.funStr(fun)}</strong>/5</span>` +
    `<span>Humeur : ${lib.humeurLabel(p.humeur)}</span>` +
    `<span>${p.fin ? "⏱ " + lib.fmtDuration(dur) : "⏱ séance en cours…"}</span>` +
    `</div>`;

  for (const g of groups) {
    const rows = g.sets
      .map((s, i) => {
        const pain = lib.painStr(s);
        return (
          `<tr>` +
          `<td style="color:var(--text-muted);padding:1px 10px 1px 0;">${i + 1}</td>` +
          `<td style="padding:1px 10px 1px 0;">${s.reps} × ${lib.fmtKg(s.poids)}</td>` +
          `<td style="padding:1px 10px 1px 0;">= ${lib.fmtKg(s.total)}</td>` +
          `<td style="padding:1px 10px 1px 0;">fun ${lib.funStr(s.fun)}</td>` +
          `<td style="padding:1px 0;color:var(--text-error);">${lib.esc(pain)}</td>` +
          `</tr>`
        );
      })
      .join("");

    html +=
      `<div style="border:1px solid var(--background-modifier-border);border-radius:10px;` +
      `padding:10px 14px;margin-bottom:10px;">` +
      `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:1em;flex-wrap:wrap;">` +
      `<span style="font-weight:600;font-size:1.05em;">${lib.esc(g.exo)}</span>` +
      `<span style="font-size:1.9em;font-weight:800;color:var(--text-accent);white-space:nowrap;">${lib.fmtKg(g.total)}</span>` +
      `</div>` +
      `<div style="color:var(--text-muted);font-size:0.85em;margin-bottom:4px;">` +
      `fun ${lib.funStr(g.fun)}/5 · ${g.sets.length} série${g.sets.length > 1 ? "s" : ""}</div>` +
      `<div style="overflow-x:auto;"><table style="font-size:0.85em;border-collapse:collapse;">${rows}</table></div>` +
      `</div>`;
  }

  el.innerHTML = html;
}
