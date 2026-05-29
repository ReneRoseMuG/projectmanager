# Codex-Auftrag: WikiPageDetail entfernen

**Parent:** MILE-25 — Redesign Wiki
**Datum:** 2026-05-29
**Aufgaben-ID:** TASK-142

---

## Ziel

`WikiPageDetail.tsx` und der zugehörige Test werden aus der Codebase entfernt. Alle Import-Referenzen werden bereinigt. Diese Aufgabe darf erst nach Abschluss von TASK-141 ausgeführt werden.

## Hintergrund & Kontext

Nach TASK-141 übernimmt `WikiPageForm` (Inline-Modus) die Darstellung einer ausgewählten Wiki-Seite. `WikiPageDetail` wird dadurch vollständig redundant.

## Aufgabe

### 1. Dateien löschen

```
apps/web/src/components/wiki/WikiPageDetail.tsx
tests/unit/web/components/wiki/WikiPageDetail.test.tsx
```

### 2. Imports bereinigen

Alle `import`-Statements die `WikiPageDetail` referenzieren entfernen. Primär betroffen: `apps/web/src/pages/WikiPage.tsx` (wird bereits in TASK-141 bereinigt).

Grep-Befehl zur Kontrolle:
```bash
grep -r "WikiPageDetail" apps/ tests/ --include="*.tsx" --include="*.ts"
```
Ergebnis muss leer sein.

### 3. Re-Export prüfen

Falls `WikiPageDetail` in einem Index-File (`index.ts` o.ä.) re-exportiert wird, diesen Eintrag ebenfalls entfernen.

## Technische Leitplanken

- Diese Aufgabe nur ausführen wenn TASK-141 abgeschlossen ist und alle Tests grün sind
- Keine inhaltliche Migration — die Logik lebt bereits in `WikiPageForm`
- TypeScript-Kompilierung muss nach dem Löschen fehlerfrei sein

## Testanforderungen

- `tsc --noEmit` muss fehlerfrei durchlaufen
- Alle verbleibenden Wiki-Tests müssen grün sein

## Abnahmekriterien

- `WikiPageDetail.tsx` existiert nicht mehr in der Codebase
- `WikiPageDetail.test.tsx` existiert nicht mehr
- `grep -r "WikiPageDetail"` liefert keine Treffer
- TypeScript-Kompilierung fehlerfrei
- Alle Tests grün
