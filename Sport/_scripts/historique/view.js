/* Historique global des séances — usage :
   await dv.view("Sport/_scripts/historique"); */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const sessions = lib.sessionsAsc(dv);
const el = dv.el("div", "");

if (!sessions.length) {
  el.innerHTML = `<em>Aucune séance enregistrée pour l'instant.</em>`;
} else {
  const rows = [...sessions]
    .reverse()
    .map((p) => {
      const sets = lib.getSetsFor(dv, p);
      const sum = lib.sumSets(sets);
      const total = sum.kg;
      const fun = lib.funAvg(sets);
      const obj = Number(p.objectif) || null;
      const objCell = obj ? `${lib.fmtNum(obj)} ${total >= obj ? "✅" : "❌"}` : "—";
      const cardio = [];
      if (sum.min > 0) cardio.push(lib.fmtDuration(sum.min));
      if (sum.km > 0) cardio.push(lib.fmtKm(sum.km));
      const typePath = `${lib.personRoot(dv)}/Types de séance/${String(p.type)}.md`;
      return (
        `<tr style="border-top:1px solid var(--background-modifier-border);">` +
        `<td style="padding:4px 14px 4px 0;white-space:nowrap;">${lib.ilink(p.file.path, lib.pageDateStr(p))}</td>` +
        `<td style="padding:4px 14px 4px 0;">${lib.ilink(typePath, String(p.type))}</td>` +
        `<td style="padding:4px 14px 4px 0;font-weight:800;font-size:1.1em;color:var(--text-accent);white-space:nowrap;">${lib.fmtKg(total)}${sum.pdcInconnu ? " ⚠️" : ""}</td>` +
        `<td style="padding:4px 14px 4px 0;white-space:nowrap;">${cardio.length ? cardio.join(" · ") : "—"}</td>` +
        `<td style="padding:4px 14px 4px 0;white-space:nowrap;">${objCell}</td>` +
        `<td style="padding:4px 14px 4px 0;">${lib.funStr(fun)}</td>` +
        `<td style="padding:4px 14px 4px 0;">${lib.humeurLabel(p.humeur)}</td>` +
        `<td style="padding:4px 0;">${lib.fmtDuration(lib.durationMin(p))}</td>` +
        `</tr>`
      );
    })
    .join("");

  el.innerHTML =
    `<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;">` +
    `<tr style="color:var(--text-muted);text-align:left;font-size:0.9em;">` +
    `<th style="padding:0 14px 4px 0;">Date</th><th style="padding:0 14px 4px 0;">Type</th>` +
    `<th style="padding:0 14px 4px 0;">Total</th><th style="padding:0 14px 4px 0;">Cardio</th>` +
    `<th style="padding:0 14px 4px 0;">Objectif</th>` +
    `<th style="padding:0 14px 4px 0;">Fun</th><th style="padding:0 14px 4px 0;">Humeur</th>` +
    `<th>Durée</th></tr>` +
    rows +
    `</table></div>`;
}
