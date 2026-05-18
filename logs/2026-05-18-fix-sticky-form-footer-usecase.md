# Log: Sticky Form Footer und Use Case Detail

**Datum:** 18.05.26  
**Schritt:** Fix — Sticky Form Footer und Use Case Detail  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Formularaktionen wurden weiter vereinheitlicht. `FormModal` unterstützt jetzt eine linke Footer-Aktionszone, damit destruktive Aktionen wie „Löschen" im festen Footer liegen können, statt als scrollender Gefahrenbereich im Formularinhalt zu erscheinen. Das Use-Case-Formular nutzt diese Footer-Zone; der scrollende Löschbereich wurde entfernt. Beim Öffnen eines Use Cases wird der Detaildatensatz jetzt neu geladen, wenn der Cache keinen `content` enthält, damit nicht versehentlich die leere Listenfassung im Editor landet. Das Feature-Detailformular und das Projekt-Inlineformular haben jetzt einen sticky Footer. Die Feature-Hero-Aktionen „Speichern" und „Löschen" wurden entfernt; diese Aktionen liegen nun im sticky Formularfooter. Das Wiki-Detailformular hat ebenfalls einen sticky Footer für Speichern und Löschen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Linke Footer-Aktionszone für Modalformulare ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Löschaktion in festen Footer verschoben |
| `apps/web/src/hooks/useUseCases.ts` | geändert | Detail-Laden erzwingt Fetch, wenn gecachter Use Case keinen Inhalt enthält |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Sticky Footer mit Löschen, Verwerfen und Speichern |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Formularaktionen aus dem Hero entfernt |
| `apps/web/src/components/projects/ProjectInlineForm.tsx` | geändert | Sticky Footer für Projekt-Inlineformular |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Sticky Footer für Wiki-Detailformular |
| `logs/2026-05-18-fix-sticky-form-footer-usecase.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die Speichern-Aktion im RelationPanel bleibt im Panel, weil sie keine Hauptformularaktion ist, sondern die Relationenzuordnung selbst speichert.

## Offene Punkte / Folgeaufgaben

Keine.
