# Codex-Auftrag: HTML-Content in Datenbank migrieren (inkl. Image-Support)

**Datum:** 2026-05-27
**Status:** Bereit zur Implementierung

---

## Ziel

Feature- und UseCase-Inhalte werden aktuell als `.md`-Dateien im Dateisystem gespeichert
(`apps/api/content/features/`, `apps/api/content/usecases/`, `apps/api/content/wiki/`).
Ziel ist es, diese Inhalte vollständig in die SQLite-Datenbank zu verlagern — inklusive
der Möglichkeit, Bilder direkt im Tiptap-Editor einzufügen. Bilder werden als BLOB in
einer eigenen Tabelle gespeichert und über einen API-Endpunkt ausgeliefert.

File-Attachments (PDFs, Bilder die an Aufgaben oder Tickets hängen) sind **nicht**
Teil dieses Auftrags und verbleiben als Dateien im Filesystem.

---

## Ist-Zustand

### Schema
`features` und `use_cases` und `wiki_pages` haben je eine Spalte `content_path TEXT`,
die auf eine Datei im Verzeichnis `apps/api/content/` zeigt.

### Content-Zugriff
Alle Lese- und Schreiboperationen laufen über `apps/api/src/services/content.service.ts`.
Die Funktionen `readContent()` und `writeContent()` lesen bzw. schreiben `.md`-Dateien
über das Node.js `fs`-Modul.

### Editor
Der Frontend-Editor (`apps/web/src/components/ui/rich-text-inline-field.tsx`) ist Tiptap
und unterstützt bereits einen optionalen `onImageUpload`-Handler. Dieser wird beim
Einfügen eines Bilds (Toolbar oder Paste) aufgerufen, erwartet einen `File`-Parameter
und gibt eine URL als `Promise<string>` zurück. Aktuell ist der Handler in den
Feature/UseCase/Wiki-Formularen noch nicht verdrahtet.

---

## Soll-Zustand

### Datenhaltung
- `content`-Spalte (`TEXT`) in `features`, `use_cases` und `wiki_pages` — enthält
  den vollständigen HTML-String des Tiptap-Editors
- Neue Tabelle `content_images` für im Editor eingebettete Bilder (BLOB)
- Spalte `content_path` bleibt während der Migration erhalten und wird danach entfernt

### Image-Flow (Editor → Datenbank)
1. User fügt Bild über Toolbar oder Paste in den Editor ein
2. Frontend ruft `POST /api/content/images` auf (multipart/form-data)
3. Backend speichert BLOB in `content_images`, gibt `{ url: '/api/content/images/:id' }` zurück
4. Tiptap setzt `<img src="/api/content/images/:id">` in den HTML-String
5. User klickt Speichern → HTML-String (inkl. img-Tag) landet in der `content`-Spalte
6. Browser lädt Bild via `GET /api/content/images/:id` → Backend liest BLOB aus DB

---

## Implementierungsschritte

### Schritt 1 — Drizzle-Migration (Schema)

Neue Migration erstellen:

```sql
-- features
ALTER TABLE features ADD COLUMN content TEXT;

-- use_cases
ALTER TABLE use_cases ADD COLUMN content TEXT;

-- wiki_pages (falls content_path dort ebenfalls vorhanden)
ALTER TABLE wiki_pages ADD COLUMN content TEXT;

-- Neue Tabelle für eingebettete Bilder
CREATE TABLE content_images (
  id       TEXT PRIMARY KEY,        -- UUID
  mime_type TEXT NOT NULL,
  data     BLOB NOT NULL,
  size     INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

In `apps/api/src/db/schema.ts` entsprechend ergänzen:
- `content: text("content")` zu `features`, `useCases`, `wikiPages`
- Neue `contentImages`-Tabelle exportieren

### Schritt 2 — Datenmigrations-Script

Datei: `apps/api/scripts/migrate-content-to-db.mjs`

Das Script läuft einmalig und ist idempotent (bereits migrierte Zeilen werden
übersprungen):

```
Für jede Tabelle (features, use_cases, wiki_pages):
  - Alle Einträge laden wo content IS NULL AND content_path IS NOT NULL
  - Datei über resolveStoredContentPath() einlesen
  - HTML-Inhalt in content-Spalte schreiben
  - Fortschritt loggen
