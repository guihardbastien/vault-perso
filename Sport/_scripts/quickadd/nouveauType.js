/* QuickAdd — 🆕 Sport : Nouveau type de séance
   Demande le nom du type puis la liste des exercices (un par un, vide pour
   terminer) et crée la note dans Sport/Types de séance/. */

const DOSSIER_TYPES = "Sport/Types de séance";

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

  /* 1. Nom du type */
  let nom = await qa.inputPrompt("Nom du type de séance", "ex : Full body");
  if (!nom) return;
  nom = nom.trim().replace(/[\\/:*?"<>|#^[\]]/g, "");
  if (!nom) {
    notify("Nom invalide. Création annulée.");
    return;
  }
  const chemin = `${DOSSIER_TYPES}/${nom}.md`;
  const existe = app.vault
    .getMarkdownFiles()
    .some((f) => nfc(f.path).toLowerCase() === nfc(chemin).toLowerCase());
  if (existe) {
    notify(`Le type « ${nom} » existe déjà.`);
    return;
  }

  /* 2. Exercices, un par un (entrée vide ou Échap pour terminer) */
  const exercices = [];
  while (true) {
    const e = await qa.inputPrompt(
      `${nom} — exercice ${exercices.length + 1} (laisse vide pour terminer)`,
      exercices.length === 0 ? "ex : Squat" : "vide = terminé"
    );
    if (!e || !e.trim()) break;
    const propre = e.trim();
    if (!exercices.some((x) => nfc(x).toLowerCase() === nfc(propre).toLowerCase())) {
      exercices.push(propre);
    }
  }
  if (!exercices.length) {
    const continuer = await qa.suggester(
      ["Créer le type sans exercices", "Annuler"],
      [true, false]
    );
    if (!continuer) return;
  }

  /* 3. Création de la note */
  const fmExos = exercices.length
    ? "exercices:\n" + exercices.map((e) => `  - ${e}`).join("\n")
    : "exercices: []";

  const contenu = [
    "---",
    fmExos,
    "---",
    "",
    `# ${nom}`,
    "",
    "La liste `exercices` ci-dessus est pré-chargée au démarrage d'une séance — ajoute, retire ou réordonne librement.",
    "",
    "## Historique et progression",
    "",
    "```dataviewjs",
    'await dv.view("Sport/_scripts/type-detail");',
    "```",
    "",
  ].join("\n");

  const file = await app.vault.create(chemin, contenu);
  await app.workspace.getLeaf(false).openFile(file);
  notify(`🆕 Type « ${nom} » créé (${exercices.length} exercice${exercices.length > 1 ? "s" : ""}).`);
};
