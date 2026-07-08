/* QuickAdd — ✅ Sport : Terminer la séance
   Enregistre l'heure de fin dans le frontmatter de la séance en cours
   et ouvre la note (récap + tableau de bord). */

const DOSSIER_SEANCES = "Sport/Séances";

const nfc = (s) => String(s).normalize("NFC");
const inFolder = (f, folder) => nfc(f.path).startsWith(nfc(folder) + "/");

function pad(n) {
  return String(n).padStart(2, "0");
}

module.exports = async (params) => {
  const { app } = params;
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
  notify(`✅ Séance terminée à ${fin} — le récap est prêt à copier.`);
};
