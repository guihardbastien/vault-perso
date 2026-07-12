/* Récap partageable d'une séance + bouton copier — usage dans la note :
   await dv.view("Sport/_scripts/recap"); */

const lib = {};
await dv.view("Sport/_scripts/lib", lib);

const p = dv.current();
const el = dv.el("div", "");
const sets = lib.getSetsFor(dv, p);

if (!sets.length) {
  el.innerHTML = `<em>Le récap apparaîtra quand des séries auront été enregistrées.</em>`;
} else {
  const groups = lib.groupSets(sets);
  const sum = lib.sumSets(sets);
  const total = sum.kg;
  const fun = lib.funAvg(sets);
  const dur = lib.durationMin(p);
  const obj = Number(p.objectif) || null;

  const lines = [];
  lines.push(`🏋️ ${p.type ?? "Séance"} — ${lib.pageDateStr(p)}`);

  const horaire = p.fin
    ? `🕐 ${p.debut ?? "?"} → ${p.fin} (${lib.fmtDuration(dur)})`
    : `🕐 ${p.debut ?? "?"} → … (séance en cours)`;
  lines.push(`${horaire} · Humeur : ${lib.humeurLabel(p.humeur)}`);

  if (obj) {
    const hit = total >= obj;
    lines.push(`🎯 Objectif ${lib.fmtKg(obj)} : ${hit ? "✅ atteint" : "❌ pas atteint"} (${lib.fmtKg(total)})`);
  }
  lines.push("");

  for (const g of groups) {
    lines.push(`▪ ${g.exo} — ${lib.groupMain(g).str} · fun ${lib.funStr(g.fun)}`);
    for (const s of g.sets) {
      const pain = lib.painStr(s);
      lines.push(`   ${lib.setDesc(s)} · fun ${lib.funStr(s.fun)}${pain ? " · " + pain : ""}`);
    }
  }

  lines.push("");
  const cumuls = [lib.fmtKg(total)];
  if (sum.min > 0) cumuls.push(lib.fmtDuration(sum.min));
  if (sum.km > 0) cumuls.push(lib.fmtKm(sum.km));
  lines.push(`TOTAL : ${cumuls.join(" · ")} · fun ${lib.funStr(fun)} · ${sets.length} séries`);
  if (sum.pdcInconnu) {
    lines.push(`⚠️ ${sum.pdcInconnu} série(s) au poids de corps sans pesée (total kg incomplet)`);
  }

  const text = lines.join("\n");

  const btn = document.createElement("button");
  btn.textContent = "📋 Copier le récap";
  btn.style.marginBottom = "6px";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "✅ Copié !";
    } catch (e) {
      btn.textContent = "❌ Copie impossible";
    }
    setTimeout(() => (btn.textContent = "📋 Copier le récap"), 1500);
  });

  const pre = document.createElement("pre");
  pre.textContent = text;
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontSize = "0.85em";

  el.appendChild(btn);
  el.appendChild(pre);
}
