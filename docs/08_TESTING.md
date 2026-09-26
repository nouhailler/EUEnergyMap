# 08 — Stratégie de Tests — EU Energy Map

## 1. Périmètre de Test

Les tests automatisés couvrent les aspects critiques de fiabilité et de pédagogie :

1. **Mapping Pays ↔ Zones** :
   - Vérification que chacun des 27 pays de l'UE possède une zone valide.
   - Intégrité des codes ISO-3166-1 alpha-2.
2. **Normalisation des Données** :
   - Traitement scrupuleux des valeurs `null` (ne jamais les altérer en `0`).
   - Préservation des drapeaux `isEstimated` et de la méthode d'estimation.
   - Préservation des unités de mesure.
3. **Calculs Locaux et Dérivés** :
   - Calcul de la charge nette : `totalLoad - (solar + wind)`.
   - Calcul du solde net d'échanges : `exportTotal - importTotal`.
   - Calcul des pourcentages de mix : somme et cohérence.
4. **Formatage et Accessibilité** :
   - Formatage des puissances en MW ou GW.
   - Formatage de l'intensité carbone en `gCO₂eq/kWh`.
   - Formatage des horodatages locaux (heure de Paris / UTC).
5. **Gestion des Erreurs et Robustesse** :
   - Réponse adaptée lors d'un code 429 ou 500 amont.
   - Statut réseau dégradé et bascule offline.

---

## 2. Exécution des Tests

Les tests sont exécutés avec `vitest` :
```bash
npm run test
# ou
npx vitest run
```
