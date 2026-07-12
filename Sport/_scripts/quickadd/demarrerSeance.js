/* QuickAdd — 🏋️ Sport : Démarrer une séance
   Choix de la personne, du type, humeur, objectif (valeur ou +X% du dernier total),
   puis création de la note de séance depuis Sport/Modèles/Séance.md. */

const DOSSIER_ATHLETES = "Sport/Athlètes";
const MODELE = "Sport/Modèles/Séance.md";

const nfc = (s) => String(s).normalize("NFC");
const inFolder = (f, folder) => nfc(f.path).startsWith(nfc(folder) + "/");

const num = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function totalOf(content) {
  let total = 0;
  for (const line of content.split("\n")) {
    const r = line.match(/\[reps::\s*([\d.,]+)\s*\]/);
    const w = line.match(/\[poids::\s*([\d.,]+)\s*\]/);
    if (r && w) total += num(r[1]) * num(w[1]);
  }
  return Math.round(total * 10) / 10;
}

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
  const DOSSIER_SEANCES = `${DOSSIER_ATHLETES}/${personne}/Séances`;

  /* 2. Type de séance */
  const typeFiles = app.vault.getMarkdownFiles().filter((f) => inFolder(f, DOSSIER_TYPES));
  if (!typeFiles.length) {
    notify(`Aucun type de séance pour ${personne}. Crée d'abord un type (🆕 Sport : Nouveau type de séance).`);
    return;
  }
  typeFiles.sort((a, b) => a.basename.localeCompare(b.basename, "fr"));
  const typeName = await qa.suggester(
    typeFiles.map((f) => f.basename),
    typeFiles.map((f) => f.basename)
  );
  if (!typeName) return;

  /* 3. Dernière séance de ce type → total de référence */
  const sessions = app.vault
    .getMarkdownFiles()
    .filter((f) => inFolder(f, DOSSIER_SEANCES))
    .map((f) => ({ f, fm: app.metadataCache.getFileCache(f)?.frontmatter ?? {} }))
    .filter((x) => nfc(x.fm.type ?? "") === nfc(typeName))
    .sort((a, b) => {
      const ka = `${a.fm.date ?? ""}T${a.fm.debut ?? ""}`;
      const kb = `${b.fm.date ?? ""}T${b.fm.debut ?? ""}`;
      return ka < kb ? 1 : -1;
    });

  let lastTotal = null;
  if (sessions.length) lastTotal = totalOf(await app.vault.cachedRead(sessions[0].f));

  /* 4. Humeur */
  const humeur = await qa.suggester(["😞 mauvais", "😐 ok", "😀 bon"], ["mauvais", "ok", "bon"]);
  if (!humeur) return;

  /* 5. Objectif (obligatoire) : valeur en kg ou +X% du dernier total */
  const header = lastTotal
    ? `Objectif total (kg) — dernier ${typeName} de ${personne} : ${lastTotal} kg. Entre un nombre ou +X%`
    : `Objectif total (kg) — première séance ${typeName} de ${personne}, entre un nombre`;
  const raw = await qa.inputPrompt(header, "ex : 4200 ou +2%");
  if (raw == null || raw === "") return;

  let objectif = null;
  const pct = String(raw).match(/^\+?\s*([\d.,]+)\s*%$/);
  if (pct) {
    if (!lastTotal) {
      notify("Pas de séance précédente : impossible d'utiliser un pourcentage. Séance annulée.");
      return;
    }
    objectif = Math.round(lastTotal * (1 + num(pct[1]) / 100));
  } else {
    objectif = num(raw) != null ? Math.round(num(raw)) : null;
  }
  if (!objectif || objectif <= 0) {
    notify("Objectif invalide. Séance annulée.");
    return;
  }

  /* 6. Exercices prévus depuis le type */
  const typeFile = typeFiles.find((f) => f.basename === typeName);
  const exercices = app.metadataCache.getFileCache(typeFile)?.frontmatter?.exercices ?? [];
  const exosMd = exercices.length
    ? exercices.map((e) => `- ${e}`).join("\n")
    : "- (aucun exercice configuré dans le type)";

  /* 7. Création de la note */
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const debut = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  let contenu;
  const modele = app.vault.getAbstractFileByPath(MODELE);
  if (modele) {
    contenu = await app.vault.cachedRead(modele);
  } else {
    contenu = [
      "---",
      "type: {{TYPE}}",
      "date: {{DATE}}",
      'debut: "{{DEBUT}}"',
      "fin:",
      "humeur: {{HUMEUR}}",
      "objectif: {{OBJECTIF}}",
      "---",
      "",
      "# 🏋️ {{TYPE}} — {{DATE}}",
      "",
      "## Exercices prévus",
      "{{EXOS}}",
      "",
      "## Séries",
      "",
      "## Tableau de bord",
      "```dataviewjs",
      'await dv.view("Sport/_scripts/seance");',
      "```",
      "",
      "## Récap",
      "```dataviewjs",
      'await dv.view("Sport/_scripts/recap");',
      "```",
      "",
    ].join("\n");
  }
  contenu = contenu
    .replaceAll("{{TYPE}}", typeName)
    .replaceAll("{{DATE}}", date)
    .replaceAll("{{DEBUT}}", debut)
    .replaceAll("{{HUMEUR}}", humeur)
    .replaceAll("{{OBJECTIF}}", String(objectif))
    .replaceAll("{{EXOS}}", exosMd);

  let base = `${DOSSIER_SEANCES}/${date} ${typeName}`;
  let chemin = `${base}.md`;
  let i = 2;
  while (app.vault.getAbstractFileByPath(chemin)) chemin = `${base} (${i++}).md`;

  const file = await app.vault.create(chemin, contenu);
  await app.workspace.getLeaf(false).openFile(file);
  notify(`Séance ${typeName} démarrée pour ${personne} — objectif ${objectif} kg 🎯`);
};
