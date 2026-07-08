/* Détail d'un type de séance (à placer dans la note du type, ex. Push.md) :
   await dv.view("Sport/_scripts/type-detail");
   Le nom du fichier courant = nom du type. */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const type = dv.current().file.name;
const el = dv.el("div", "");

const occ = lib
  .sessionsAsc(dv)
  .filter((p) => String(p.type) === type)
  .map((p) => {
    const groups = lib.groupSets(lib.getSets(p));
    return {
      page: p,
      path: p.file.path,
      dateStr: lib.pageDateStr(p),
      groups,
      total: groups.reduce((s, g) => s + g.total, 0),
      fun: lib.funAvg(lib.getSets(p)),
      dur: lib.durationMin(p),
      humeur: p.humeur,
      objectif: Number(p.objectif) || null,
    };
  });

if (!occ.length) {
  el.innerHTML = `<em>Aucune séance « ${lib.esc(type)} » enregistrée pour l'instant.</em>`;
} else {
  let html = "";

  /* Dernière séance de ce type — sert de récap avant d'en démarrer une nouvelle */
  const last = occ[occ.length - 1];
  html +=
    `<div style="border:1px solid var(--background-modifier-border);border-radius:10px;` +
    `padding:12px 16px;margin-bottom:14px;">` +
    `<div style="font-weight:700;margin-bottom:6px;">Dernière séance : ${lib.ilink(last.path, last.dateStr)}</div>` +
    `<div style="display:flex;gap:1.6em;flex-wrap:wrap;margin-bottom:8px;">` +
    `<span style="font-size:1.5em;font-weight:800;color:var(--text-accent);">${lib.fmtKg(last.total)}</span>` +
    `<span>⏱ ${lib.fmtDuration(last.dur)}</span>` +
    `<span>fun ${lib.funStr(last.fun)}/5</span>` +
    `<span>${lib.humeurLabel(last.humeur)}</span>` +
    `</div>` +
    last.groups
      .map(
        (g) =>
          `<div style="display:flex;justify-content:space-between;gap:1em;font-size:0.9em;` +
          `border-top:1px solid var(--background-modifier-border);padding:2px 0;">` +
          `<span>${lib.esc(g.exo)} <span style="color:var(--text-muted);">(${g.sets
            .map((s) => `${s.reps}×${lib.fmtNum(s.poids)}`)
            .join(", ")})</span></span>` +
          `<strong>${lib.fmtKg(g.total)}</strong></div>`
      )
      .join("") +
    `</div>`;

  /* Graphiques : total et durée par occurrence */
  html += lib.svgChart(
    occ.map((o) => ({ label: o.dateStr, y: o.total })),
    { unit: "kg", title: "Total séance (kg)" }
  );
  const durPts = occ.filter((o) => o.dur != null).map((o) => ({ label: o.dateStr, y: o.dur }));
  if (durPts.length) html += lib.svgChart(durPts, { unit: "min", color: "var(--color-orange)", title: "Durée (min)" });

  /* Historique du plus récent au plus ancien */
  const rows = occ
    .map((o, i) => ({
      o,
      dTotal: lib.fmtDelta(o.total, i > 0 ? occ[i - 1].total : null),
      dDur: lib.fmtDelta(o.dur, i > 0 ? occ[i - 1].dur : null, "min"),
    }))
    .reverse()
    .map(({ o, dTotal, dDur }) => {
      const objCell = o.objectif ? `${lib.fmtNum(o.objectif)} ${o.total >= o.objectif ? "✅" : "❌"}` : "—";
      return (
        `<tr style="border-top:1px solid var(--background-modifier-border);">` +
        `<td style="padding:3px 12px 3px 0;white-space:nowrap;">${lib.ilink(o.path, o.dateStr)}</td>` +
        `<td style="padding:3px 12px 3px 0;font-weight:800;font-size:1.15em;color:var(--text-accent);white-space:nowrap;">${lib.fmtKg(o.total)}</td>` +
        `<td style="padding:3px 12px 3px 0;white-space:nowrap;">${dTotal}</td>` +
        `<td style="padding:3px 12px 3px 0;">${lib.fmtDuration(o.dur)}</td>` +
        `<td style="padding:3px 12px 3px 0;white-space:nowrap;">${dDur}</td>` +
        `<td style="padding:3px 12px 3px 0;">${lib.funStr(o.fun)}</td>` +
        `<td style="padding:3px 12px 3px 0;">${lib.humeurLabel(o.humeur)}</td>` +
        `<td style="padding:3px 0;white-space:nowrap;">${objCell}</td>` +
        `</tr>`
      );
    })
    .join("");

  html +=
    `<div style="overflow-x:auto;margin-top:8px;"><table style="font-size:0.88em;border-collapse:collapse;width:100%;">` +
    `<tr style="color:var(--text-muted);text-align:left;">` +
    `<th style="padding:0 12px 2px 0;">Date</th><th style="padding:0 12px 2px 0;">Total</th>` +
    `<th style="padding:0 12px 2px 0;">Δ total</th><th style="padding:0 12px 2px 0;">Durée</th>` +
    `<th style="padding:0 12px 2px 0;">Δ durée</th><th style="padding:0 12px 2px 0;">Fun</th>` +
    `<th style="padding:0 12px 2px 0;">Humeur</th><th>Objectif</th></tr>` +
    rows +
    `</table></div>`;

  el.innerHTML = html;
}
