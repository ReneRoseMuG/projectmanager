# Log: Token-Migration

**Datum:** 17.05.26  
**Schritt:** 0 — CSS Custom Properties: Token-Migration  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Design-System-Großauftrag wurde als Klasse 5 eingeordnet und Schritt 0 wurde umgesetzt. `apps/web/src/styles/theme.css` wurde als neue Token-Quelle für Farben und Schatten angelegt. `apps/web/tailwind.config.ts` referenziert die Farben und Shadows jetzt über CSS Custom Properties, inklusive zusätzlicher Shadow-Tokens für die bisher inline definierten Card- und Icon-Schatten. `apps/web/src/main.tsx` importiert `theme.css` vor dem Tailwind-Stylesheet. In TSX-Dateien wurden 15 Inline-Shadow-Werte durch benannte Shadow-Utilities ersetzt. Der Build `npm run build -w apps/web` wurde erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/styles/theme.css` | neu | CSS Custom Properties für Farben und Schatten |
| `apps/web/tailwind.config.ts` | geändert | Hex-Farbwerte und Shadow-Werte durch `var()`-Referenzen ersetzt |
| `apps/web/src/main.tsx` | geändert | `theme.css` vor dem Tailwind-Stylesheet importiert |
| `apps/web/src/styles.css` | geändert | Root-Farbe und Hintergrund auf CSS Custom Properties umgestellt |
| `apps/web/src/components/attachments/AttachmentUploader.tsx` | geändert | Inline-Shadow durch `shadow-steel-icon` ersetzt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Inline-Shadow durch `shadow-modal` ersetzt |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `apps/web/src/components/tasks/CommentSection.tsx` | geändert | Inline-Shadows durch `shadow-card` ersetzt |
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Inline-Shadows durch `shadow-card` ersetzt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `apps/web/src/components/ui/ConfirmDialog.tsx` | geändert | Inline-Shadow durch `shadow-modal` ersetzt |
| `apps/web/src/components/ui/Modal.tsx` | geändert | Inline-Shadow durch `shadow-modal` ersetzt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Inline-Shadow durch `shadow-card` ersetzt |
| `logs/2026-05-17-schritt-00-token-migration.md` | neu | Schritt-Log für Schritt 0 |
| `logs/README.md` | geändert | Log-Index um den blockierten Schritt ergänzt |

## Probleme und Abweichungen

Zu Beginn wurde Schritt 0 zu eng als blockiert interpretiert. Nach Nutzerklärung wurde die Aufgabenliste als maßgeblich behandelt und die dort ausdrücklich genannten Änderungen an `main.tsx` und TSX-Shadow-Klassen wurden umgesetzt. Für visuelle Identität wurde kein Screenshot-Vergleich mit einem Vorher-Zustand durchgeführt; die bisherigen Inline-Shadow-Werte wurden aber durch äquivalente Tokenwerte (`shadow-card`, `shadow-modal`, `shadow-steel-icon`) ersetzt.

## Offene Punkte / Folgeaufgaben

Keine.
