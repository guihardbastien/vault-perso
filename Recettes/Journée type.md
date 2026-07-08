# Journée type

> [!info] Branché sur [[Macronutriments]] et [[Aliments]]
> Ce menu lit les cibles dans `Santé/Macronutriments` et les valeurs nutritionnelles dans la base [[Aliments]], puis **recalcule les quantités de chaque aliment** pour coller aux macros de chaque repas. Change ton poids, la répartition des repas ou les macros d'un aliment → les grammages s'ajustent ici tout seuls.
> Pour changer la composition des repas : édite la liste `MENUS` dans le bloc de code ci-dessous (les noms doivent exister dans [[Aliments]]).

```dataviewjs
const m = dv.page("Santé/Macronutriments.md");
if (!m) {
  dv.paragraph("❌ Note `Santé/Macronutriments` introuvable — le menu ne peut pas se calculer.");
} else {

// ── Cibles journalières (même logique que la note Macronutriments) ──
const bf = m.body_fat_pct / 100;
const lbm = m.poids_kg * (1 - bf);
const bmr = 370 + 21.6 * lbm;
const tdee = Math.round(bmr * m.facteur_activite + m.ajustement_kcal);
const kcal = (m.kcal_manuel ?? 0) > 0 ? m.kcal_manuel : tdee;

const protG = Math.round(m.prot_g_par_kg_lbm * lbm);
const reste = kcal - protG * 4;
const lipG = Math.round(reste * m.lipides_pct_reste / 100 / 9);
const gluG = Math.round(reste * (100 - m.lipides_pct_reste) / 100 / 4);

dv.paragraph(`**Cibles du jour** (depuis [[Macronutriments]]) : **${kcal} kcal** · 🥩 ${protG} g · 🥑 ${lipG} g · 🍚 ${gluG} g`);

// ── Aliments : lus depuis la base [[Aliments]] (champs p/l/g pour 100 g) ──
const dbPage = dv.page("Recettes/Aliments.md");
const ALIMENTS = {};
if (dbPage) {
  for (const i of dbPage.file.lists) {
    if (i.p === undefined || i.l === undefined || i.g === undefined) continue;
    const nom = i.text.replace(/\[[^\]]*::[^\]]*\]/g, "").replace(/\^[\w-]+\s*$/, "").trim();
    ALIMENTS[nom] = { p: i.p, l: i.l, g: i.g, id: i.blockId };
  }
}
// Lien direct vers la ligne de l'aliment (bloc ^id) ; sinon vers la page
const lien = (nom) => ALIMENTS[nom]?.id
  ? dv.blockLink("Recettes/Aliments.md", ALIMENTS[nom].id, false, nom)
  : dv.fileLink("Recettes/Aliments.md", false, nom);
const lienMd = (nom) => ALIMENTS[nom]?.id
  ? `[[Aliments#^${ALIMENTS[nom].id}|${nom}]]`
  : `[[Aliments|${nom}]]`;

// Par repas : "fixes" = quantité imposée, "vars" = [source protéines, source glucides, source lipides]
// dont les grammages sont résolus pour atteindre la cible du repas.
const MENUS = [
  { nom: "🌅 Petit-déjeuner", pct: m.repas_petit_dej_pct,
    fixes: [["Banane", 100]],
    vars: ["Skyr nature", "Flocons d'avoine", "Beurre d'amande"] },
  { nom: "🌞 Déjeuner", pct: m.repas_dejeuner_pct,
    fixes: [["Légumes verts", 200]],
    vars: ["Blanc de poulet", "Riz basmati (cru)", "Huile d'olive"] },
  { nom: "🍎 Collation", pct: m.repas_collation_pct,
    fixes: [],
    vars: ["Whey", "Dattes", "Amandes"] },
  { nom: "🌙 Dîner", pct: m.repas_diner_pct,
    fixes: [["Légumes verts", 200]],
    vars: ["Pavé de saumon", "Patate douce", "Avocat"] },
];

// ── Garde-fou : tous les aliments du menu doivent exister dans la base ──
const manquants = [...new Set(MENUS.flatMap(mn => mn.vars.concat(mn.fixes.map(f => f[0]))))]
  .filter(n => !ALIMENTS[n]);
if (manquants.length) {
  dv.paragraph(`❌ **Aliments absents de [[Aliments]]** : ${manquants.join(", ")} — ajoute-les à la base ou corrige les noms dans \`MENUS\`. Les repas concernés sont ignorés.`);
}
const complet = (mn) => mn.vars.concat(mn.fixes.map(f => f[0])).every(n => ALIMENTS[n]);

// ── Résolution : système 3×3 (Cramer) pour caler P/L/G du repas ──
const det3 = (M) =>
  M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
  M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
  M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

const jour = { p: 0, l: 0, g: 0 };
const courses = {};
const promptRepas = [];

for (const menu of MENUS) {
  if (!complet(menu)) continue;
  const cible = {
    p: protG * menu.pct / 100,
    l: lipG * menu.pct / 100,
    g: gluG * menu.pct / 100,
  };

  const b = { ...cible };
  for (const [nom, q] of menu.fixes) {
    const a = ALIMENTS[nom];
    b.p -= a.p * q / 100; b.l -= a.l * q / 100; b.g -= a.g * q / 100;
  }

  const A = ["p", "l", "g"].map(mac => menu.vars.map(nom => ALIMENTS[nom][mac] / 100));
  const bVec = [b.p, b.l, b.g];
  const d = det3(A);
  const qtes = [0, 1, 2].map(j => {
    const Aj = A.map((row, i) => row.map((v, k) => (k === j ? bVec[i] : v)));
    return Math.max(0, Math.round(det3(Aj) / d / 5) * 5);
  });

  const lignes = menu.fixes.concat(menu.vars.map((nom, j) => [nom, qtes[j]]));
  const tot = { p: 0, l: 0, g: 0 };
  const rows = lignes.map(([nom, q]) => {
    const a = ALIMENTS[nom];
    const p = a.p * q / 100, l = a.l * q / 100, g = a.g * q / 100;
    tot.p += p; tot.l += l; tot.g += g;
    if (q > 0) courses[nom] = (courses[nom] ?? 0) + q;
    return [lien(nom), q + " g", Math.round(p) + " g", Math.round(l) + " g", Math.round(g) + " g",
            Math.round(p * 4 + l * 9 + g * 4) + " kcal"];
  });
  jour.p += tot.p; jour.l += tot.l; jour.g += tot.g;

  const kcalTot = Math.round(tot.p * 4 + tot.l * 9 + tot.g * 4);
  const kcalCible = Math.round(kcal * menu.pct / 100);

  promptRepas.push(
    `"${menu.nom.replace(/^\S+\s/, "")}" (~${kcalTot} kcal): ` +
    lignes.filter(([, q]) => q > 0).map(([nom, q]) => `${q}g ${nom}`).join(", ")
  );

  dv.header(2, `${menu.nom} — ${menu.pct} %`);
  dv.table(["Aliment", "Quantité", "Protéines", "Lipides", "Glucides", "kcal"],
    rows.concat([
      ["**Total**", "—", Math.round(tot.p) + " g", Math.round(tot.l) + " g", Math.round(tot.g) + " g", "**" + kcalTot + " kcal**"],
      ["🎯 *Cible*", "—", Math.round(cible.p) + " g", Math.round(cible.l) + " g", Math.round(cible.g) + " g", "*" + kcalCible + " kcal*"],
    ]));
}

// ── Liste des ingrédients de la journée ──
dv.header(2, "🛒 Ingrédients pour la journée");
dv.list(
  Object.entries(courses)
    .sort((a, b) => b[1] - a[1])
    .map(([nom, q]) => `**${lienMd(nom)}** — ${q} g`)
);

// ── Bilan de la journée ──
const kcalJour = Math.round(jour.p * 4 + jour.l * 9 + jour.g * 4);
dv.header(2, "✅ Bilan de la journée");
dv.table(["", "kcal", "Protéines", "Lipides", "Glucides"], [
  ["Menu", kcalJour + " kcal", Math.round(jour.p) + " g", Math.round(jour.l) + " g", Math.round(jour.g) + " g"],
  ["🎯 Cible", kcal + " kcal", protG + " g", lipG + " g", gluG + " g"],
  ["Écart", (kcalJour - kcal >= 0 ? "+" : "") + (kcalJour - kcal) + " kcal",
   (Math.round(jour.p) - protG >= 0 ? "+" : "") + (Math.round(jour.p) - protG) + " g",
   (Math.round(jour.l) - lipG >= 0 ? "+" : "") + (Math.round(jour.l) - lipG) + " g",
   (Math.round(jour.g) - gluG >= 0 ? "+" : "") + (Math.round(jour.g) - gluG) + " g"],
]);

// ── Prompt image : étalage des repas de la journée ──
dv.header(2, "🎨 Prompt image — étalage de la journée");
const promptImage =
`Professional overhead food photography, flat lay: a full day of healthy high-protein meals (${kcal} kcal total) displayed together on a large rustic wooden table, ${promptRepas.length} beautifully plated dishes arranged in a row, each with a small handwritten label card. ` +
promptRepas.map(r => `Plate ${r}`).join(". ") + ". " +
`Realistic portion sizes matching the gram amounts, cooked and appetizingly presented (not raw packaging). Natural soft daylight, vibrant colors, shallow depth of field, ultra realistic, high detail, 8k.`;
dv.paragraph("Copie ce prompt dans un générateur d'images (Midjourney, DALL·E / ChatGPT, Gemini, …) — il se met à jour automatiquement avec le menu :");
dv.paragraph("```text\n" + promptImage + "\n```");
}
```
