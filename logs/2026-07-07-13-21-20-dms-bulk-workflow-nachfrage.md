# Log: DMS Bulk-Workflow — Nachfrage & Deselektion

**Datum:** 07.07.26  
**Uhrzeit:** 13:21:20  
**Schritt:** Fix (Mehrfachauswahl-Workflow)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Behebt eine verwaiste Selektion: Weist man in einer gefilterten Ansicht (z. B. „Nicht einsortiert") einer Auswahl eine Sammlung zu, fallen die Dokumente aus der Liste, blieben bisher aber markiert. Jetzt fragt nach jeder **erfolgreichen** Bulk-Operation (Sammlung zuweisen, Kategorie zuweisen, Download) ein Dialog (`useConfirm`, §8.12) „Weitere Bulk-Operation?" mit den Optionen „Ausgewählt lassen" / „Auswahl aufheben". Bei „Auswahl aufheben" wird die Selektion vollständig geleert; das rechte Panel kehrt aus der Bulk-Leiste in den Normalzustand zurück.

Der zentrale `run`-Helfer gibt dafür jetzt `Promise<boolean>` zurück (true = Erfolg) — rückwärtskompatibel, die vorhandenen `void run(...)`-Aufrufe ignorieren den Wert. So erscheint die Nachfrage nur nach Erfolg; bei einem Fehler bleibt die Auswahl für einen erneuten Versuch erhalten. Der Dialog gilt für alle drei Aktionen, auch für den Download (dort verschwinden die Items zwar nicht, die Nachfrage wurde aber ausdrücklich für alle drei gewünscht).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | `useConfirm` eingebunden, `run` → boolean, `promptContinueOrClear`, drei Bulk-Handler async + Nachfrage |

## Probleme und Abweichungen

Kein isolierter Test ergänzt: `DocumentsPage` hat kein Test-Setup, ein vollständiger Seiten-Test (Provider-Mocks für Confirm/Toast/Query/Auth/useDocuments) steht in keinem Verhältnis zu diesem kleinen Workflow-Zusatz. Die Bulk-Aktionen selbst sind über die bestehenden Hook-Tests abgedeckt; der neue Nachfrage-/Deselektions-Ablauf ist reine UI-Orchestrierung und beobachtbar in der App. Web-Typecheck grün.

## Offene Punkte / Folgeaufgaben

Keine. Bestehender offener Punkt unverändert: Design-Leitfaden §8.26 (DMS-Karte + Mehrfachauswahl) liegt als Vorschlag zur Freigabe; Änderungen noch nicht committet (kein `save`).
