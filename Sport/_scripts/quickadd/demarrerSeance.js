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

/* Total (kg) d'une séance : muscu = reps × poids, pdc = reps × (poids de
   corps + lest). `bw` = poids de corps de référence, ou null (les séries pdc
   sont alors ignorées). Les séries temps/distance n'ont pas de total en kg. */
function totalOf(content, bw = null) {
  let total = 0;
  for (const line of content.split("\n")) {
    const r = line.match(/\[reps::\s*([\d.,]+)\s*\]/);
    if (!r) continue;
    if (/\[pdc::\s*true\s*\]/.test(line)) {
      if (bw == null) continue;
      const l = line.match(/\[lest::\s*([\d.,]+)\s*\]/);
      total += num(r[1]) * (bw + (l ? num(l[1]) : 0));
    } else {
      const w = line.match(/\[poids::\s*([\d.,]+)\s*\]/);
      if (w) total += num(r[1]) * num(w[1]);
    }
  }
  return Math.round(total * 10) / 10;
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

/* Poids de corps de référence à une date : moyenne des pesées des 7 jours
   glissants se terminant à dateStr ; sinon pesée la plus récente antérieure. */
function poidsDeCorpsA(ws, dateStr) {
  if (!ws.length) return null;
  if (!dateStr) return ws[ws.length - 1].poids;
  const end = new Date(dateStr + "T00:00:00");
  const startStr = new Date(end.getTime() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const fen = ws.filter((w) => w.date >= startStr && w.date <= dateStr);
  if (fen.length) return fen.reduce((a, w) => a + w.poids, 0) / fen.length;
  const avant = ws.filter((w) => w.date <= dateStr);
  return avant.length ? avant[avant.length - 1].poids : null;
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
  if (sessions.length) {
    const last = sessions[0];
    const dateRef = last.fm.date ? String(last.fm.date).slice(0, 10) : null;
    const bw = poidsDeCorpsA(await lirePesees(app, `${DOSSIER_ATHLETES}/${personne}`), dateRef);
    lastTotal = totalOf(await app.vault.cachedRead(last.f), bw) || null;
  }

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
      notify(
        sessions.length
          ? "Total de la dernière séance inconnu (pas de série en kg ou pesée manquante) : impossible d'utiliser un pourcentage. Séance annulée."
          : "Pas de séance précédente : impossible d'utiliser un pourcentage. Séance annulée."
      );
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
