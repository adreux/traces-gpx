# Traces GPX · trail au départ des gares

Les parcours trail que j'ai vraiment courus, au départ et à l'arrivée d'une gare desservie depuis Paris.

Site : https://adreux.github.io/traces-gpx/

## Les règles

1. **Testé** : une trace n'entre ici que si je l'ai courue. La date est indiquée.
2. **De gare à gare** : départ et arrivée dans une gare.
3. **Les tracés de course sont crédités** : quand un parcours reprend celui d'une course, le nom de la course et l'organisation sont obligatoires (`origine.type = "course"`), avec un lien. Le travail de traçage revient aux organisateurs.

## Ajouter un parcours

1. Exporter la trace (Strava : activité → ⋯ → Exporter le GPX). Retirer horaires et fréquence cardiaque si besoin.
2. La déposer dans `gpx/` sous le nom `AAAA-MM-JJ_gare-depart_gare-arrivee.gpx`.
3. Ajouter une entrée dans `parcours.json` :

```json
{
  "id": "gare-depart-gare-arrivee",
  "titre": "…",
  "resume": "…",
  "depart": { "gare": "…", "ligne": "Transilien J", "paris": "Paris Saint-Lazare" },
  "arrivee": { "gare": "…", "ligne": "…", "paris": "…" },
  "distance_km": 20.8,
  "dplus_m": 610,
  "teste_le": "AAAA-MM-JJ",
  "origine": { "type": "personnel" },
  "gpx": "gpx/….gpx",
  "notes": ["…"]
}
```

Parcours inspiré d'une course :

```json
"origine": {
  "type": "course",
  "course": "Nom de la course",
  "organisation": "Nom de l'organisation",
  "lien": "https://site-de-la-course"
}
```

Pas d'étape de build : la page lit `parcours.json` et les GPX directement. Aperçu en local : `python3 -m http.server`, puis http://localhost:8000.

## Avertissement

Traces données à titre indicatif. Vérifie l'état des chemins, les accès et les périodes de chasse avant de partir, et respecte les propriétés privées. Fonds de carte © OpenStreetMap et OpenTopoMap (CC-BY-SA).
