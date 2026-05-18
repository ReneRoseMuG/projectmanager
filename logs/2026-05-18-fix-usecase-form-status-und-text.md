# Log: Use-Case Formular Status und Text

**Datum:** 18.05.26  
**Schritt:** Fix — Use-Case Formular Status und Text  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Use-Case-Formular zeigt jetzt im Header den aktuellen Status als Pill an. Dafür wurde `FormModal` um einen optionalen Header-Meta-Bereich erweitert, der bestehende Formulare unverändert lässt und bei Use Cases den Status aus dem Formularzustand rendert. Der fachlich falsche Erklärungssatz zur API-Speicherung wurde aus dem Zuordnungsbereich entfernt. Die Bestandsprüfung hat bestätigt: Use Cases haben aktuell Aufgaben als Join-Relation und Kommentare, aber keine Notizen- oder Attachment-Infrastruktur in Schema, API und Hooks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Optionalen Header-Meta-Slot ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Status-Pill im Header ergänzt und API-Erklärungstext entfernt |
| `logs/2026-05-18-fix-usecase-form-status-und-text.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Use Cases besitzen aktuell keine Notizen- oder Attachment-Relationen. Falls diese Relationen fachlich benötigt werden, ist dafür ein separater Schema-, API-, Hook- und UI-Auftrag nötig.
