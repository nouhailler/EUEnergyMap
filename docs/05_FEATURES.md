# 05 — Fonctionnalités V0.1 — EU Energy Map

## 1. Vue d'Ensemble des Écrans et Fonctionnalités

### 1.1 Dashboard "Europe Électrique Maintenant" (`/`)
- **Carte SVG Interactive** des 27 pays de l'Union européenne avec géolocalisation et projection soignée.
- **Sélecteur d'indicateur cartographique** :
  - Intensité Carbone (`gCO₂eq/kWh`)
  - Part Renouvelable (`%`)
  - Part Bas-Carbone (`%`)
  - Charge Totale (`GW` / `MW`)
  - Source Principale de Production
- **Tooltip au survol / focus** : nom, drapeau, valeur courante, % bas-carbone, % renouvelable, charge, horodatage, statut de mesure/estimation.
- **Bandeau de synthèse européen** : intensité carbone moyenne pondérée, production totale, part renouvelable globale.
- **Tableau accessible complet des 27 pays** en alternative à la carte avec recherche, tri interactif et badges de qualité.

### 1.2 Vue Détaillée par Pays (`/country/:country`)
- En-tête avec nom, drapeau, zone Electricity Maps, et statut de la donnée.
- **Chiffres clés** : Intensité Carbone, Part Sans Fossile, Part Renouvelable, Charge Totale (Load), Charge Nette (Net Load), Solde Net d'échanges.
- **Graphique interactif du Mix Électrique** (production détaillée en barres proportionnelles et pourcentages par source).
- **Module pédagogique "Pourquoi ce chiffre ?"** : décomposition pas à pas des sources contribuant aux émissions de la zone.
- **Sélecteur Production vs Consommation** (avec avertissement pédagogique sur les pertes et les imports/exports).
- **Interconnexions et Flux Directs** : tableau des importations et exportations avec chaque pays voisin.
- **Volet Qualité des données** : date et heure de mesure, mode estimé ou mesuré, méthode d'estimation.

### 1.3 Vue Comparaison (`/compare`)
- Sélection de 2 à 4 pays parmi les 27 pays de l'UE.
- Comparaison factuelle, sans jugement de valeur, sans classement ni score global artificiel.
- Tableau comparatif aligné : Intensité carbone, Part renouvelable, Part bas-carbone, Charge, Puissance nucléaire, éolienne, solaire, gaz, charbon, hydro, etc.

### 1.4 Vue Focus Carbone (`/carbon`)
- Analyse approfondie de l'intensité carbone (`gCO₂eq/kWh`) à l'échelle européenne.
- Dégradé de couleurs scientifiquement étalonné (vert < 100g, orange 100-300g, rouge > 300g).
- Historique 24 heures par zone lorsque fourni par l'API.
- Clarification didactique sur la différence entre cycle de vie ("lifecycle") et émissions directes au brûleur ("direct").

### 1.5 Vue Focus Renouvelables (`/renewables`)
- Cartographie et vue détaillée des filières vertes (éolien, solaire, hydraulique, biomasse, géothermie).
- Tableau triable contrôlé par l'utilisateur (sans terminologie "meilleurs/pires").

### 1.6 Vue Flux Électriques (`/flows`)
- Visualisation interactive des interconnexions transfrontalières entre zones européennes.
- Direction des flux, volumes en GW/MW, et mise en évidence des principaux pays exportateurs et importateurs nets.

### 1.7 PWA & Accessibilité
- Installation autonome sur écran d'accueil (desktop & mobile) avec bouton dédié.
- Support hors-ligne avec consultation de la dernière synchronisation connue.
- Navigation complète au clavier et accessibilité ARIA.
