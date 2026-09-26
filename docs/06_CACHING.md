# 06 — Stratégie de Cache et Rafraîchissement — EU Energy Map

## 1. Principes de la Gestion du Cache

Pour concilier la fraîcheur des données énergétiques avec les quotas stricts de l'API Electricity Maps et la réactivité de l'interface, une stratégie de cache à deux niveaux est déployée :

```text
[Navigateur / Client React]
       ▲ Cache mémoire client (SWR / React State)
       ▼ Cache persistant localStorage (Mode Offline)
[Serveur Express / Proxy]
       ▲ Cache mémoire serveur (TTL paramétrable : 5 à 15 minutes)
       ▼
[Electricity Maps API]
```

---

## 2. Niveaux de Cache

### Niveau 1 : Cache Mémoire Serveur (Express Proxy)
- **TTL par défaut** : 300 secondes (5 minutes). Les données du réseau électrique européen sont publiées à cadence horaire ou au quart d'heure par les GRT (ENTSO-E). Interroger l'API à la seconde gaspillerait le quota sans gain d'information.
- **Dédoublonnement des requêtes** : Si 10 utilisateurs ou 5 onglets demandent simultanément les données de la zone `FR`, le serveur exécute un seul appel upstream et diffuse la réponse à tous les demandeurs.
- **Résilience** : En cas d'erreur réseau temporaire amont (500, timeout, 429), le serveur renvoie la dernière donnée valide en cache accompagnée d'un en-tête `X-Cache: STALE`.

### Niveau 2 : Cache Client (Navigateur)
- **Déduplication au sein de l'application React** : Évite que le composant Carte et le composant Tableau n'émettent deux requêtes séparées pour le même pays.
- **Stockage local (`localStorage`)** : Sauvegarde des derniers snapshots validés pour consultation immédiate lors du rechargement de la page ou en l'absence de réseau.
- **Horodatage explicite** :
  - "Dernière mise à jour : 14:15:00"
  - "Prochain rafraîchissement dans : 04:30"

---

## 3. Configuration Centralisée du Rafraîchissement

Toutes les durées de polling sont régies par des constantes vérifiables :

```typescript
export const POLLING_CONFIG = {
  SNAPSHOT_REFRESH_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  HISTORY_REFRESH_INTERVAL_MS: 15 * 60 * 1000,  // 15 minutes
  OFFLINE_STALE_THRESHOLD_MS: 30 * 60 * 1000,   // 30 minutes
};
```