```

Aufruf: `node apps/api/scripts/migrate-content-to-db.mjs`

### Schritt 3 — content.service.ts umbauen

`apps/api/src/services/content.service.ts` erhält neue DB-basierte Funktionen:

```ts
readContentFromDb(id: number, table: ContentSubdir): string
writeContentToDb(id: number, table: ContentSubdir, html: string): void
```

Die filesystem-basierten Funktionen (`readContent`, `writeContent`, `deleteContent`,
`renameContent`) bleiben vorerst erhalten — sie werden nach erfolgreichem
Abschluss der Migration in einem Folge-Auftrag entfernt.

### Schritt 4 — Repositories anpassen

Folgende Repositories lesen/schreiben `content_path` und müssen auf die neue
`content`-Spalte umgestellt werden:

- `apps/api/src/repositories/feature.repository.ts`
- `apps/api/src/repositories/use-case.repository.ts`
- `apps/api/src/repositories/wiki-page.repository.ts`

Beim Lesen: wenn `content` befüllt ist → aus Spalte lesen. Wenn nicht (Altdaten
vor Migration) → Fallback auf `content_path` + Datei lesen.
Beim Schreiben: immer in `content`-Spalte schreiben.

### Schritt 5 — Image-API

Neue Route: `apps/api/src/routes/content-images.ts`

```
POST /api/content/images
  - Akzeptiert: multipart/form-data mit einem Bild-File
  - Validierung: nur image/* MIME-Types erlaubt, max. 10 MB
  - Speichert BLOB in content_images
  - Gibt zurück: { url: '/api/content/images/:id' }

GET /api/content/images/:id
  - Liest BLOB aus content_images
  - Setzt Content-Type aus mime_type-Spalte
  - Gibt Binary zurück
  - 404 wenn id nicht gefunden
```

Route in `apps/api/src/app.ts` registrieren.

### Schritt 6 — Frontend verdrahten

In folgenden Komponenten den `onImageUpload`-Handler an `RichTextInlineField`
übergeben:

- `apps/web/src/components/features/FeatureDetail.tsx` (Felder: `content`)
- `apps/web/src/components/features/FeatureForm.tsx` (Felder: `content`)
- `apps/web/src/components/usecases/UseCaseForm.tsx` (Felder: `content`)
- `apps/web/src/components/wiki/WikiPageDetail.tsx` (Felder: `content`)
- `apps/web/src/components/wiki/WikiPageForm.tsx` (Felder: `content`)

Der Handler ruft `POST /api/content/images` auf und gibt die zurückgegebene
URL weiter. Eine API-Hilfsfunktion `uploadContentImage(file: File): Promise<string>`
wird in `apps/web/src/api/` angelegt.

---

## Nicht in diesem Auftrag

- Entfernen der `content_path`-Spalte und der Filesystem-Funktionen → Folgeauftrag
  nach Verifikation der Migration
- Backup-System für die Datenbank → separater Auftrag
- File-Attachments an Tasks/Tickets → bleiben als Dateien, nicht betroffen

---

## Tests

- Unit-Test für das Migrations-Script: prüft dass `content` korrekt befüllt wird
  und idempotent läuft
- Integration-Test für `POST /api/content/images` und `GET /api/content/images/:id`
- Bestehende Feature- und UseCase-Tests müssen weiterhin grün bleiben

---

## Betroffene Dateien (Zusammenfassung)

```
apps/api/src/db/schema.ts
apps/api/src/db/migrations/          ← neue Migration
apps/api/src/services/content.service.ts
apps/api/src/repositories/feature.repository.ts
apps/api/src/repositories/use-case.repository.ts
apps/api/src/repositories/wiki-page.repository.ts
apps/api/src/routes/content-images.ts  ← neu
apps/api/src/app.ts
apps/api/scripts/migrate-content-to-db.mjs  ← neu
apps/web/src/api/content-images.ts     ← neu
apps/web/src/components/features/FeatureDetail.tsx
apps/web/src/components/features/FeatureForm.tsx
apps/web/src/components/usecases/UseCaseForm.tsx
apps/web/src/components/wiki/WikiPageDetail.tsx
apps/web/src/components/wiki/WikiPageForm.tsx
```
