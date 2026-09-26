# 09 — Limitations Connues & Délimitations du Périmètre — EU Energy Map

## 1. Limitations Liées au Type de Compte API

- **Quotas de Requêtes** : L'accès gratuit ou d'essai à l'API Electricity Maps est plafonné en fréquence de requêtes par minute et par mois. L'application intègre donc un cache serveur pour préserver ces quotas.
- **Historique Limité à 24 Heures** : Les endpoints `/v4/carbon-intensity/history` fournissent 24 heures glissantes sur les plans standards. L'historique à 7 jours ou 30 jours requiert un plan commercial supérieur avec les endpoints `/past-range`. L'interface affiche loyalement un message pédagogique si un intervalle étendu est demandé sans support du plan.
- **Prix Spot / Day-Ahead** : Non disponible sur le plan gratuit standard. Cette fonctionnalité est donc exclue du V0.1 pour respecter scrupuleusement l'engagement de véracité des données.
- **Prévisions (Forecasts)** : Limitées à certaines zones géographiques selon les autorisations du compte.

---

## 2. Délimitations Géographiques et Électriques

- **Frontières Politiques vs Frontières Électriques** :
  - Le réseau électrique européen opère par zones de synchronicité et zones d'enchères (bidding zones).
  - Certains États de l'UE (Danemark, Suède, Italie) possèdent plusieurs zones de prix internes. Le snapshot national fournit la vue unifiée ou la zone dominante désignée.
  - Chypre et Malte ont des configurations électriques singulières (Chypre est un réseau insulaire autonome isolé ; Malte est reliée à la Sicile via le câble intercepteur HVDC).
- **Données Estimées vs Mesurées** :
  - Dans certains pays ou lors de retards de publication des opérateurs de réseaux (TSO / ENTSO-E), Electricity Maps utilise des algorithmes d'apprentissage ou des estimations statistiques.
  - L'application informe toujours l'utilisateur au moyen du badge visuel `<DataQualityBadge />` et mentionne "Donnée estimée".
