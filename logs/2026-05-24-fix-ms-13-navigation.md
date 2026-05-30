# Log: MS-13 Navigation

**Datum:** 24.05.26  
**Schritt:** Fix / Feature — MS-13 Navigation Bugs und Refactorings  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

MS-13 wurde umgesetzt: Formular-Tabs werden bei Refetches nicht mehr auf den Default zurückgesetzt, sondern nur beim frischen Öffnen initialisiert. Projekt-, Feature-, Meilenstein- und Use-Case-Detailseiten lesen den aktiven Tab aus `?tab=` und geben ihn an die jeweilige Formular-Komponente weiter. Tab-Wechsel im Seitenmodus schreiben den Tab per `replace: true` in die URL, sodass `returnTo` den Ausgangs-Tab automatisch transportiert. Feature- und Projekt-Löschaktionen navigieren nach erfolgreichem Löschen nun über `returnTo` statt über hardcodierte Listenpfade. Zusätzlich wurden Browser/E2E-Tests ergänzt, die alle relevanten Parent-Tab-Pfade zur Detailseite und zurück über Abbrechen und Speichern prüfen.

Testleitplanken: Der Testentwurfs-Skill wurde angewendet. Testebenen sind Unit/Component und Browser/E2E. Die Browsertests verwenden echte Browserinteraktion, echte API-Antworten, echte Testdaten und die isolierte Playwright-Runtime unter `tests/.runtime/e2e`; es werden keine UI-, API- oder Auth-Mocks verwendet. Die Unit-Tests prüfen gezielt, dass Entity-Refetches den aktiven Tab nicht zurücksetzen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/*/*Form.tsx` | geändert | Tab-Reset vom Entity-Refetch getrennt; Parent-Formulare unterstützen `initialTab` und URL-Sync |
| `apps/web/src/pages/*DetailPage.tsx` | geändert | `tab`-Parameter gelesen und Delete-Navigation für Feature/Projekt auf `returnTo` umgestellt |
| `tests/browser/web/navigation-return.spec.ts` | neu | Browser-Matrix für Parent-Tab → Detailseite → zurück sowie Status-/Datums-Refetch |
| `tests/browser/web/*.spec.ts` | geändert | Erwartete Rücksprung-URLs um neuen `tab`-Parameter ergänzt |
| `tests/unit/web/**` | geändert | Unit-Abdeckung für Refetch ohne Tab-Reset und neue Parser-Mocks ergänzt |

## Probleme und Abweichungen

Der vollständige Web-Unit-Lauf ist weiterhin nicht vollständig grün, aber die verbleibenden Fehler liegen außerhalb dieses MS-13-Eingriffs: bestehende UI-Klassenerwartungen in `StatusPill.test.tsx`, `ListBoardView.test.tsx` und einem ProjectForm/ViewToggle-Fall. Ein kombinierter E2E-Lauf mit `task-dnd.spec.ts` hatte außerdem einen Timeout im bestehenden Ticket-DnD-Test; der von MS-13 berührte Aufgaben-DnD-Fall war grün.

## Offene Punkte / Folgeaufgaben

Die bestehenden UI-Klassenerwartungen und der Ticket-DnD-Timeout sollten in einem separaten Testfix-Auftrag bereinigt werden. Keine fachlichen MS-13-Punkte sind offen.
