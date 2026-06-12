# Log: Wiki-Detailkopf nutzt vorhandenen Hero statt Extra-Zeile

**Datum:** 12.06.26  
**Uhrzeit:** 10:09:09  
**Schritt:** Fix — Korrektur der Detailkopf-Vereinheitlichung (Wiki)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Korrektur des vorherigen Ansatzes (Log 07:29:21): Statt im Wiki-Tab eine zusätzliche helle Aktionszeile mit kleinem `surface`-Copy-Icon einzufügen, nutzt die Wiki-Detailansicht jetzt den **bereits vorhandenen** Hero-Bereich der Wiki-Seite als Detailkopf — genau wie alle anderen Detailseiten. Sobald eine Seite gewählt ist, rendert `WikiPage` den oberen `PageHero` als `variant="detail"` (Breadcrumb „Wiki › Übergeordnet", Seitentitel, `FileText`-Icon) mit dem großen steel-Aktionscluster (`DetailHeaderActions tone="onSteel"`): Speicherstatus, **ID kopieren** in Hero-Größe (`WIKI-<id>`), In neuem Tab, Löschen. Ist keine Seite gewählt, bleibt der Listen-Hero („Wiki / N Seiten" + Exportieren).

Die eingebettete Aktionszeile im Formular wurde entfernt; sie bleibt nur als reiner „Bearbeiten"-Umschalter für den (in der Wiki-Ansicht nie auftretenden) Lesemodus erhalten. Der Auto-Save-Status wird über einen neuen Callback `onAutoSaveStatusChange` aus `WikiPageForm` nach `WikiPage` hochgereicht und im Hero angezeigt. Standalone- und Modal-Modus des Formulars bleiben unverändert (eigener Hero).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/WikiPage.tsx` | geändert | Oberer Hero wird bei gewählter Seite zum Detailkopf (großer Cluster); Save-Status-State; `onOpenInTab` entfällt zugunsten Hero |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Eingebettete Aktionszeile auf reinen Edit-Umschalter reduziert; `onAutoSaveStatusChange` hochgereicht |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | Detail-Hero zeigt/kopiert `WIKI-10`; Save-Status-Lift; Mock-Titel raus aus Heading |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Copy-Aktion jetzt im Standalone-Hero geprüft; embedded ohne Copy |

## Probleme und Abweichungen

Testleitplanken: Unit-Ebene, echte Komponenten; Mocks nur für Support-Hooks und Clipboard. Verifikation: betroffene Dateien 49/49 grün, `tsc` sauber. Voller Web-Unit-Lauf: 701 grün / 30 rot — exakt dieselben 30 vorbestehenden Fehler wie in der Baseline (Board-Views u. a.), 0 neue Fehler.

Designentscheidung: Bei geöffneter Seite zeigt der Detailkopf kein „Exportieren" (gehört zur Listenansicht); auf Wunsch ergänzbar.

## Offene Punkte / Folgeaufgaben

- 30 vorbestehende rote Web-Unit-Tests bleiben offen (separater Auftrag).
- Optional: Standalone-Modus-Hero und der Seiten-Hero könnten später noch vollständig konsolidiert werden (aktuell bewusst getrennt gelassen, um die Standalone-Ansicht nicht zu verändern).
