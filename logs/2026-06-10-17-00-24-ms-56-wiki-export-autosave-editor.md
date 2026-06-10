# Log: MS-56 – Wiki-Export, Autosave-Navigation, Editor/Input

**Datum:** 10.06.26  
**Uhrzeit:** 17:00:24  
**Schritt:** Fix/Feature — offene MS-56-Items (AP1–AP3)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

### AP1 – Wiki-Export (`apps/api/src/services/wiki.service.ts`)
- **TKT-96** (Umlaute): `toSlug` transliteriert nicht mehr und ersetzt keine Leerzeichen — Umlaute und Leerzeichen bleiben in Datei-/Verzeichnisnamen erhalten, nur dateisystem-unzulässige Zeichen (`< > : " / \ | ? *`) werden ersetzt. Duplikat-Erkennung jetzt case-insensitiv. Erzeugte URLs werden pro Pfadsegment prozentkodiert.
- **TKT-97** (Seitenlinks): In `resolveWikiLinks` einen Off-by-one in der relativen Pfadtiefe behoben (`prefix` für oberste Ebene war leer statt `../`). Der bisherige Test prüfte nur den String, nicht die reale Auflösung — daher unbemerkt.
- **TKT-100** (interne Bilder): neue `resolveContentImages` — intern (DB) referenzierte Bilder (`/api/content/images/<uuid>`) werden nach `assets/images/` kopiert, `src` auf relative Pfade umgeschrieben, über Seiten dedupliziert; ungenutzte DB-Bilder werden nicht exportiert.

### AP2 – TKT-95 Autosave bei Navigation (Dirty-Guard entfernt)
- Die Dirty-Guard-/„Verwerfen?"-Logik ist mit Auto-Save obsolet und wurde entfernt: `WikiPage`, `WikiPageForm`, `rich-text-inline-field` (Leave-Guard, `onDirtyChange`/`onRegisterLeaveGuard`, Confirm-Dialoge). Navigation flusht offene Änderungen still über Auto-Save; der Wiki-Tree navigiert nativ.
- `NoteEditor`: Edit-Mode flusht beim Schließen statt einen Verwerfen-Dialog zu zeigen; Create-Mode (ohne Auto-Save) behält die Absicherung.

### AP3 – Editor & Formulare
- **TASK-241**: Copy-to-Clipboard-Button in der Editor-Toolbar (kopiert den HTML-Inhalt, kurzes „Kopiert"-Feedback, leerer Editor ohne Fehler).
- **TASK-324**: `Input.tsx` setzt zentral `autoComplete="off"` plus `data-1p-ignore`/`data-lpignore`. Felder mit semantischem `autoComplete` (Login, `new-password`, `username`, …) überschreiben das und bleiben für Passwortmanager/Autofill nutzbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/wiki.service.ts` | geändert | Slug-Regel, Link-Prefix-Fix, URL-Encoding, Bild-Export |
| `tests/integration/api/wiki.test.ts` | geändert | TKT-97-Test verschärft; TKT-96 + TKT-100 ergänzt |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | `onBeforeNavigate` ohne Boolean-Gating; Copy-Button |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Dirty-Guard entfernt, `flushPendingSave` |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Leave-Guard/inlineDirty entfernt, native Tree-Navigation |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Edit-Mode flusht beim Schließen |
| `apps/web/src/components/ui/Input.tsx` | geändert | autoComplete-Default + Passwortmanager-Ignore |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | an direkte Navigation angepasst |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Fallback-Dialog-Test auf neues Verhalten umgestellt |
| `tests/unit/web/components/notes/NoteEditor.test.tsx` | geändert | Close-Flush-Tests ergänzt |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Clipboard-Tests T-CB1/T-CB2 |
| `tests/unit/web/components/ui/Input.test.tsx` | neu | Passwortmanager-Unterdrückung abgesichert |

## Testleitplanken / Testebenen
- Gates angewendet: `planungsleitplanken`, `code-discipline`, `test-entwurfsleitplanken`.
- Integration (API, keine Mocks, Temp-Root + Temp-DB): Wiki-Export — Umlaute byte-genau, Link löst real auf, Bild kopiert + `src` relativ, ungenutztes Bild ausgelassen.
- Unit (jsdom): Navigation ohne Verwerfen-Dialog (WikiPage/WikiPageForm/NoteEditor), Clipboard-Copy, Input-Attribute (positiv + Negativfall semantisches Feld).
- Ergebnisse: `npm run test -w apps/api -- wiki` → 26/26 grün; betroffene Web-Unit-Tests grün; API- und Web-Typecheck sauber.

## Probleme und Abweichungen
- Vorbestehende Web-Unit-Testfehler (~30, u. a. Board/Dashboard/Forms + 2 Legacy-Markdown-Tests in NoteEditor) stammen aus den uncommitteten Branch-Änderungen (Richtext-Normalisierung/Layout), **nicht** aus dieser Arbeit — per Stash-Gegenprobe verifiziert.

## Offene Punkte / Folgeaufgaben
- E2E-Tasks der MS-56-Testreihe (TASK-299 E2E-Server-Blocker, TASK-309/310/311) bleiben offen — abhängig vom ungelösten E2E-Server-Blocker (war nicht im Auftragsumfang).
