/* Vue d'ensemble des types de séance — usage :
   await dv.view("Sport/_scripts/types"); */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const sessions = lib.sessionsAsc(dv);
const el = dv.el("div", "");

if (!sessions.length) {
  el.innerHTML = `<em>Aucune séance enregistrée pour l'instant.</em>`;
} else {
  const byType = new Map();
  for (const p of sessions) {
    const t = String(p.type);
    if (!byType.has(t)) byType.set(t, []);
    const total = lib.groupSets(lib.getSets(p)).reduce((s, g) => s + g.total, 0);
    byType.get(t).push({ path: p.file.path, dateStr: lib.pageDateStr(p), total });
  }

  const types = [...byType.entries()].sort((a, b) =>
    a[1][a[1].length - 1].dateStr < b[1][b[1].length - 1].dateStr ? 1 : -1
  );

  const rows = types
    .map(([t, occ]) => {
      const last = occ[occ.length - 1];
      const record = Math.max(...occ.map((o) => o.total));
      const typePath = `Sport/Types de séance/${t}.md`;
      return (
        `<tr style="border-top:1px solid var(--background-modifier-border);">` +
        `<td style="padding:4px 14px 4px 0;font-weight:600;">${lib.ilink(typePath, t)}</td>` +
        `<td style="padding:4px 14px 4px 0;">${occ.length}</td>` +
        `<td style="padding:4px 14px 4px 0;white-space:nowrap;">${lib.ilink(last.path, last.dateStr)}</td>` +
        `<td style="padding:4px 14px 4px 0;font-weight:800;font-size:1.1em;color:var(--text-accent);white-space:nowrap;">${lib.fmtKg(last.total)}</td>` +
        `<td style="padding:4px 0;white-space:nowrap;">${lib.fmtKg(record)}</td>` +
        `</tr>`
      );
    })
    .join("");

  el.innerHTML =
    `<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;">` +
    `<tr style="color:var(--text-muted);text-align:left;font-size:0.9em;">` +
    `<th style="padding:0 14px 4px 0;">Type</th><th style="padding:0 14px 4px 0;">Séances</th>` +
    `<th style="padding:0 14px 4px 0;">Dernière</th><th style="padding:0 14px 4px 0;">Dernier total</th>` +
    `<th>Record</th></tr>` +
    rows +
    `</table></div>` +
    `<p style="color:var(--text-muted);font-size:0.85em;">Clique sur un type pour voir son historique complet, ses graphiques de total et de durée.</p>`;
}
