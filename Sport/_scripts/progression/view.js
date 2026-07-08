/* Progression par exercice — usage :
   await dv.view("Sport/_scripts/progression"); */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const sessions = lib.sessionsAsc(dv);
const el = dv.el("div", "");

if (!sessions.length) {
  el.innerHTML = `<em>Aucune séance enregistrée pour l'instant.</em>`;
} else {
  /* occurrences chronologiques par exercice */
  const byExo = new Map();
  for (const p of sessions) {
    for (const g of lib.groupSets(lib.getSets(p))) {
      if (!byExo.has(g.exo)) byExo.set(g.exo, []);
      byExo.get(g.exo).push({
        path: p.file.path,
        dateStr: lib.pageDateStr(p),
        type: String(p.type ?? ""),
        total: g.total,
        fun: g.fun,
        sets: g.sets,
      });
    }
  }

  /* exercices triés par utilisation la plus récente */
  const exos = [...byExo.entries()].sort((a, b) =>
    a[1][a[1].length - 1].dateStr < b[1][b[1].length - 1].dateStr ? 1 : -1
  );

  let html = "";

  for (const [exo, occ] of exos) {
    const allSets = occ.flatMap((o) => o.sets);
    const best = lib.bestSet(allSets);
    const rm = best ? lib.epley(best.reps, best.poids) : null;

    html +=
      `<div style="border:1px solid var(--background-modifier-border);border-radius:10px;` +
      `padding:12px 16px;margin-bottom:14px;">` +
      `<div style="font-weight:700;font-size:1.15em;margin-bottom:6px;">${lib.esc(exo)}</div>`;

    /* stats de tête : best set + 1RM estimé */
    html +=
      `<div style="display:flex;gap:2em;flex-wrap:wrap;margin-bottom:8px;">` +
      `<span>🏆 Meilleure série : <strong>${best ? `${best.reps} × ${lib.fmtKg(best.poids)}` : "—"}</strong></span>` +
      `<span>💪 1RM estimé : <strong>${rm != null ? lib.fmtKg(rm) : "—"}</strong>` +
      ` <span style="color:var(--text-muted);font-size:0.8em;">(estimation, formule d'Epley)</span></span>` +
      `</div>`;

    /* graphique total par occurrence */
    html += lib.svgChart(
      occ.map((o) => ({ label: o.dateStr, y: o.total })),
      { unit: "kg", title: "Total par séance (kg)" }
    );

    /* historique du plus récent au plus ancien, avec delta vs occurrence précédente */
    const rows = occ
      .map((o, i) => ({ o, delta: lib.fmtDelta(o.total, i > 0 ? occ[i - 1].total : null) }))
      .reverse()
      .map(({ o, delta }) => {
        const series = o.sets.map((s) => `${s.reps}×${lib.fmtNum(s.poids)}`).join(", ");
        return (
          `<tr style="border-top:1px solid var(--background-modifier-border);">` +
          `<td style="padding:3px 12px 3px 0;white-space:nowrap;">${lib.ilink(o.path, o.dateStr)}</td>` +
          `<td style="padding:3px 12px 3px 0;">${lib.esc(o.type)}</td>` +
          `<td style="padding:3px 12px 3px 0;font-weight:800;font-size:1.15em;color:var(--text-accent);white-space:nowrap;">${lib.fmtKg(o.total)}</td>` +
          `<td style="padding:3px 12px 3px 0;white-space:nowrap;">${delta}</td>` +
          `<td style="padding:3px 12px 3px 0;">fun ${lib.funStr(o.fun)}</td>` +
          `<td style="padding:3px 0;color:var(--text-muted);">${lib.esc(series)}</td>` +
          `</tr>`
        );
      })
      .join("");

    html +=
      `<div style="overflow-x:auto;margin-top:6px;"><table style="font-size:0.88em;border-collapse:collapse;width:100%;">` +
      `<tr style="color:var(--text-muted);text-align:left;">` +
      `<th style="padding:0 12px 2px 0;">Date</th><th style="padding:0 12px 2px 0;">Type</th>` +
      `<th style="padding:0 12px 2px 0;">Total</th><th style="padding:0 12px 2px 0;">Δ précédent</th>` +
      `<th style="padding:0 12px 2px 0;">Fun</th><th>Séries</th></tr>` +
      rows +
      `</table></div></div>`;
  }

  el.innerHTML = html;
}
