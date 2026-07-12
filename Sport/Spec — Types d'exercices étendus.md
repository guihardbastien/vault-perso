# 📋 Spec — Types d'exercices étendus

> Statut : **brouillon descriptif** — rien n'est implémenté. Objectif : étendre le suivi au-delà des exercices « reps × poids ».

## Contexte

Aujourd'hui, une série se logge uniquement au format `- [exo:: Nom] [reps:: 8] [poids:: 60] [fun:: 4]` et le total d'une séance = somme des reps × poids. Trois nouveaux types d'exercices doivent être supportés.

## Feature 1 — Exercices de type temps

Exercices mesurés par une durée plutôt que par des répétitions.

- **Exemple** : 45 minutes de montées de genoux, 10 minutes de gainage.
- **Saisie** : dans « ➕ Ajouter une série », après le choix de l'exercice, pouvoir indiquer une durée au lieu de reps × poids.
- **Format pressenti** : `- [exo:: Montées de genoux] [duree:: 45] [fun:: 3]` (durée en minutes).
- **Métriques** : durée totale par exercice et par séance, progression de la durée dans le temps (graphique), éventuellement record de durée.
- **Question ouverte** : comment ce type contribue-t-il au « total » de la séance et à l'objectif en kg ? (probablement pas du tout — afficher les minutes à part).

## Feature 2 — Exercices de type distance (km)

Exercices mesurés par une distance parcourue.

- **Exemple** : 2 km de sprint, 5 km de course.
- **Saisie** : idem, choix « distance » dans le formulaire de série.
- **Format pressenti** : `- [exo:: Sprint] [km:: 2] [fun:: 4]` — optionnellement combinable avec une durée (`[duree:: 12]`) pour calculer une allure (min/km).
- **Métriques** : distance totale par séance, progression de la distance et de l'allure par exercice, records.
- **Question ouverte** : même remarque que la durée vis-à-vis de l'objectif total en kg.

## Feature 3 — Exercices au poids de corps

Exercices dont la charge est le poids de l'athlète (tractions, pompes, dips…).

- **Exemple** : 3 × 10 tractions — la charge déplacée = poids de corps de l'athlète au moment de la séance.
- **Saisie** : dans « ➕ Ajouter une série », un choix « poids de corps » à la place du poids en kg ; les reps restent saisies normalement. Lest optionnel (`+10 kg` de gilet lesté).
- **Format pressenti** : `- [exo:: Tractions] [reps:: 10] [pdc:: true] [fun:: 4]`, avec lest éventuel `[lest:: 10]`.
- **Calcul** : total de la série = reps × (poids de corps courant de l'athlète + lest). Le poids de corps utilisé est la moyenne sur 7 jours glissants des pesées de l'athlète à la date de la séance (voir « Prérequis » ci-dessous).
- **Contribution au total** : ces exercices comptent dans le total en kg de la séance et dans l'objectif, comme les exercices classiques.

### Prérequis : suivi du poids de l'athlète

- **Nouvelle QuickAdd « ⚖️ Sport : Ajouter le poids »** : choix de l'athlète (comme les autres commandes), puis saisie du poids en kg à la date du jour.
- **Stockage pressenti** : une note `Sport/Athlètes/<Personne>/Poids.md` avec une entrée datée par pesée (ex. `- [date:: 2026-07-12] [poids:: 78,5]`), plus un graphique d'évolution.
- **Mesure sur 7 jours glissants** : le poids de référence n'est pas la dernière pesée brute mais la **moyenne des pesées des 7 derniers jours** (fenêtre glissante se terminant à la date de la séance), pour lisser les variations quotidiennes (hydratation, repas…). S'il n'y a qu'une pesée dans la fenêtre, elle sert telle quelle ; s'il n'y en a aucune, on retombe sur la pesée la plus récente antérieure. Le graphique d'évolution affiche idéalement les deux courbes : pesées brutes et moyenne glissante 7 jours.
- **Usage** : les exercices au poids de corps utilisent cette moyenne glissante comme poids de corps courant ; s'il n'existe aucune pesée du tout, la commande de série le signale et propose d'en saisir une.

## Impacts transverses (à préciser à l'implémentation)

- **Vues** : Historique, Progression exercices, Métriques types, tableau de bord et récap de séance devront afficher les séries temps/distance avec leurs unités propres, et distinguer le « total kg » (musculation + poids de corps) des cumuls minutes / km.
- **QuickAdd « Ajouter une série »** : ajout d'une première question « type de mesure » (reps × poids / poids de corps / temps / distance), le reste du formulaire s'adaptant.
- **Types de séance** : la liste `exercices` du frontmatter pourrait préciser le type de mesure attendu par exercice pour pré-remplir le formulaire.
- **Compatibilité** : les séances existantes restent valides telles quelles ; les nouveaux champs sont additifs.
