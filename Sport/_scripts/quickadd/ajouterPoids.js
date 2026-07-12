/* QuickAdd — ⚖️ Sport : Ajouter le poids
   Choix de la personne (si plusieurs), saisie du poids en kg, et ajout d'une
   pesée datée du jour dans Sport/Athlètes/<Personne>/Poids.md (créé au
   besoin avec son graphique d'évolution). */

const DOSSIER_ATHLETES = "Sport/Athlètes";

const num = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Dossiers directement sous Sport/Athlètes/ = les personnes. */
function personnes(app, obsidian) {
  const racine = app.vault.getAbstractFileByPath(DOSSIER_ATHLETES);
  return (racine?.children ?? [])
    .filter((f) => f instanceof obsidian.TFolder)
    .map((f) => f.name)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

/* Pesées de Poids.md → [{ date, poids }] triées par date, ou []. */
async function lirePesees(app, racinePersonne) {
  const f = app.vault.getAbstractFileByPath(`${racinePersonne}/Poids.md`);
  if (!f) return [];
  const txt = await app.vault.cachedRead(f);
  const ws = [];
  for (const m of txt.matchAll(/\[date::\s*(\d{4}-\d{2}-\d{2})\s*\][^\n]*?\[poids::\s*([\d.,]+)\s*\]/g)) {
    const poids = parseFloat(m[2].replace(",", "."));
    if (!isNaN(poids)) ws.push({ date: m[1], poids });
  }
  return ws.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* Moyenne des pesées des 7 jours glissants se terminant aujourd'hui. */
function moyenne7j(ws) {
  const fin = todayStr();
  const debut = new Date(new Date(fin + "T00:00:00").getTime() - 6 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const fen = ws.filter((w) => w.date >= debut && w.date <= fin);
  if (!fen.length) return null;
  return fen.reduce((a, w) => a + w.poids, 0) / fen.length;
}

module.exports = async (params) => {
  const { app, quickAddApi: qa } = params;
  const notify = (msg) => {
    try {
      new params.obsidian.Notice(msg, 6000);
    } catch (e) {
      console.log("[Sport]", msg);
    }
  };

  /* 1. Pour qui ? */
  const noms = personnes(app, params.obsidian);
  if (!noms.length) {
    notify("Aucune personne dans « Sport ». Lance d'abord « 👤 Sport : Ajouter une personne ».");
    return;
  }
  const personne = noms.length === 1 ? noms[0] : await qa.suggester(noms, noms);
  if (!personne) return;

  const racinePersonne = `${DOSSIER_ATHLETES}/${personne}`;

  /* 2. Poids du jour */
  const poids = num(await qa.inputPrompt(`${personne} — poids du jour (kg)`, "ex : 78,5"));
  if (poids == null || poids <= 0) {
    notify("Poids invalide. Pesée annulée.");
    return;
  }

  /* 3. Ajout dans Poids.md (créé au besoin) */
  const chemin = `${racinePersonne}/Poids.md`;
  const ligne = `- [date:: ${todayStr()}] [poids:: ${poids}]`;
  const f = app.vault.getAbstractFileByPath(chemin);
  if (!f) {
    await app.vault.create(
      chemin,
      [
        `# ⚖️ Poids — ${personne}`,
        "",
        "Pesées enregistrées avec « ⚖️ Sport : Ajouter le poids ». Le poids de corps de référence des exercices au poids de corps est la moyenne des pesées des 7 derniers jours (à défaut, la pesée la plus récente).",
        "",
        "```dataviewjs",
        'await dv.view("Sport/_scripts/poids");',
        "```",
        "",
        "## Pesées",
        ligne,
        "",
      ].join("\n")
    );
  } else {
    await app.vault.process(f, (data) => data.trimEnd() + "\n" + ligne + "\n");
  }

  const moy = moyenne7j(await lirePesees(app, racinePersonne));
  const moyStr = moy != null ? ` · moyenne 7 j : ${Math.round(moy * 10) / 10} kg` : "";
  notify(`⚖️ ${personne} : ${poids} kg enregistré${moyStr}`);
};
