# Log: Wiki-Export Bilder-src

**Datum:** 11.06.26  
**Uhrzeit:** 14:31:25  
**Schritt:** Fix — Wiki-Export Bilder-src  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Wiki-HTML-Export erkennt eingebettete Content-Images jetzt nicht mehr nur im exakt relativen Format `src="/api/content/images/<id>"`. Die Exportlogik wertet nun das komplette `src`-Attribut aus und akzeptiert auch Query-Strings, absolute Browser-URLs wie `http://localhost:5173/api/content/images/<id>` sowie unterschiedliche Attributreihenfolgen. Erkannte Bilder werden weiterhin unverändert unterhalb des konfigurierten Exportordners in `assets/images/` geschrieben. Die exportierten HTML-Dateien bekommen weiterhin relative `src`-Verweise auf diesen lokalen Asset-Ordner, damit die Seiten offline aus dem Exportverzeichnis funktionieren.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/wiki.service.ts` | geändert | Bild-src-Erkennung im Wiki-Export robuster gemacht |
| `tests/integration/api/wiki.test.ts` | geändert | Export-Test für Query-String, absolute URL und Editor-Klassen erweitert |
| `logs/2026-06-11-14-31-25-fix-wiki-export-bilder-src.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Testebene ist Integration/API mit echter Test-App, echter Testdatenbank und echtem temporärem Exportverzeichnis. Es werden keine Mocks verwendet. Bewiesen wird: Content-Bilder werden per API angelegt, in Wiki-HTML referenziert, beim Export als Dateien geschrieben und im exportierten HTML relativ referenziert.

## Probleme und Abweichungen

Der Root-Befehl `npm run check` existiert nicht; der passende API-Typecheck wurde stattdessen mit `npm run typecheck -w apps/api` ausgeführt. Keine fachlichen Abweichungen.

## Offene Punkte / Folgeaufgaben

Keine.
