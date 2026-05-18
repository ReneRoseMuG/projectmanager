# Log: UseCase-Formular

**Datum:** 18.05.26  
**Schritt:** 3 — UseCaseForm mit Pending-Verwaltung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`UseCaseForm` wurde auf ein einheitliches Create/Edit-Modal mit Tabs für Stammdaten, Aufgaben, Tickets und Kommentare umgestellt. Im Create-Modus sammelt das Formular Aufgaben, Tickets und Kommentare lokal als Pending-Daten. Im Edit-Modus nutzt es die vorhandenen Owner-Boards und den Kommentar-Thread für die bestehende Entität. `onSubmit` gibt nun die erzeugte Entität zurück, damit `onPostCreate` Pending-Daten nach der Parent-Erstellung seriell verarbeiten kann. Nested-Dialog-Submits stoppen ihre Event-Propagation, damit sie nicht versehentlich das äußere Formular absenden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Create/Edit-Tabs und Pending-Daten ergänzt |
| `apps/web/src/components/__tests__/OwnerForms.test.tsx` | neu | UseCaseForm-Create/Edit-Verhalten getestet |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Playwright-E2E konnte wegen eines lokalen `tsx`/`esbuild`-Startfehlers nicht ausgeführt werden.
