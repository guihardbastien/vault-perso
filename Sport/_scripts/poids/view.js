/* Évolution du poids de corps — à placer dans Sport/Athlètes/<P>/Poids.md :
   await dv.view("Sport/_scripts/poids");
   Affiche le poids de référence (moyenne 7 jours glissants), le graphique
   pesées brutes + moyenne glissante, et les dernières pesées. */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const el = dv.el("div", "");
const ws = lib.weighIns(dv);

if (!ws.length) {
  el.innerHTML = `<em>Aucune pesée pour l'instant — lance la commande <strong>« ⚖️ Sport : Ajouter le poids »</strong> (Cmd+P).</em>`;
} else {
  const derniere = ws[ws.length - 1];
  const ref = lib.bodyWeightAt(ws, derniere.date);

  let html =
    `<div style="display:flex;gap:2em;flex-wrap:wrap;align-items:baseline;margin-bottom:0.8em;">` +
    `<span>Poids de référence (moy. 7 j) : <strong style="font-size:1.4em;color:var(--text-accent);">${lib.fmtKg(ref)}</strong></span>` +
    `<span>Dernière pesée : <strong>${lib.fmtKg(derniere.poids)}</strong> (${derniere.date})</span>` +
    `<span>${ws.length} pesée${ws.length > 1 ? "s" : ""}</span>` +
    `</div>`;

  /* Courbes : pesées brutes + moyenne glissante 7 jours à chaque date de pesée */
  const brut = ws.map((w) => ({ label: w.date, y: w.poids }));
  const moy = ws.map((w) => ({ label: w.date, y: lib.bodyWeightAt(ws, w.date) }));
  html += lib.svgChartMulti(
    [
      { name: "Pesées", color: "var(--text-muted)", points: brut },
      { name: "Moyenne 7 j", color: "var(--text-accent)", points: moy },
    ],
    { unit: "kg", title: "Évolution du poids (kg)" }
  );

  /* Dernières pesées, de la plus récente à la plus ancienne */
  const rows = [...ws]
    .reverse()
    .slice(0, 30)
    .map(
      (w) =>
        `<tr style="border-top:1px solid var(--background-modifier-border);">` +
        `<td style="padding:3px 14px 3px 0;white-space:nowrap;">${w.date}</td>` +
        `<td style="padding:3px 0;font-weight:600;">${lib.fmtKg(w.poids)}</td>` +
        `</tr>`
    )
    .join("");
  html +=
    `<div style="overflow-x:auto;margin-top:8px;"><table style="font-size:0.9em;border-collapse:collapse;">` +
    `<tr style="color:var(--text-muted);text-align:left;"><th style="padding:0 14px 4px 0;">Date</th><th>Poids</th></tr>` +
    rows +
    `</table></div>`;

  el.innerHTML = html;
}
