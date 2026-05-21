# Log: Details-Tab-Body-Breite

**Datum:** 21.05.26  
**Schritt:** Fix — Details-Tab-Body-Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Inhaltsbereich des Details-Tabs wird wieder auf die frühere Formularbreite begrenzt. Dafür erhält `FormModal` eine optionale `contentClassName`, die am Body-Wrapper der Formular-Shell ankommt. Die tab-basierten Detailformulare setzen diese Klasse nur bei `activeTab === "details"` auf `w-full max-w-7xl`. Dadurch bleiben Stammdaten- und Detailfelder kompakt, während Board-, Listen- und Relation-Tabs weiterhin den vollen verfügbaren Platz nutzen. Die Änderung betrifft nur Web-Layout und verändert keine API-, Auth-, Query- oder Datenmodelllogik.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Optionale `contentClassName` für den Body-Wrapper ergänzt. |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Details-Tab-Body auf `max-w-7xl` begrenzt. |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Details-Tab-Body auf `max-w-7xl` begrenzt. |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Details-Tab-Body auf `max-w-7xl` begrenzt. |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Details-Tab-Body auf `max-w-7xl` begrenzt. |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Details-Tab-Body auf `max-w-7xl` begrenzt. |
| `tests/unit/web/components/ui/FormModal.test.tsx` | geändert | Body-Klassenaufsatz in der Page-Variante abgesichert. |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Details-Tab begrenzt, Board-Tab nicht begrenzt. |

## Probleme und Abweichungen

Keine. Der Web-Build meldet weiterhin nur die bekannte Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.

## Ausgeführte Prüfungen

- `npm run test -w apps/web -- FormModal ProjectForm FeatureForm TaskForm MilestoneForm UseCaseForm` — grün, 6 Testdateien / 70 Tests.
- `npm run build -w apps/web` — grün, mit bekannter Vite-Chunk-Size-Warnung.
