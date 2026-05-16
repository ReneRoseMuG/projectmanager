# Log: Tailwind-Tokens

**Datum:** 16.05.26  
**Schritt:** 1 — Tailwind-Tokens umstellen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Tailwind-Farbpalette wurde auf das neue Steelblue-System mit Shell-, Line- und Bold-Accent-Tokens umgestellt. Die bisherigen Akzentklassen für Coral, Amber und Moss wurden auf Crimson, Tangerine und Fern gemappt. Bestehende Teal-Verwendungen in der Oberfläche wurden gemäß Auftrag auf Fern umgezogen, während das neue `teal`-Token für spätere Projektakzente erhalten bleibt. `bg-ink`-Verwendungen wurden auf `bg-steel-900` migriert, damit dunkle Flächen künftig aus der Steel-Skala kommen. Anschließend wurde der vorgeschriebene Build ausgeführt und erfolgreich abgeschlossen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/tailwind.config.ts` | geändert | Steelblue-Farbskala, Bold Accents und neue Schatten ergänzt |
| `apps/web/src/**/*` | geändert | Alte Token-Klassen mechanisch auf die neuen Akzente gemappt |

## Probleme und Abweichungen

`Designstudie-2/Startseite.html`, `Designstudie-2/Projekt.html` und `Designstudie-2/assets/styles.css` sind lokal nicht auffindbar. Der visuelle Browserabgleich konnte deshalb nicht durchgeführt werden; die Umsetzung erfolgte auf Basis der konkreten Auftragsspezifikation. `npm run build` war erfolgreich, mit der bekannten Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Den visuellen Abgleich nachholen, sobald die Dateien unter `Designstudie-2/` verfügbar sind.
