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
    for (const g of lib.groupSets(lib.getSetsFor(dv, p))) {
      if (!byExo.has(g.exo)) byExo.set(g.exo, []);
      byExo.get(g.exo).push({
        path: p.file.path,
        dateStr: lib.pageDateStr(p),
        type: String(p.type ?? ""),
        kind: g.kind,
        total: g.total,
        min: g.min,
        km: g.km,
        pdcInconnu: g.pdcInconnu,
        fun: g.fun,
        sets: g.sets,
        main: lib.groupMain(g),
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
    const kind = occ[occ.length - 1].kind;
    const unit = occ[occ.length - 1].main.unit;

    html +=
      `<div style="border:1px solid var(--background-modifier-border);border-radius:10px;` +
      `padding:12px 16px;margin-bottom:14px;">` +
      `<div style="font-weight:700;font-size:1.15em;margin-bottom:6px;">${lib.esc(exo)}</div>`;

    /* stats de tête selon le type d'exercice */
    if (kind === "temps") {
      const record = Math.max(...occ.map((o) => o.min));
      const cumul = occ.reduce((a, o) => a + o.min, 0);
      html +=
        `<div style="display:flex;gap:2em;flex-wrap:wrap;margin-bottom:8px;">` +
        `<span>🏆 Record de durée : <strong>${lib.fmtDuration(record)}</strong></span>` +
        `<span>⏱ Cumul : <strong>${lib.fmtDuration(cumul)}</strong></span>` +
        `</div>`;
    } else if (kind === "distance") {
      const record = Math.max(...occ.map((o) => o.km));
      const cumul = occ.reduce((a, o) => a + o.km, 0);
      const allures = allSets.map((s) => s.allure).filter((a) => a != null);
      const bestAllure = allures.length ? Math.min(...allures) : null;
      html +=
        `<div style="display:flex;gap:2em;flex-wrap:wrap;margin-bottom:8px;">` +
        `<span>🏆 Record de distance : <strong>${lib.fmtKm(record)}</strong></span>` +
        `<span>📏 Cumul : <strong>${lib.fmtKm(cumul)}</strong></span>` +
        `<span>🚀 Meilleure allure : <strong>${lib.fmtAllure(bestAllure)}</strong></span>` +
        `</div>`;
    } else {
      const best = lib.bestSet(allSets);
      const rm = best ? lib.epley(best.reps, best.poids) : null;
      const pdcNote =
        kind === "pdc"
          ? ` <span style="color:var(--text-muted);font-size:0.8em;">(poids de corps${allSets.some((s) => s.lest) ? " + lest" : ""})</span>`
          : "";
      html +=
        `<div style="display:flex;gap:2em;flex-wrap:wrap;margin-bottom:8px;">` +
        `<span>🏆 Meilleure série : <strong>${best ? `${best.reps} × ${lib.fmtKg(best.poids)}` : "—"}</strong>${pdcNote}</span>` +
        `<span>💪 1RM estimé : <strong>${rm != null ? lib.fmtKg(rm) : "—"}</strong>` +
        ` <span style="color:var(--text-muted);font-size:0.8em;">(estimation, formule d'Epley)</span></span>` +
        `</div>`;
    }

    /* graphique par occurrence, dans l'unité du type */
    const titles = { kg: "Total par séance (kg)", min: "Durée par séance (min)", km: "Distance par séance (km)" };
    const colors = { kg: "var(--text-accent)", min: "var(--color-orange)", km: "var(--color-cyan)" };
    const pts = occ.filter((o) => o.main.val != null).map((o) => ({ label: o.dateStr, y: o.main.val }));
    if (pts.length) html += lib.svgChart(pts, { unit, color: colors[unit], title: titles[unit] });

    /* historique du plus récent au plus ancien, avec delta vs occurrence précédente */
    const rows = occ
      .map((o, i) => ({
        o,
        delta: lib.fmtDelta(o.main.val, i > 0 ? occ[i - 1].main.val : null, unit),
      }))
      .reverse()
      .map(({ o, delta }) => {
        const series = o.sets.map((s) => lib.setDesc(s)).join(", ");
        return (
          `<tr style="border-top:1px solid var(--background-modifier-border);">` +
          `<td style="padding:3px 12px 3px 0;white-space:nowrap;">${lib.ilink(o.path, o.dateStr)}</td>` +
          `<td style="padding:3px 12px 3px 0;">${lib.esc(o.type)}</td>` +
          `<td style="padding:3px 12px 3px 0;font-weight:800;font-size:1.15em;color:var(--text-accent);white-space:nowrap;">${o.main.str}</td>` +
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
