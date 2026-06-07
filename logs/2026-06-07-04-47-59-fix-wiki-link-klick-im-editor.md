# Log: Wiki Link Klick im Editor

**Datum:** 07.06.26  
**Uhrzeit:** 04:47:59  
**Schritt:** Fix — Wiki Link Klick im Editor  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Wiki-Links im Rich-Text-Editor navigieren jetzt auch im Bearbeitungsmodus bei einfachem Klick. Die bisherige Ctrl-/Cmd-Sonderbedingung wurde für erkannte Wiki-Links entfernt, damit der Link die Datenbank-ID direkt aus `data-wiki-page-id`, `/wiki/<id>` oder älteren `wiki://<id>`-Hrefs lesen und zur Wiki-Seite navigieren kann. Rich-Text-Links erhalten zusätzlich `cursor: pointer`, damit die Klickbarkeit beim Hover sichtbar ist. Die Änderung bleibt auf Wiki-Link-Interaktion und Link-Cursor beschränkt; externe Links, Exportlogik, API, Rechte und Schema bleiben unverändert. Die Testentwurfsleitplanken wurden angewendet: Unit-Testebene mit jsdom, gemocktem Router und gemocktem TipTap, ohne DB- oder Dateisystemzugriff.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Einfache Klicknavigation für Wiki-Links auch im Bearbeitungsmodus aktiviert |
| `apps/web/src/styles.css` | geändert | Pointer-Cursor für Rich-Text-Links gesetzt |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Erwartung für einfachen Wiki-Link-Klick im Bearbeitungsmodus angepasst |
| `logs/2026-06-07-04-47-59-fix-wiki-link-klick-im-editor.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der fokussierte Wiki-Link-Testlauf ist grün. Der vollständige Testlauf von `rich-text-inline-field.test.tsx` bleibt weiterhin durch drei bereits bekannte, nicht Wiki-Link-bezogene Testdrifts rot: `T-14b` wegen fehlendem `editor.state.schema.marks` im Mock, `T-22` wegen Sticky-Klassen-Erwartung am falschen Element und `T-27` wegen abweichender Flex-Klassen. Diese Rotfälle wurden gemäß Auftrag nicht eigenständig repariert.

## Offene Punkte / Folgeaufgaben

Die bestehenden roten Editor-Tests `T-14b`, `T-22` und `T-27` sollten separat bereinigt werden.
