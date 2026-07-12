# 🏋️ Sport — Total Calculator

Suivi d'entraînement multi-personnes : chaque série = (répétitions × poids en kg) + note de fun (1–5). Le **total** (charge totale déplacée) est calculé par exercice et par séance, et suivi dans le temps. Chaque personne a son dossier `Sport/Athlètes/<Personne>/` avec ses séances, ses types et ses pages de suivi.

## Utilisation — 5 commandes (Cmd+P)

1. **👤 Sport : Ajouter une personne** — crée le dossier de la personne avec ses pages Historique, Progression et Métriques.
2. **🏋️ Sport : Démarrer une séance** — choisis pour qui, le type, l'humeur (mauvais / ok / bon) et l'objectif total : une valeur en kg ou `+2%` par rapport à la dernière séance de ce type. La note de séance est créée avec les exercices du type pré-chargés.
3. **➕ Sport : Ajouter une série** — exercice, répétitions, poids, fun, et douleur éventuelle (localisation + gravité). La série s'ajoute à la séance en cours (si plusieurs séances sont ouvertes, la commande demande laquelle), le tableau de bord se met à jour en direct.
4. **✅ Sport : Terminer la séance** — enregistre l'heure de fin ; le récap est prêt à copier-coller.
5. **🆕 Sport : Nouveau type de séance** — pour qui, nom du type puis exercices un par un (entrée vide pour terminer) ; la note du type est créée avec son historique automatique.

Les commandes ne demandent « pour qui ? » que s'il y a plusieurs personnes. Les notes restent du markdown lisible : tu peux aussi ajouter ou corriger une série à la main dans la section `## Séries` d'une séance, au format `- [exo:: Nom] [reps:: 8] [poids:: 60] [fun:: 4]`.

## Personnes

- [[Sport/Athlètes/Bastien/Bastien|👤 Bastien]]
- [[Sport/Athlètes/Alain/Alain|👤 Alain]]

## Types de séance

Un type = une note dans `Sport/Athlètes/<Personne>/Types de séance/` avec la liste `exercices` dans le frontmatter (ordre respecté au démarrage). Crée une note par type d'entraînement ; sa page affiche automatiquement l'historique et les graphiques du type.


> [!tip] Les séances actuelles dans `Sport/Athlètes/Bastien/Séances/` sont des exemples pour vérifier les vues — supprime-les quand tu commences à logger.
