# 04 — Les 27 Pays Membres de l'Union Européenne & Mapping Zones

## 1. Table Complète des 27 États Membres

L'Union européenne compte 27 États membres. Electricity Maps modélise les réseaux par zones de cotation électrique ("bidding zones") ou par pays.
Voici le mapping officiel et explicite :

| # | Nom Français | Nom Anglais | Code ISO | Zone Electricity Maps | Sous-zones le cas échéant | Voisins Électriques Directs (UE & partenaires) |
|---|---|---|---|---|---|---|
| 1 | Autriche | Austria | AT | `AT` | — | DE, CZ, SK, HU, SI, IT, CH |
| 2 | Belgique | Belgium | BE | `BE` | — | FR, NL, DE, LU, GB |
| 3 | Bulgarie | Bulgaria | BG | `BG` | — | RO, GR, RS, MK, TR |
| 4 | Croatie | Croatia | HR | `HR` | — | SI, HU, BA, RS |
| 5 | Chypre | Cyprus | CY | `CY` | Réseau insulaire isolé | — |
| 6 | Tchéquie | Czechia | CZ | `CZ` | — | DE, PL, SK, AT |
| 7 | Danemark | Denmark | DK | `DK` | DK-DK1, DK-DK2 | DE, SE, NO, NL, GB |
| 8 | Estonie | Estonia | EE | `EE` | — | LV, FI, RU |
| 9 | Finlande | Finland | FI | `FI` | — | SE, NO, EE, RU |
| 10 | France | France | FR | `FR` | — | BE, DE, LU, CH, IT, ES, GB |
| 11 | Allemagne | Germany | DE | `DE` | — | DK, NL, BE, LU, FR, CH, AT, CZ, PL, SE, NO |
| 12 | Grèce | Greece | GR | `GR` | — | BG, IT, AL, MK, TR |
| 13 | Hongrie | Hungary | HU | `HU` | — | AT, SK, UA, RO, RS, HR, SI |
| 14 | Irlande | Ireland | IE | `IE` | — | GB (Irlande du Nord) |
| 15 | Italie | Italy | IT | `IT` | IT-NO, IT-CS, IT-SUD, etc. | FR, CH, AT, SI, GR, MT |
| 16 | Lettonie | Latvia | LV | `LV` | — | EE, LT, RU, BY |
| 17 | Lituanie | Lithuania | LT | `LT` | — | LV, PL, SE, BY, RU |
| 18 | Luxembourg | Luxembourg | LU | `LU` | Couplé avec DE | BE, FR, DE |
| 19 | Malte | Malta | MT | `MT` | Interconnecté avec Sicile | IT |
| 20 | Pays-Bas | Netherlands | NL | `NL` | — | DE, BE, GB, DK, NO |
| 21 | Pologne | Poland | PL | `PL` | — | DE, CZ, SK, UA, BY, LT, SE |
| 22 | Portugal | Portugal | PT | `PT` | — | ES |
| 23 | Roumanie | Romania | RO | `RO` | — | UA, MD, BG, RS, HU |
| 24 | Slovaquie | Slovakia | SK | `SK` | — | CZ, PL, UA, HU, AT |
| 25 | Slovénie | Slovenia | SI | `SI` | — | AT, IT, HR, HU |
| 26 | Espagne | Spain | ES | `ES` | — | FR, PT, MA, AD |
| 27 | Suède | Sweden | SE | `SE` | SE1, SE2, SE3, SE4 | NO, FI, DK, DE, PL, LT |

---

## 2. Gestion des Zones Multiples et Particularités

- **Danemark (DK)** : Traversé par deux réseaux synchrones distincts (DK1 connecté au réseau synchrone d'Europe continentale, DK2 au réseau nordique). L'application présente soit l'agrégat national `DK`, soit les sous-zones `DK-DK1` et `DK-DK2`.
- **Italie (IT)** : Découpée en plusieurs zones de marché (Nord, Centre-Nord, Centre-Sud, Sud, Calabre, Sicile, Sardaigne). L'agrégat `IT` est privilégié pour la vue d'ensemble nationale.
- **Suède (SE)** : Découpée en quatre zones (SE1 Luleå, SE2 Sundsvall, SE3 Stockholm, SE4 Malmö). L'agrégat `SE` est utilisé pour la synthèse nationale.
- **Luxembourg (LU)** : Fortement intégré au réseau et à la zone de prix allemande.
- **Chypre (CY)** : Île actuellement isolée électriquement du réseau continental synchrone (projet EuroAsia Interconnector en cours). Ses flux transfrontaliers sont nuls.
