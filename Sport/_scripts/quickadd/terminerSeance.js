/* QuickAdd — ✅ Sport : Terminer la séance
   Enregistre l'heure de fin dans le frontmatter de la séance en cours
   (fichier actif s'il est une séance, sinon choix parmi les séances ouvertes
   de toutes les personnes) et ouvre la note (récap + tableau de bord). */

const nfc = (s) => String(s).normalize("NFC");
const RE_SEANCE = /^Sport\/Athlètes\/[^/]+\/Séances\//;
const isSeance = (f) => RE_SEANCE.test(nfc(f.path));
const personneDe = (f) => nfc(f.path).split("/")[2];

function pad(n) {
  return String(n).padStart(2, "0");
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

  /* Séance cible : fichier actif s'il est une séance, sinon les séances sans
     heure de fin de toutes les personnes (choix si plusieurs). */
  let file = app.workspace.getActiveFile();
  if (!file || !isSeance(file)) {
    const ouvertes = app.vault
      .getMarkdownFiles()
      .filter(isSeance)
      .map((f) => ({ f, fm: app.metadataCache.getFileCache(f)?.frontmatter ?? {} }))
      .filter((x) => !x.fm.fin)
      .sort((a, b) => {
        const ka = `${a.fm.date ?? ""}T${a.fm.debut ?? ""}`;
        const kb = `${b.fm.date ?? ""}T${b.fm.debut ?? ""}`;
        return ka < kb ? 1 : -1;
      });
    if (!ouvertes.length) {
      file = null;
    } else if (ouvertes.length === 1) {
      file = ouvertes[0].f;
    } else {
      file = await qa.suggester(
        ouvertes.map((x) => `${personneDe(x.f)} — ${x.f.basename}`),
        ouvertes.map((x) => x.f)
      );
      if (!file) return;
    }
  }
  if (!file) {
    notify("Aucune séance en cours à terminer.");
    return;
  }

  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  if (fm.fin) {
    notify(`Cette séance est déjà terminée (fin : ${fm.fin}).`);
    return;
  }

  const now = new Date();
  const fin = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  await app.fileManager.processFrontMatter(file, (front) => {
    front.fin = fin;
  });

  await app.workspace.getLeaf(false).openFile(file);
  notify(`✅ Séance de ${personneDe(file)} terminée à ${fin} — le récap est prêt à copier.`);
};
