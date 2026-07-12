/* QuickAdd — ➕ Sport : Ajouter une série
   Formulaire : exercice, type de mesure (reps × poids / poids de corps /
   temps / distance — le type habituel de l'exercice est proposé en premier),
   champs adaptés, fun (1–5), douleur optionnelle.
   Ajoute la série dans la section « ## Séries » de la séance en cours —
   fichier actif s'il est une séance, sinon choix parmi les séances ouvertes
   (toutes personnes confondues). */

const AUTRE = "➕ Autre exercice…";

const MESURES = [
  { id: "muscu", label: "🏋️ Reps × poids" },
  { id: "pdc", label: "🤸 Poids de corps (reps, lest optionnel)" },
  { id: "temps", label: "⏱ Temps (minutes)" },
  { id: "distance", label: "📏 Distance (km)" },
];

const nfc = (s) => String(s).normalize("NFC");
const RE_SEANCE = /^Sport\/Athlètes\/[^/]+\/Séances\//;
const isSeance = (f) => RE_SEANCE.test(nfc(f.path));
const personneDe = (f) => nfc(f.path).split("/")[2];

const num = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
};

/* Première lettre en majuscule, le reste inchangé. */
const cap = (s) => (s ? s.charAt(0).toLocaleUpperCase("fr") + s.slice(1) : s);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Type de mesure d'une ligne de série existante. */
function kindOfLine(line) {
  if (/\[pdc::/.test(line)) return "pdc";
  if (/\[km::/.test(line)) return "distance";
  if (/\[duree::/.test(line)) return "temps";
  if (/\[reps::/.test(line) && /\[poids::/.test(line)) return "muscu";
  return null;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Mémoire auto : dernier type de mesure utilisé pour cet exercice — dans la
   séance courante d'abord, sinon dans les séances passées de la personne
   (de la plus récente à la plus ancienne). */
async function mesureHabituelle(app, racinePersonne, exo, contenuSeance) {
  const re = new RegExp(`\\[exo::\\s*${escRe(exo)}\\s*\\]`, "i");
  const cherche = (txt) => {
    let kind = null;
    for (const line of txt.split("\n")) {
      if (re.test(line)) kind = kindOfLine(line) ?? kind;
    }
    return kind;
  };
  const local = cherche(contenuSeance);
  if (local) return local;

  const seances = app.vault
    .getMarkdownFiles()
    .filter((f) => nfc(f.path).startsWith(nfc(`${racinePersonne}/Séances/`)))
    .sort((a, b) => (a.basename < b.basename ? 1 : -1));
  for (const f of seances) {
    const kind = cherche(await app.vault.cachedRead(f));
    if (kind) return kind;
  }
  return null;
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
  const end = new Date(dateStr + "T00:00:00");
  const startStr = new Date(end.getTime() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const fen = ws.filter((w) => w.date >= startStr && w.date <= dateStr);
  if (fen.length) return fen.reduce((a, w) => a + w.poids, 0) / fen.length;
  const avant = ws.filter((w) => w.date <= dateStr);
  return avant.length ? avant[avant.length - 1].poids : null;
}

/* Ajoute une pesée datée du jour dans Poids.md (créé au besoin). */
async function ajouterPesee(app, racinePersonne, personne, poids) {
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
    return;
  }
  await app.vault.process(f, (data) => data.trimEnd() + "\n" + ligne + "\n");
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
    notify("Aucune séance en cours. Lance d'abord « 🏋️ Sport : Démarrer une séance ».");
    return;
  }

  const contenu = await app.vault.cachedRead(file);
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const racinePersonne = nfc(file.path).split("/").slice(0, 3).join("/");

  /* Choix de l'exercice : exercices du type + déjà loggés + saisie libre */
  const choix = [];
  const typeFile = app.vault.getAbstractFileByPath(`${racinePersonne}/Types de séance/${fm.type ?? ""}.md`);
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
    exo = cap(exo.trim());
  }

  /* Type de mesure — le type habituel de l'exercice est proposé en premier */
  const personne = personneDe(file);
  const habituel = await mesureHabituelle(app, racinePersonne, exo, contenu);
  const ordre = habituel
    ? [MESURES.find((m) => m.id === habituel), ...MESURES.filter((m) => m.id !== habituel)]
    : MESURES;
  const mesure = await qa.suggester(
    ordre.map((m, i) => (habituel && i === 0 ? `${m.label} (habituel)` : m.label)),
    ordre.map((m) => m.id)
  );
  if (!mesure) return;

  /* Champs selon la mesure — `champs` complète la ligne, `resume` la notification */
  let champs = "";
  let resume = "";

  if (mesure === "muscu") {
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
    champs = ` [reps:: ${reps}] [poids:: ${poids}]`;
    resume = `${reps} × ${poids} kg = ${Math.round(reps * poids * 10) / 10} kg`;
  } else if (mesure === "pdc") {
    const reps = num(await qa.inputPrompt(`${exo} — répétitions`, "ex : 10"));
    if (reps == null || reps <= 0) {
      notify("Répétitions invalides. Série annulée.");
      return;
    }
    const lest = num(await qa.inputPrompt(`${exo} — lest (kg, vide si aucun)`, "ex : 10 — vide = sans lest")) ?? 0;
    if (lest < 0) {
      notify("Lest invalide. Série annulée.");
      return;
    }

    /* Poids de corps : moyenne 7 jours glissants à la date de la séance */
    const dateSeance = fm.date ? String(fm.date).slice(0, 10) : todayStr();
    let pesees = await lirePesees(app, racinePersonne);
    if (!pesees.length) {
      const saisir = await qa.suggester(
        [`⚖️ Aucune pesée pour ${personne} — saisir son poids maintenant`, "Continuer sans pesée (total inconnu)"],
        [true, false]
      );
      if (saisir == null) return;
      if (saisir) {
        const p = num(await qa.inputPrompt(`${personne} — poids de corps (kg)`, "ex : 78,5"));
        if (p == null || p <= 0) {
          notify("Poids invalide. Série annulée.");
          return;
        }
        await ajouterPesee(app, racinePersonne, personne, p);
        pesees = [{ date: todayStr(), poids: p }];
      }
    }
    const pdc = poidsDeCorpsA(pesees, dateSeance);

    champs = ` [reps:: ${reps}] [pdc:: true]${lest > 0 ? ` [lest:: ${lest}]` : ""}`;
    resume =
      pdc != null
        ? `${reps} × PDC${lest > 0 ? `+${lest}` : ""} (${Math.round(pdc * 10) / 10} kg) = ${Math.round(reps * (pdc + lest) * 10) / 10} kg`
        : `${reps} × PDC${lest > 0 ? `+${lest}` : ""} (pesée manquante)`;
  } else if (mesure === "temps") {
    const duree = num(await qa.inputPrompt(`${exo} — durée (minutes)`, "ex : 45"));
    if (duree == null || duree <= 0) {
      notify("Durée invalide. Série annulée.");
      return;
    }
    champs = ` [duree:: ${duree}]`;
    resume = `${duree} min`;
  } else {
    const km = num(await qa.inputPrompt(`${exo} — distance (km)`, "ex : 2 ou 5,5"));
    if (km == null || km <= 0) {
      notify("Distance invalide. Série annulée.");
      return;
    }
    const duree = num(await qa.inputPrompt(`${exo} — durée (minutes, vide si non chronométré)`, "ex : 12 — vide = sans durée"));
    champs = ` [km:: ${km}]${duree != null && duree > 0 ? ` [duree:: ${duree}]` : ""}`;
    resume = `${km} km${duree != null && duree > 0 ? ` en ${duree} min` : ""}`;
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

  let ligne = `- [exo:: ${exo}]${champs} [fun:: ${fun}]`;
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

  notify(`✅ ${personne} · ${exo} : ${resume}`);
};
