# Log: WikiPageForm Inline Modus

**Datum:** 29.05.26  
**Uhrzeit:** 10:16:36  
**Schritt:** 3 — TASK-141 WikiPageForm Inline-Modus implementieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`WikiPageForm` unterstützt nun einen optionalen Inline-Modus ohne Modal-Wrapper. Der Inline-Kopf verwendet `PageHero` mit Wiki-Breadcrumb, ID-Kopie und optionaler Löschaktion. Bestehende Wiki-Seiten bleiben nach dem Speichern geöffnet, während der Create-Modal-Flow weiterhin schließt und zur neuen Seite navigiert. Die Wiki-Seite rendert ausgewählte Seiten direkt als Inline-Formular und schützt Tree-Navigation bei ungespeicherten Änderungen über den bestehenden Confirm-Dialog. Der Journal-Tab wurde permission-geschützt in das Formular übernommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Inline-Modus, PageHero, Delete-Aktion, Dirty-State und Journal-Tab ergänzt |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Inline-Formular statt Detailansicht verdrahtet, Create-Modal erhalten |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Inline-Modus, Journal-Gating, Delete und Save-Verhalten getestet |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | Page-Verdrahtung und Dirty-Navigation getestet |
| `tests/browser/web/create-child-elements.spec.ts` | geändert | Wiki-E2E-Erwartung auf Inline-Formular angepasst |

## Probleme und Abweichungen

Keine. Der ursprünglich geplante Modal-Modus für bestehende Seiten wird nicht mehr von `WikiPage` genutzt, bleibt aber in `WikiPageForm` rückwärtskompatibel.

## Offene Punkte / Folgeaufgaben

Serielle Testläufe stehen noch aus.

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Betroffene Testebenen sind Unit und Browser/E2E. Bewiesen werden Inline-Rendering, Dirty-Confirm, Journal-Berechtigung, Löschaktion, Save-ohne-Schließen und der bestehende Wiki-Create-Flow mit echten E2E-Daten.
