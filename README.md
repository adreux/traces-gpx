# Traces GPX · trail au départ des gares

Des parcours trail autour de Paris, accessibles en train. Ceux que j'ai courus portent le badge vert ✓ Testé ; les autres sont sur ma liste à tester.

Site : https://adreux.github.io/traces-gpx/

## Les règles

1. **Badge vert = testé** : les parcours que j'ai courus portent le badge ✓ Testé, avec la date (`"teste": true`, `"teste_le"`). Les autres sont sur ma liste à tester.
2. **Accès en train** : gare et ligne indiquées, de gare à gare quand c'est possible. Sinon, c'est précisé.
3. **Tracés crédités** : course, parc ou fédération, celui qui a tracé le parcours est toujours cité (`origine`). Pour un tracé de course, le nom de la course et l'organisation sont obligatoires. Pour un tracé issu d'OpenStreetMap : © contributeurs OSM, licence ODbL.

## Ajouter un parcours

1. Exporter la trace (Strava : activité → ⋯ → Exporter le GPX). Retirer horaires et fréquence cardiaque si besoin.
2. La déposer dans `gpx/` sous le nom `AAAA-MM-JJ_gare-depart_gare-arrivee.gpx`.
3. Ajouter une entrée dans `parcours.json` :

```json
{
  "id": "gare-depart-gare-arrivee",
  "titre": "…",
  "resume": "…",
  "acces": {
    "depart": { "gare": "…", "ligne": "Transilien J", "paris": "depuis Paris Saint-Lazare" },
    "arrivee": { "gare": "…", "ligne": "…" }
  },
  "distance_km": 20.8,
  "dplus_m": 610,
  "teste": true,
  "teste_le": "AAAA-MM-JJ",
  "zone": "…",
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
