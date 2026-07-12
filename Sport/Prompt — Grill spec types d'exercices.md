# 🔥 Prompt — Grill de la spec « Types d'exercices étendus »

> Copie tout le bloc ci-dessous dans Claude Code pour te faire challenger sur la spec avant implémentation. La version de référence de la spec reste [[Sport/Spec — Types d'exercices étendus|📋 Spec — Types d'exercices étendus]].

```
/grill-me

Grille-moi sur la spec suivante avant que je la fasse implémenter. Traque les ambiguïtés, les cas limites non couverts, les contradictions et les décisions que je n'ai pas encore prises — pose-moi les questions difficiles une par une.

# Spec — Types d'exercices étendus (vault Obsidian « perso », dossier Sport)

## Contexte
Suivi d'entraînement multi-athlètes dans Obsidian (Dataview + QuickAdd). Chaque athlète a un dossier Sport/Athlètes/<Personne>/ avec ses séances, types de séance et pages de suivi. Une série se logge aujourd'hui uniquement au format `- [exo:: Nom] [reps:: 8] [poids:: 60] [fun:: 4]` et le total d'une séance = somme des reps × poids, comparé à un objectif en kg fixé au démarrage.

## Feature 1 — Exercices de type temps
- Mesurés par une durée (ex : 45 minutes de montées de genoux).
- Format pressenti : `- [exo:: Montées de genoux] [duree:: 45] [fun:: 3]` (minutes).
- Métriques : durée totale par exercice/séance, progression, records.
- Question ouverte : contribution au « total » de la séance et à l'objectif en kg (probablement aucune — minutes affichées à part).

## Feature 2 — Exercices de type distance (km)
- Mesurés par une distance (ex : 2 km de sprint).
- Format pressenti : `- [exo:: Sprint] [km:: 2] [fun:: 4]`, durée optionnelle pour l'allure (min/km).
- Métriques : distance totale, progression distance et allure, records.
- Même question ouverte que la durée vis-à-vis de l'objectif en kg.

## Feature 3 — Exercices au poids de corps
- Charge = poids de corps de l'athlète (tractions, pompes…), lest optionnel.
- Format pressenti : `- [exo:: Tractions] [reps:: 10] [pdc:: true] [fun:: 4]`, lest éventuel `[lest:: 10]`.
- Calcul : total série = reps × (poids de corps courant + lest) ; compte dans le total kg et l'objectif.
- Prérequis — suivi du poids : nouvelle QuickAdd « ⚖️ Sport : Ajouter le poids » (choix de l'athlète puis pesée du jour), stockage dans Sport/Athlètes/<Personne>/Poids.md au format `- [date:: 2026-07-12] [poids:: 78,5]`.
- Poids de référence = moyenne des pesées sur 7 jours glissants (fenêtre se terminant à la date de la séance) pour lisser les variations. Une seule pesée dans la fenêtre → utilisée telle quelle ; aucune dans la fenêtre → repli sur la pesée la plus récente antérieure ; aucune pesée du tout → la commande de série le signale et propose d'en saisir une. Graphique : pesées brutes + moyenne glissante.

## Impacts transverses
- Vues (Historique, Progression, Métriques types, tableau de bord, récap) : afficher les unités propres (min, km) et distinguer le total kg des autres cumuls.
- QuickAdd « Ajouter une série » : question initiale « type de mesure » (reps × poids / poids de corps / temps / distance), formulaire adaptatif.
- Types de séance : le frontmatter `exercices` pourrait préciser le type de mesure attendu par exercice.
- Compatibilité : les séances existantes restent valides, champs additifs.
```
