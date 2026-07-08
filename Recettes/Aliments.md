# Aliments

> [!info] Base de données alimentaire
> Valeurs pour **100 g** (poids cru sauf mention) : `p` = protéines, `l` = lipides, `g` = glucides.
> **Pour ajouter un aliment**, ajoute une ligne au même format — il devient aussitôt utilisable dans [[Journée type]] (le nom doit correspondre exactement). Le `^id` en fin de ligne permet les liens directs vers l'aliment ; sans lui, les liens retombent sur la page.

## Base

- Skyr nature [p:: 10.5] [l:: 0.2] [g:: 4] ^skyr-nature
- Flocons d'avoine [p:: 13.5] [l:: 7] [g:: 58] ^flocons-avoine
- Beurre d'amande [p:: 21] [l:: 55] [g:: 19] ^beurre-amande
- Banane [p:: 1.1] [l:: 0.3] [g:: 23] ^banane
- Blanc de poulet [p:: 23] [l:: 1.5] [g:: 0] ^blanc-poulet
- Riz basmati (cru) [p:: 8] [l:: 1] [g:: 78] ^riz-basmati
- Huile d'olive [p:: 0] [l:: 100] [g:: 0] ^huile-olive
- Légumes verts [p:: 2] [l:: 0.3] [g:: 4] ^legumes-verts
- Whey [p:: 78] [l:: 6] [g:: 6] ^whey
- Amandes [p:: 21] [l:: 50] [g:: 22] ^amandes
- Dattes [p:: 2] [l:: 0.4] [g:: 66] ^dattes
- Pavé de saumon [p:: 20] [l:: 13] [g:: 0] ^pave-saumon
- Patate douce [p:: 1.6] [l:: 0.1] [g:: 20] ^patate-douce
- Avocat [p:: 2] [l:: 15] [g:: 9] ^avocat
- Œuf entier [p:: 12.5] [l:: 10] [g:: 0.7] ^oeuf-entier
- Pâtes (crues) [p:: 12] [l:: 1.5] [g:: 72] ^pates-crues
- Pain complet [p:: 9] [l:: 2] [g:: 45] ^pain-complet
- Fromage blanc 3% [p:: 7.5] [l:: 3] [g:: 4] ^fromage-blanc
- Steak haché 5% [p:: 21] [l:: 5] [g:: 0] ^steak-hache
- Pomme [p:: 0.3] [l:: 0.2] [g:: 14] ^pomme

## Table nutritionnelle (auto)

```dataviewjs
const items = dv.current().file.lists.filter(i => i.p !== undefined);
dv.table(
  ["Aliment", "Protéines /100g", "Lipides /100g", "Glucides /100g", "kcal /100g"],
  items
    .map(i => {
      const nom = i.text.replace(/\[[^\]]*::[^\]]*\]/g, "").replace(/\^[\w-]+\s*$/, "").trim();
      const kcal = Math.round(i.p * 4 + i.l * 9 + i.g * 4);
      const cell = i.blockId ? dv.blockLink(dv.current().file.path, i.blockId, false, nom) : nom;
      return [nom, cell, i.p + " g", i.l + " g", i.g + " g", kcal + " kcal"];
    })
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(r => r.slice(1))
);
```
