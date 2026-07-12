/* QuickAdd — 🆕 Sport : Nouveau type de séance
   Choix de la personne, nom du type, puis la liste des exercices (un par un,
   vide pour terminer) et crée la note dans Sport/Athlètes/<Personne>/Types de séance/. */

const DOSSIER_ATHLETES = "Sport/Athlètes";

const nfc = (s) => String(s).normalize("NFC");

/* Dossiers directement sous Sport/Athlètes/ = les personnes. */
function personnes(app, obsidian) {
  const racine = app.vault.getAbstractFileByPath(DOSSIER_ATHLETES);
  return (racine?.children ?? [])
    .filter((f) => f instanceof obsidian.TFolder)
    .map((f) => f.name)
    .sort((a, b) => a.localeCompare(b, "fr"));
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

  const DOSSIER_TYPES = `${DOSSIER_ATHLETES}/${personne}/Types de séance`;

  /* 2. Nom du type */
  let nom = await qa.inputPrompt(`Nom du type de séance (${personne})`, "ex : Full body");
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
    notify(`Le type « ${nom} » existe déjà pour ${personne}.`);
    return;
  }

  /* 3. Exercices, un par un (entrée vide ou Échap pour terminer) */
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

  /* 4. Création de la note */
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
  notify(`🆕 Type « ${nom} » créé pour ${personne} (${exercices.length} exercice${exercices.length > 1 ? "s" : ""}).`);
};
