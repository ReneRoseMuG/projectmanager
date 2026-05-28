# Log: TASK-110 Kommentar Modal List Board

**Datum:** 28.05.26  
**Schritt:** Feature — TASK-110 Kommentare über Modal erstellen und bearbeiten  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Kommentarsektionen verwenden nun keinen Inline-Editor mehr. Gespeicherte Kommentare werden über `CommentThread` als Liste oder Board angezeigt; neue und bestehende Kommentare öffnen einen Rich-Text-Modal-Dialog. Vorgemerkte Kommentare im Create-Pfad werden über `PendingCommentList` ebenfalls als Liste oder Board dargestellt und per Modal angelegt oder bearbeitet. Die bestehenden API-, Hook-, Versions- und Invalidation-Pfade bleiben unverändert. Create/Edit-Aktionen werden über `comments:write` gegatet, Delete für gespeicherte Kommentare über `comments:delete`. Die Testleitplanken wurden angewendet: Web-Unit- und Komponentenintegrationstests prüfen beobachtbare Modal-Interaktionen, Permission-Gating, lokale Draft-Daten und Callback-Payloads mit jsdom-Isolation.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/CommentBodyModal.tsx` | neu | Gemeinsamer Rich-Text-Modal für Kommentar-Create/Edit |
| `apps/web/src/components/ui/CommentThread.tsx` | geändert | Gespeicherte Kommentare als Liste/Board mit Modal-Create/Edit und Permission-Gating |
| `apps/web/src/components/ui/PendingCommentList.tsx` | geändert | Pending-Kommentare als Liste/Board mit Modal-Create/Edit |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Pending-Kommentar-Updates im Create-Pfad verdrahtet |
| `tests/unit/web/components/ui/CommentThread.test.tsx` | geändert | Modal-, List/Board- und Permission-Tests ergänzt |
| `tests/unit/web/components/ui/PendingCommentList.test.tsx` | geändert | Draft-Modal-, List/Board- und Permission-Tests ergänzt |
| `tests/integration/web/components/ui/CommentThread.integration.test.tsx` | geändert | Create/Update-Integration auf Modal-Workflow umgestellt |
| `tests/unit/web/components/ui/OwnerRelationBoard.test.tsx` | geändert | PendingCommentList-Erwartungen auf Modal-Workflow angepasst |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Testhelper für Pending-Kommentare auf Modal-Workflow und comments:write angepasst |

## Probleme und Abweichungen

Der vollständige Web-Testlauf ist nicht vollständig grün: `tests/unit/web/components/features/FeatureForm.test.tsx > deaktiviert Bild-Upload für Kurzbeschreibung und Inhalt im Create-Modus` erwartet `data-image-upload="disabled"` für `feature-form-content-view`, erhält aber `enabled`. Dieser Fehler liegt außerhalb der TASK-110-Kommentaränderung und wurde gemäß Regel nicht spekulativ behoben.

## Offene Punkte / Folgeaufgaben

Den unabhängigen FeatureForm-Bild-Upload-Test separat klären. Für TASK-110 selbst sind keine offenen Umsetzungspunkte bekannt.

