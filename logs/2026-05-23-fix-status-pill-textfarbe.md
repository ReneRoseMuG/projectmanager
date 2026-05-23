# Log: Status-Pill-Textfarbe

**Datum:** 23.05.26  
**Schritt:** Fix — Status-Pill-Textfarbe  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Textfarbe für gefüllte Katalog-Styles wurde fest auf Weiß gesetzt. Damit zeigen Status-Pills wie „Offen“ und „In Arbeit“ unabhängig von ihrer Hintergrundfarbe einheitlich weiße Schrift. Die bisherige dynamische Kontrastberechnung wurde aus `catalogs.ts` entfernt, weil sie nach dieser Designentscheidung nicht mehr benötigt wird. Die Änderung folgt der visuellen Richtlinie für Pills: solide Füllfarbe mit weißem Text. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/catalogs.ts` | geändert | `catalogFillStyle` setzt Textfarbe immer auf Weiß; ungenutzte Kontrast-Helfer entfernt |
| `logs/2026-05-23-fix-status-pill-textfarbe.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
