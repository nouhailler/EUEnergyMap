# 07 — Sécurité et Confidentialité des Clés API — EU Energy Map

## 1. Menaces et Règles Absolues

L'exposition d'une clé API tierce dans un bundle web public expose le propriétaire du compte à :
- Le vol ou l'épuisement immédiat des quotas par des tiers ;
- Des surcoûts financiers potentiels ;
- La révocation inopinée du token.

### Règle d'or :
**Aucune clé API Electricity Maps n'est injectée dans le bundle frontend.**
Aucune variable préfixée par `VITE_` ne doit contenir la clé secrète.

---

## 2. Implémentation du Proxy Serveur Sécurisé

Le serveur Node/Express (`server.ts`) agit comme passerelle étanche :

1. La variable d'environnement `ELECTRICITY_MAPS_API_KEY` (ou `EMAPS_TOKEN`) est lue uniquement par Node.js :
   ```typescript
   const apiKey = process.env.ELECTRICITY_MAPS_API_KEY || process.env.EMAPS_TOKEN || '';
   ```
2. Les requêtes partent du frontend vers des routes relatives :
   ```http
   GET /api/electricity-maps/snapshot?zone=FR
   GET /api/electricity-maps/history?zone=FR
   ```
3. Le serveur Express inspecte la demande, filtre les paramètres autorisés, attache l'en-tête `auth-token: ${apiKey}` et joint l'API Electricity Maps.
4. Si aucune clé n'est configurée dans l'environnement, le serveur ne plante pas : il délivre un instantané de référence factuel et certifié (données ENTSO-E réelles issues d'Electricity Maps) avec le statut transparent :
   ```json
   {
     "isDemoFallback": true,
     "source": "Electricity Maps Reference Data"
   }
   ```

---

## 3. Configuration des Variables d'Environnement

Dans `.env` (exclu du contrôle de version via `.gitignore`) ou dans les secrets de déploiement :
```bash
# Clé secrète Electricity Maps API (compte gratuit ou commercial)
ELECTRICITY_MAPS_API_KEY="votre_cle_secrete_ici"
```
Dans `.env.example` (commité à titre indicatif) :
```bash
# Electricity Maps API Token
ELECTRICITY_MAPS_API_KEY="YOUR_ELECTRICITY_MAPS_TOKEN_HERE"
```
