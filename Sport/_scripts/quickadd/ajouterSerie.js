/* QuickAdd — ➕ Sport : Ajouter une série
   Formulaire : exercice, reps, poids (kg), fun (1–5), douleur optionnelle.
   Ajoute la série dans la section « ## Séries » de la séance en cours. */

const DOSSIER_TYPES = "Sport/Types de séance";
const DOSSIER_SEANCES = "Sport/Séances";
const AUTRE = "➕ Autre exercice…";

const nfc = (s) => String(s).normalize("NFC");
const inFolder = (f, folder) => nfc(f.path).startsWith(nfc(folder) + "/");

const num = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
};

module.exports = async (params) => {
  const { app, quickAddApi: qa } = params;
  const notify = (msg) => {
    try {
      new params.obsidian.Notice(msg, 6000);
    } catch (e) {
      console.log("[Sport]", msg);
    }
  };

  /* Séance cible : fichier actif s'il est dans Sport/Séances, sinon la
     séance la plus récente sans heure de fin. */
  let file = app.workspace.getActiveFile();
  if (!file || !inFolder(file, DOSSIER_SEANCES)) {
    const ouvertes = app.vault
      .getMarkdownFiles()
      .filter((f) => inFolder(f, DOSSIER_SEANCES))
      .map((f) => ({ f, fm: app.metadataCache.getFileCache(f)?.frontmatter ?? {} }))
      .filter((x) => !x.fm.fin)
      .sort((a, b) => {
        const ka = `${a.fm.date ?? ""}T${a.fm.debut ?? ""}`;
        const kb = `${b.fm.date ?? ""}T${b.fm.debut ?? ""}`;
        return ka < kb ? 1 : -1;
      });
    file = ouvertes[0]?.f ?? null;
  }
  if (!file) {
    notify("Aucune séance en cours. Lance d'abord « 🏋️ Sport : Démarrer une séance ».");
    return;
  }

  const contenu = await app.vault.cachedRead(file);
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};

  /* Choix de l'exercice : exercices du type + déjà loggés + saisie libre */
  const choix = [];
  const typeFile = app.vault.getAbstractFileByPath(`${DOSSIER_TYPES}/${fm.type ?? ""}.md`);
  const duType = typeFile ? app.metadataCache.getFileCache(typeFile)?.frontmatter?.exercices ?? [] : [];
  for (const e of duType) if (!choix.includes(String(e))) choix.push(String(e));
  for (const m of contenu.matchAll(/\[exo::\s*([^\]]+?)\s*\]/g)) {
    if (!choix.includes(m[1])) choix.push(m[1]);
  }

  let exo = await qa.suggester([...choix, AUTRE], [...choix, AUTRE]);
  if (!exo) return;
  if (exo === AUTRE) {
    exo = await qa.inputPrompt("Nom de l'exercice", "ex : Curl incliné");
    if (!exo) return;
    exo = exo.trim();
  }

  /* Reps, poids, fun */
  const reps = num(await qa.inputPrompt(`${exo} — répétitions`, "ex : 8"));
  if (reps == null || reps <= 0) {
    notify("Répétitions invalides. Série annulée.");
    return;
  }
  const poids = num(await qa.inputPrompt(`${exo} — poids (kg)`, "ex : 60 ou 62,5"));
  if (poids == null || poids < 0) {
    notify("Poids invalide. Série annulée.");
    return;
  }
  const fun = await qa.suggester(
    ["1 — 😖", "2 — 🙁", "3 — 😐", "4 — 🙂", "5 — 🤩"],
    [1, 2, 3, 4, 5]
  );
  if (fun == null) return;

  /* Douleur optionnelle */
  let douleur = null;
  let gravite = null;
  const avecDouleur = await qa.suggester(["Aucune douleur", "⚠️ Signaler une douleur"], [false, true]);
  if (avecDouleur) {
    douleur = await qa.inputPrompt("Localisation de la douleur", "ex : épaule gauche");
    if (douleur) {
      douleur = douleur.trim();
      gravite = await qa.suggester(["faible", "moyenne", "haute"], ["faible", "moyenne", "haute"]);
    }
  }

  let ligne = `- [exo:: ${exo}] [reps:: ${reps}] [poids:: ${poids}] [fun:: ${fun}]`;
  if (douleur) ligne += ` [douleur:: ${douleur}]${gravite ? ` [gravite:: ${gravite}]` : ""}`;

  /* Insertion à la fin de la section ## Séries */
  await app.vault.process(file, (data) => {
    const lines = data.split("\n");
    const idx = lines.findIndex((l) => nfc(l.trim()) === nfc("## Séries"));
    if (idx === -1) return data.trimEnd() + "\n\n## Séries\n" + ligne + "\n";

    let end = lines.length;
    for (let i = idx + 1; i < lines.length; i++) {
      if (/^##\s/.test(lines[i])) {
        end = i;
        break;
      }
    }
    let insertAt = idx + 1;
    for (let i = idx + 1; i < end; i++) if (lines[i].trim() !== "") insertAt = i + 1;
    lines.splice(insertAt, 0, ligne);
    return lines.join("\n");
  });

  notify(`✅ ${exo} : ${reps} × ${poids} kg = ${Math.round(reps * poids * 10) / 10} kg`);
};
