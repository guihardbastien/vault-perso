---
poids_kg: 81
body_fat_pct: 18.8
facteur_activite: 1.55
ajustement_kcal: 0
kcal_manuel:
prot_g_par_kg_lbm: 2.15
lipides_pct_reste: 40
repas_petit_dej_pct: 25
repas_dejeuner_pct: 35
repas_collation_pct: 10
repas_diner_pct: 30
---

# Macronutriments

> [!info] Comment ça marche
> Toutes les valeurs se règlent dans les **propriétés** en haut de la note. Les kcal sont **calculées automatiquement** à partir du poids et du body fat (BMR Katch-McArdle × `facteur_activite` + `ajustement_kcal` pour déficit/surplus).
> Pour forcer une valeur fixe, renseigne `kcal_manuel` ; **vide ou mets 0 dans `kcal_manuel`** pour passer en calcul automatique.
> Facteurs d'activité : 1.2 sédentaire · 1.375 léger · 1.55 modéré (3-5 séances/sem) · 1.725 intense · 1.9 très intense.

## Cibles journalières

```dataviewjs
const p = dv.current();
const bf = p.body_fat_pct / 100;
const lbm = p.poids_kg * (1 - bf);

const bmr = 370 + 21.6 * lbm;
const tdee = Math.round(bmr * p.facteur_activite + p.ajustement_kcal);
const kcal = (p.kcal_manuel ?? 0) > 0 ? p.kcal_manuel : tdee;

const protG = Math.round(p.prot_g_par_kg_lbm * lbm);
const protKcal = protG * 4;

const reste = kcal - protKcal;
const lipKcal = Math.round(reste * p.lipides_pct_reste / 100);
const lipG = Math.round(lipKcal / 9);

const gluKcal = reste - lipKcal;
const gluG = Math.round(gluKcal / 4);

const pct = (k) => Math.round(k / kcal * 100) + " %";

dv.paragraph(`**Masse maigre (LBM)** : ${lbm.toFixed(1)} kg (poids ${p.poids_kg} kg − ${p.body_fat_pct} % de masse grasse)`);
dv.paragraph(`**BMR (Katch-McArdle)** : ${Math.round(bmr)} kcal · **TDEE calculé** : ${tdee} kcal (× ${p.facteur_activite}${p.ajustement_kcal ? (p.ajustement_kcal > 0 ? " +" : " ") + p.ajustement_kcal + " kcal" : ""})`);
dv.paragraph(`**Cible utilisée** : ${kcal} kcal ${(p.kcal_manuel ?? 0) > 0 ? "(⚙️ valeur manuelle — vide `kcal_manuel` pour utiliser le TDEE calculé)" : "(🔄 automatique = TDEE)"}`);
dv.paragraph(`**Fourchette protéines** : ${Math.round(2.0 * lbm)}–${Math.round(2.3 * lbm)} g (2.0–2.3 g/kg LBM) — cible actuelle : ${p.prot_g_par_kg_lbm} g/kg`);

dv.table(
  ["Macro", "Grammes", "kcal", "% du total"],
  [
    ["🥩 Protéines", protG + " g", protKcal + " kcal", pct(protKcal)],
    ["🥑 Lipides (" + p.lipides_pct_reste + " % du reste)", lipG + " g", lipKcal + " kcal", pct(lipKcal)],
    ["🍚 Glucides (" + (100 - p.lipides_pct_reste) + " % du reste)", gluG + " g", gluKcal + " kcal", pct(gluKcal)],
    ["**Total**", "—", "**" + (protKcal + lipKcal + gluKcal) + " kcal**", "100 %"],
  ]
);
```

## Répartition par repas

```dataviewjs
const p = dv.current();
const bf = p.body_fat_pct / 100;
const lbm = p.poids_kg * (1 - bf);

const bmr = 370 + 21.6 * lbm;
const tdee = Math.round(bmr * p.facteur_activite + p.ajustement_kcal);
const kcal = (p.kcal_manuel ?? 0) > 0 ? p.kcal_manuel : tdee;

const protG = Math.round(p.prot_g_par_kg_lbm * lbm);
const protKcal = protG * 4;
const reste = kcal - protKcal;
const lipKcal = Math.round(reste * p.lipides_pct_reste / 100);
const lipG = Math.round(lipKcal / 9);
const gluG = Math.round((reste - lipKcal) / 4);

const repas = [
  ["🌅 Petit-déjeuner", p.repas_petit_dej_pct],
  ["🌞 Déjeuner", p.repas_dejeuner_pct],
  ["🍎 Collation", p.repas_collation_pct],
  ["🌙 Dîner", p.repas_diner_pct],
];

const totalPct = repas.reduce((s, r) => s + r[1], 0);
if (totalPct !== 100) {
  dv.paragraph(`⚠️ **La répartition des repas fait ${totalPct} % au lieu de 100 %** — ajuste les propriétés \`repas_*_pct\`.`);
}

dv.table(
  ["Repas", "%", "kcal", "Protéines", "Lipides", "Glucides"],
  repas.map(([nom, pc]) => [
    nom,
    pc + " %",
    Math.round(kcal * pc / 100) + " kcal",
    Math.round(protG * pc / 100) + " g",
    Math.round(lipG * pc / 100) + " g",
    Math.round(gluG * pc / 100) + " g",
  ]).concat([[
    "**Total**", totalPct + " %", kcal + " kcal", protG + " g", lipG + " g", gluG + " g",
  ]])
);
```
