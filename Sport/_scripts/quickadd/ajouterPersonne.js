/* QuickAdd — 👤 Sport : Ajouter une personne
   Demande le nom, crée le dossier Sport/Athlètes/<Personne>/ avec Séances/,
   Types de séance/ et les pages de suivi (Historique, Progression,
   Métriques), puis ajoute la personne à la liste de Sport/Sport.md. */

const DOSSIER_ATHLETES = "Sport/Athlètes";
const HUB = "Sport/Sport.md";

const nfc = (s) => String(s).normalize("NFC");

module.exports = async (params) => {
  const { app, quickAddApi: qa } = params;
  const notify = (msg) => {
    try {
      new params.obsidian.Notice(msg, 6000);
    } catch (e) {
      console.log("[Sport]", msg);
    }
  };

  /* 1. Nom de la personne */
  let nom = await qa.inputPrompt("Nom de la personne", "ex : Marie");
  if (!nom) return;
  nom = nom.trim().replace(/[\\/:*?"<>|#^[\]]/g, "");
  if (!nom) {
    notify("Nom invalide. Création annulée.");
    return;
  }

  const racine = `${DOSSIER_ATHLETES}/${nom}`;
  if (app.vault.getAbstractFileByPath(racine)) {
    notify(`« ${nom} » existe déjà dans ${DOSSIER_ATHLETES}.`);
    return;
  }

  /* 2. Dossiers */
  if (!app.vault.getAbstractFileByPath(DOSSIER_ATHLETES)) await app.vault.createFolder(DOSSIER_ATHLETES);
  await app.vault.createFolder(racine);
  await app.vault.createFolder(`${racine}/Séances`);
  await app.vault.createFolder(`${racine}/Types de séance`);

  /* 3. Pages de suivi (les vues détectent la personne depuis leur emplacement) */
  const pages = {
    [`${racine}/Historique.md`]: [
      "# 🗓 Historique",
      "",
      "Toutes les séances, de la plus récente à la plus ancienne : total, objectif (atteint ou non), fun, humeur et durée.",
      "",
      "```dataviewjs",
      'await dv.view("Sport/_scripts/historique");',
      "```",
      "",
    ],
    [`${racine}/Progression exercices.md`]: [
      "# 📈 Progression exercices",
      "",
      "Tous les exercices jamais loggés, du plus récemment utilisé au plus ancien. Pour chacun : meilleure série, 1RM estimé (formule d'Epley), graphique du total par séance et historique détaillé avec delta vs l'occurrence précédente.",
      "",
      "```dataviewjs",
      'await dv.view("Sport/_scripts/progression");',
      "```",
      "",
    ],
    [`${racine}/Métriques types de séance.md`]: [
      "# 📊 Métriques types de séance",
      "",
      "Vue d'ensemble de tous les types de séance déjà réalisés : nombre de séances, dernière occurrence, dernier total et record. L'historique complet d'un type (graphiques de total et de durée, deltas, humeur) est sur la note du type.",
      "",
      "```dataviewjs",
      'await dv.view("Sport/_scripts/types");',
      "```",
      "",
    ],
    [`${racine}/Poids.md`]: [
      `# ⚖️ Poids — ${nom}`,
      "",
      "Pesées enregistrées avec « ⚖️ Sport : Ajouter le poids ». Le poids de corps de référence des exercices au poids de corps est la moyenne des pesées des 7 derniers jours (à défaut, la pesée la plus récente).",
      "",
      "```dataviewjs",
      'await dv.view("Sport/_scripts/poids");',
      "```",
      "",
      "## Pesées",
      "",
    ],
    [`${racine}/${nom}.md`]: [
      `# 👤 ${nom}`,
      "",
      `- [[${racine}/Historique|🗓 Historique]] — toutes les séances`,
      `- [[${racine}/Progression exercices|📈 Progression exercices]] — best set, 1RM estimé, graphiques par exercice`,
      `- [[${racine}/Métriques types de séance|📊 Métriques types de séance]] — vue d'ensemble par type`,
      `- [[${racine}/Poids|⚖️ Poids]] — pesées et moyenne 7 jours glissants`,
      "",
      "## Types de séance",
      "",
      `Les types de ${nom} vivent dans \`${racine}/Types de séance/\` — crée-les avec « 🆕 Sport : Nouveau type de séance ».`,
      "",
    ],
  };
  for (const [chemin, lignes] of Object.entries(pages)) {
    await app.vault.create(chemin, lignes.join("\n"));
  }

  /* 4. Ajout à la liste des personnes du hub Sport.md */
  const hub = app.vault.getAbstractFileByPath(HUB);
  if (hub) {
    await app.vault.process(hub, (data) => {
      const ligne = `- [[${racine}/${nom}|👤 ${nom}]]`;
      const lines = data.split("\n");
      const idx = lines.findIndex((l) => nfc(l.trim()) === nfc("## Personnes"));
      if (idx === -1) return data.trimEnd() + `\n\n## Personnes\n\n${ligne}\n`;
      let insertAt = idx + 1;
      for (let i = idx + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
        if (lines[i].trim() !== "") insertAt = i + 1;
      }
      lines.splice(insertAt, 0, ligne);
      return lines.join("\n");
    });
  }

  const file = app.vault.getAbstractFileByPath(`${racine}/${nom}.md`);
  if (file) await app.workspace.getLeaf(false).openFile(file);
  notify(`👤 ${nom} ajouté·e — crée maintenant ses types de séance.`);
};
