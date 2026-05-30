# Codex-Auftrag: Wiki-Projektbezug auf Project.wikiPageId umstellen

**Parent:** PROJ-3 — Projekt Manager
**Datum:** 2026-05-25
**Aufgaben-ID:** 61

---

## Ziel

Das Feld `WikiPage.projectId` wird entfernt. Stattdessen erhält die `projects`-Tabelle ein
optionales Feld `wikiPageId`, das auf die Startseite der Projektdokumentation zeigt.
Die Beziehung „Projekt → Wiki" ist damit eindeutig (1:0..1) und liegt beim Projekt,
dem sie semantisch gehört.

## Hintergrund & Kontext

Aktuell kann jede beliebige WikiPage (auch tief verschachtelte Unterseiten) eine `projectId`
tragen. Das Feld wird ausschließlich im Journal als `"owner"`-Kontext verwendet — kein Code
nutzt es für Navigation oder Strukturierung. Da mehrere Seiten dieselbe `projectId` tragen
können, ist unklar, welche davon die Startseite ist.

Die saubere Lösung: Das Projekt zeigt auf seine Wiki-Startseite, nicht umgekehrt.
Unterseiten werden ausschließlich über `WikiPage.parentId` navigiert.

## Aufgabe

1. **Schema anpassen** (`apps/api/src/db/schema.ts`):
   - In `wikiPages`: Feld `projectId` (`project_id`) entfernen
   - In `projects`: optionales Feld `wikiPageId` (`wiki_page_id`) hinzufügen
     ```ts
     wikiPageId: integer("wiki_page_id").references(() => wikiPages.id, { onDelete: "set null" })
     ```

2. **Migration erstellen** (Drizzle):
   - `ALTER TABLE wiki_pages DROP COLUMN project_id`
   - `ALTER TABLE projects ADD COLUMN wiki_page_id INTEGER REFERENCES wiki_pages(id) ON DELETE SET NULL`
   - Datenmigration: Falls in `wiki_pages.project_id` Werte existieren, den ersten Treffer
     pro Projekt in `projects.wiki_page_id` übertragen (nur falls `parentId IS NULL`,
     also Root-Seiten bevorzugen)

3. **Repository anpassen** (`apps/api/src/repositories/wiki-page.repository.ts`):
   - `WikiPageUpdateData`: `projectId` aus dem Typ entfernen

4. **Service anpassen** (`apps/api/src/services/wiki.service.ts`):
   - `WikiPageCreateInput` / `WikiPageUpdateInput`: `projectId` entfernen
   - `ensureProjectExists()`-Aufruf entfernen
   - `getProjectJournalObject()`-Aufruf in `wikiContexts()` entfernen — der `"owner"`-Kontext
     entfällt für WikiPages ersatzlos
   - Journal-Änderungsfeld `projectId` aus `relationFields` in `updateWikiPage()` entfernen

5. **Wiki-Route anpassen** (`apps/api/src/routes/wiki.ts`):
   - `projectId` aus Create- und Update-Schemas entfernen

6. **Projekt-Service erweitern** (Datei ermitteln, vermutlich `apps/api/src/services/project.service.ts`):
   - `ProjectUpdateInput`: optionales Feld `wikiPageId?: number | null` hinzufügen
   - Bei Update: prüfen, ob die referenzierte WikiPage existiert (analog zu `ensureProjectExists`)
   - Journal-Eintrag beim Setzen/Ändern von `wikiPageId` erzeugen:
     Feld `"wikiPageId"`, Label `"Wiki-Startseite"`, Format: Seitentitel

7. **Projekt-Route anpassen**:
   - `wikiPageId` in den Update-Request-Schemas ergänzen

## Technische Leitplanken

- Kein Breaking Change an bestehenden API-Endpoints für WikiPages — `projectId` im Request
  wird künftig einfach ignoriert (oder mit 400 abgewiesen, je nach Präferenz).
- `onDelete: "set null"` auf beiden Seiten: Löschen einer WikiPage setzt `projects.wikiPageId`
  auf NULL; Löschen eines Projekts setzt `wiki_pages.project_id` (entfällt sowieso).
- Drizzle-Schema ist die einzige Quelle der Wahrheit — keine Raw-SQL-Abfragen ohne Schema-Gegenstück.
- Bestehende Tests dürfen nicht brechen; `projectId`-Fixtures in Testdaten entfernen.

## Regeln & Randfälle

- `projects.wikiPageId` ist optional (NULL = kein Wiki verknüpft).
- Es darf nur eine Root-WikiPage (ohne eigene `parentId`) als Startseite gesetzt werden —
  oder Codex lässt jede Seite zu (einfacher, fachlich unkritisch). Empfehlung: keine
  Einschränkung, um Flexibilität zu erhalten.
- Beim Löschen einer WikiPage, die als `projects.wikiPageId` referenziert ist, greift
  `ON DELETE SET NULL` automatisch.
- Zirkuläre Referenz ausschließen: WikiPage kann nicht auf sich selbst als Parent zeigen
  (bereits bestehende Regel, keine Änderung nötig).

## Seiteneffekte

- **Journal**: WikiPage-Änderungen enthalten keinen Projekt-Kontext mehr. Projekt-Updates
  mit `wikiPageId` erscheinen neu im Projekt-Journal.
- **API-Clients / Frontend**: Alle Stellen, die `WikiPage.projectId` lesen oder schreiben,
  müssen auf `Project.wikiPageId` umgestellt werden. (Out-of-scope für diesen Auftrag,
  aber Codex soll darauf hinweisen, falls solche Stellen im Frontend gefunden werden.)
- **wiki-import.service.ts**: Prüfen, ob `projectId` beim Import gesetzt wird — falls ja,
  entsprechend anpassen.

## Testanforderungen

- **Unit-Test** `wiki.service.test.ts`:
  - `projectId` aus allen Fixtures entfernen
  - Test „create wiki page with projectId" entfernen oder auf Fehlerfall umschreiben

- **Unit-Test** `project.service.test.ts`:
  - Neuer Test: Projekt mit `wikiPageId` aktualisieren → Feld wird korrekt gespeichert
  - Neuer Test: Nicht-existente `wikiPageId` → 404
  - Neuer Test: WikiPage löschen → `projects.wikiPageId` wird zu NULL

- **Integration-Test**:
  - End-to-End: Projekt anlegen → WikiPage anlegen → Projekt mit `wikiPageId` updaten →
    WikiPage löschen → Projekt.wikiPageId ist NULL

## Abnahmekriterien

- `GET /projects/:id` gibt `wikiPageId` zurück (null oder integer).
- `PATCH /projects/:id` mit `{ wikiPageId: <id> }` setzt die Startseite.
- `GET /wiki-pages/:id` gibt **kein** `projectId`-Feld mehr zurück.
- Nach dem Löschen einer als Startseite verlinkten WikiPage ist `projects.wikiPageId` NULL.
- Alle bestehenden Tests grün.
- Migration läuft durch ohne Datenverlust bei vorhandenen Daten.
