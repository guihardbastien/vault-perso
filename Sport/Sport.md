# 🏋️ Sport — Total Calculator

Suivi d'entraînement : chaque série = (répétitions × poids en kg) + note de fun (1–5). Le **total** (charge totale déplacée) est calculé par exercice et par séance, et suivi dans le temps.

## Utilisation — 4 commandes (Cmd+P)

1. **🏋️ Sport : Démarrer une séance** — choisis le type, ton humeur (mauvais / ok / bon) et l'objectif total : une valeur en kg ou `+2%` par rapport à la dernière séance de ce type. La note de séance est créée avec les exercices du type pré-chargés.
2. **➕ Sport : Ajouter une série** — exercice, répétitions, poids, fun, et douleur éventuelle (localisation + gravité). La série s'ajoute à la séance en cours, le tableau de bord se met à jour en direct.
3. **✅ Sport : Terminer la séance** — enregistre l'heure de fin ; le récap est prêt à copier-coller.
4. **🆕 Sport : Nouveau type de séance** — nom du type puis exercices un par un (entrée vide pour terminer) ; la note du type est créée avec son historique automatique.

Les notes restent du markdown lisible : tu peux aussi ajouter ou corriger une série à la main dans la section `## Séries` d'une séance, au format `- [exo:: Nom] [reps:: 8] [poids:: 60] [fun:: 4]`.

## Pages

- [[Sport/Historique|🗓 Historique]] — toutes les séances
- [[Sport/Progression exercices|📈 Progression exercices]] — best set, 1RM estimé, graphiques par exercice
- [[Sport/Métriques types de séance|📊 Métriques types de séance]] — vue d'ensemble par type

## Types de séance

Un type = une note dans `Sport/Types de séance/` avec la liste `exercices` dans le frontmatter (ordre respecté au démarrage). Crée une note par type d'entraînement ; sa page affiche automatiquement l'historique et les graphiques du type.

- [[Sport/Types de séance/Push|Push]] · [[Sport/Types de séance/Pull|Pull]] · [[Sport/Types de séance/Legs|Legs]]

> [!tip] Les trois séances actuelles dans `Sport/Séances/` sont des exemples pour vérifier les vues — supprime-les quand tu commences à logger.
