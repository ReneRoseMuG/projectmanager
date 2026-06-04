# Log: MS-50 — Wiki Lesemodus und wiki://-Link-Interceptor

**Datum:** 04.06.26  
**Uhrzeit:** 10:03:22  
**Schritt:** Feature — Wiki Lesemodus (TASK-210) + wiki://-Link-Interceptor (TASK-211)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Zwei koordinierte Tasks aus Meilenstein MS-50 wurden vollständig implementiert.

**TASK-210 — Lesemodus:**  
`WikiPage.tsx` erhielt einen `editing`-State (Default `false`) und einen `useEffect` der `editing` bei Seitenwechsel zurücksetzt. `WikiPageForm.tsx` erhielt die Props `editable` und `onEdit`, einen `effectiveEditable`-Ausdruck (Default: `false` im Inline-Modus, `true` sonst), einen Reset-Effekt bei Moduswechsel, einen Bearbeiten-Button im PageHero (standalone chrome) und einen Bearbeiten-Button über dem TabBar (embedded chrome) sowie eine bedingte Footer-Anzeige.

**TASK-211 — wiki://-Interceptor:**  
`RichTextInlineField` erhielt eine `editable`-Prop (separat von `readOnly`), die TipTap über `useEditor({ editable })` und einen `useEffect` für Laufzeitsynchronisierung steuert. Ein `handleContainerClick`-Handler auf dem äußersten Div fängt `href^="wiki://"` ab: im Lesemodus bei einfachem Klick, im Editiermodus nur bei Ctrl/Cmd+Klick. Navigation via `useNavigate` + `useStandaloneView`. Die Toolbar bleibt im DOM (kein Layout-Shift), wird im Lesemodus mit `invisible pointer-events-none` ausgeblendet.

**Testentwurfs-Skill:** angewendet. Testebene: Unit (jsdom). Beobachtbares Verhalten: Toolbar-Sichtbarkeit, Footer-Präsenz, Edit-Button-Callback, navigate-Aufruf.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | editable-Prop, setEditable-Sync, handleContainerClick, toolbar invisible-Wrapping |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | editable + onEdit Props, effectiveEditable, Edit-Buttons, bedingter Footer |
| `apps/web/src/pages/WikiPage.tsx` | geändert | editing-State, useEffect für Seitenwechsel-Reset, Props an Inline-WikiPageForm |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | navigateMock, react-router-dom mock, setEditable im MockEditor, T-EN1–T-EN6 |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | editable-Mock in RichTextInlineField, "Veröffentlichen"→"Speichern" korrigiert, T-RM1–T-RM6 |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | WikiPageForm-Mock erweitert, useHasPermission-Mock ergänzt, T-WP1–T-WP5 |

## Testergebnisse

`npm run test -w apps/web`: **583 grün, 33 rot**

**Meine neuen Tests (alle grün):**
- T-EN1–T-EN6 in `rich-text-inline-field.test.tsx`
- T-RM1–T-RM6 in `WikiPageForm.test.tsx`
- T-WP1–T-WP5 in `WikiPage.test.tsx`

**Pre-existing Failures (33 Tests, kein Zusammenhang mit diesem Auftrag):**
- T-14b in `rich-text-inline-field.test.tsx`: MockEditor fehlt `state.schema` → `toggleSelectionHighlight` crasht. Test-Erwartungen passen nicht zur aktuellen Implementierung.
- "zeigt im Edit-Kopfbereich ID kopieren" in `WikiPageForm.test.tsx`: Button-Text "ID 5 kopieren" existiert nicht in `WikiPageForm.tsx`.
- 31 weitere Failures in Board-/Form-Komponenten (FormSidebar, ListBoardView, BacklogListBoardView, FeatureListBoardView usw.) — vollständig außerhalb des Änderungsumfangs.

## Probleme und Abweichungen

`useHasPermission` in `WikiPage.tsx` benötigte einen fehlenden Mock in `WikiPage.test.tsx` — die bestehenden 4 Tests waren ebenfalls ohne diesen Mock nicht lauffähig. Mock wurde als §4.4-Nachführung ergänzt.

"Veröffentlichen" in zwei bestehenden WikiPageForm-Tests war ein staler Schaltflächen-Text; die Quelle enthält "Speichern". Wurde als §4.4-Nachführung korrigiert.

## Offene Punkte / Folgeaufgaben

T-14b: MockEditor-Infrastruktur (`state.schema`, `state.doc`, `state.tr`) fehlt für `toggleSelectionHighlight`-Tests. Separater Fix nötig.

"ID 5 kopieren"-Button: Feature war nie implementiert. Test muss entfernt oder nachimplementiert werden — separater Auftrag.

E2E-Playwright-Tests für Wiki-Lesemodus wurden geplant aber nicht implementiert (kein `tests/browser/web/wiki-lesemodus.spec.ts`). Blocker: kein laufendes E2E-Setup geprüft. Als Folgeauftrag dokumentiert.
