# Konzept: Dashboards & Widgets

## Ausgangslage

Der Projekt Manager besitzt für alle Domain-Objekte bereits interaktive Views:
`OwnerTaskBoard`, `OwnerTicketBoard`, `MilestoneListBoardView`, `JournalPanel` usw.
Diese sind für **Bearbeitung** optimiert (CRUD, Drag & Drop, Filter). Sie beantworten
aber nicht die primäre Frage eines Anwenders beim täglichen Öffnen:

> **„Wie steht's? Was ist neu? Was hängt nach?"**

Genau diese Lücke füllen Dashboards.

---

## Architekturentscheidung: Widget-Komposition

Kleine, **read-only Widgets** werden zu Dashboards kombiniert. Jedes Widget hat
genau einen Zweck und eine eigene, schlanke Datenbasis. Widgets sind rein lesend
(kein CRUD-Rauschen) und über einen **Scope-Parameter** in beliebigen Kontexten
wiederverwendbar.

---

## Scope-Konzept

Jedes Widget akzeptiert einen optionalen `owner`-Parameter:

```
owner = undefined                        → Global (alle Objekte des Nutzers)
owner = { type: "project",   id: N }     → Projektbezogen
owner = { type: "milestone", id: N }     → Meilensteinbezogen
owner = { type: "task",      id: N }     → Aufgabenbezogen (Subtask-Kontext)
```

Kein Widget kennt seinen Kontext — er wird von außen hineingegeben.
Das macht Widgets maximal wiederverwendbar und unabhängig testbar.

---

## Widget-Katalog

### 1. `TaskStatusReport`
**Zweck:** Aufgaben nach Status zählen.

**Scope:** Global / Projekt / Meilenstein / Aufgabe (Subtasks)

**Darstellung:**
- Liste: Status-Pill + Zahl (analog zu bestehendem `StatusPill`)
- Nur Status-Werte mit mindestens einem Eintrag werden angezeigt
- Klick auf eine Zeile → navigiert zur gefilterten Aufgabenliste

**Daten:** `GET /api/tasks/stats?ownerType=X&ownerId=Y`
Ohne Parameter → globale Aggregation.
Response: `{ statusCounts: { active: 3, done: 12, in_progress: 5, … } }`

---

### 2. `TicketStatusReport`
**Zweck:** Tickets nach Status zählen.

**Scope:** Global / Projekt / Meilenstein

**Darstellung:** Analog zu `TaskStatusReport`

**Daten:** `GET /api/tickets/stats?ownerType=X&ownerId=Y`
Response: `{ statusCounts: { open: 2, in_progress: 1, resolved: 8, … } }`

---

### 3. `TaskJournal`
**Zweck:** Die zuletzt erstellten/geänderten Aufgaben als Journal-Feed.

**Scope:** Global / Projekt / Meilenstein / Aufgabe (Subtasks)

**Darstellung pro Eintrag:**
- Titel (klickbar → TaskDetailPage)
- `StatusPill` + `PriorityBadge`
- Beschreibung (1–2 Zeilen, truncated)
- Fälligkeitsdatum (rot wenn überfällig)
- Primärer Tag
- Erstellt- oder Geändert-Datum

**Konfiguration:** `limit` (default: 10), `sort: createdAt | updatedAt`

**Daten:** Bestehender Tasks-Endpunkt mit `limit`-Parameter (ggf. Sort-Option ergänzen)

---

### 4. `TicketJournal`
**Zweck:** Die zuletzt erstellten/geänderten Tickets als Journal-Feed.

**Scope:** Global / Projekt / Meilenstein

**Darstellung pro Eintrag:**
- Titel + Ticket-Typ-Icon
- `StatusPill`
- Beschreibung (1–2 Zeilen)
- Erstellt- oder Geändert-Datum

**Daten:** Bestehender Tickets-Endpunkt mit `limit`-Parameter

---

### 5. `GlobalJournalWidget`
**Zweck:** Journal-Ereignisse über alle Objekttypen hinweg — das Aktivitäts-Log
der gesamten App bzw. eines einzelnen Projekts.

**Scope:** Global / Projekt

**Darstellung:** Identisch mit dem bestehenden `JournalPanel` (direkt wiederverwenden).

**Daten:** `GET /api/journal?limit=20` (global) oder mit `ownerType=project&ownerId=N`

---

### 6. `CommentJournal`
**Zweck:** Zuletzt gepostete Kommentare als kompakter Feed.

**Scope:** Global / Projekt / Meilenstein / Aufgabe

**Verhalten je Kontext:**

| Kontext | Zeigt |
|---|---|
| Global | Eigene Kommentare des angemeldeten Nutzers, quer über alle Objekte |
| Projekt | Alle Kommentare auf Objekte dieses Projekts |
| Meilenstein | Alle Kommentare auf Tasks und Tickets dieses Meilensteins |
| Aufgabe | Alle Kommentare direkt auf diese Aufgabe |

**Darstellung pro Eintrag:**
- Kommentartext (max. 2 Zeilen, truncated)
- Objekt-Typ-Icon + Objekt-Name (klickbar → Detailseite)
- Autor (entfällt im globalen Kontext)
- Zeitstempel (`MessageSquare`-Icon)

**Daten:** Neuer Endpunkt `GET /api/comments/recent`
```
Query: ownerType?, ownerId?, mine? (boolean), limit? (max: 50)
Response: id, body, createdAt, authorName, entityType, entityId, entityLabel
```

---

### 7. `AttachmentJournal`
**Zweck:** Zuletzt hochgeladene Dateien als kompakter Feed — kontextabhängig
eigene Uploads (global) oder alle Anhänge im jeweiligen Kontext.

**Scope:** Global / Projekt / Meilenstein / Aufgabe

**Verhalten je Kontext:**

| Kontext | Zeigt |
|---|---|
| Global | Eigene Uploads des angemeldeten Nutzers, quer über alle Objekte |
| Projekt | Alle Anhänge auf Objekte dieses Projekts (Tasks, Tickets, Meilensteine …) |
| Meilenstein | Alle Anhänge auf Tasks und Tickets dieses Meilensteins |
| Aufgabe | Alle Anhänge direkt auf diese Aufgabe |

**Darstellung pro Eintrag:**
- Datei-Typ-Icon (abhängig von `mimetype`: Bild, PDF, Tabelle, Text, generisch)
  + Dateiname (klickbar → Download / lokales Öffnen)
- Objekt-Typ-Icon + Objekt-Name (klickbar → Detailseite des Besitzers)
- Dateigröße (human-readable: KB / MB)
- Autor (entfällt im globalen Kontext)
- Upload-Datum (`Paperclip`-Icon)

**Konfiguration:** `limit` (default: 10)

**Daten:** Neuer Endpunkt `GET /api/attachments/recent`
```
Query: ownerType?, ownerId?, mine? (boolean), limit? (max: 50)
Response: id, filename, mimetype, fileSize, createdAt, authorName,
          entityType, entityId, entityLabel
```

Aggregiert über alle Attachment-Junction-Tabellen
(`task_attachments`, `project_attachments`, `ticket_attachments`,
`feature_attachments` usw.) und reichert jeden Eintrag mit `entityLabel` an.

---

### 8. `MilestoneProgressWidget` *(Phase 2)*
**Zweck:** Meilensteine eines Projekts mit Fortschrittsindikator.

**Scope:** Projekt

**Darstellung:**
- Name + Status
- Fortschrittsbalken: „X von Y Aufgaben erledigt"
- Fälligkeitsdatum (rot wenn überfällig)

**Daten:** Neue Felder `taskCount` / `completedTaskCount` im Milestone-Response

---

### 9. `OverdueTaskWidget` *(Phase 2)*
Überfällige Aufgaben, global oder innerhalb eines Owners.

---

## Scope-Matrix

| Widget | Global | Projekt | Meilenstein | Aufgabe |
|---|:---:|:---:|:---:|:---:|
| `TaskStatusReport` | ✓ | ✓ | ✓ | ✓ (Subtasks) |
| `TicketStatusReport` | ✓ | ✓ | ✓ | — |
| `TaskJournal` | ✓ | ✓ | ✓ | ✓ (Subtasks) |
| `TicketJournal` | ✓ | ✓ | ✓ | — |
| `GlobalJournalWidget` | ✓ | ✓ | — | — |
| `CommentJournal` | ✓ (eigen) | ✓ (alle) | ✓ (alle) | ✓ (alle) |
| `AttachmentJournal` | ✓ (eigen) | ✓ (alle) | ✓ (alle) | ✓ (alle) |
| `MilestoneProgressWidget` | — | ✓ | — | — |
| `OverdueTaskWidget` | ✓ | ✓ | — | — |

---

## Dashboard-Kompositionen

### A) Globales Dashboard — `/dashboard`

```
┌─────────────────────┬──────────────────────┐
│  TaskStatusReport   │  TicketStatusReport  │
├─────────────────────┴──────────────────────┤
│  GlobalJournalWidget (letzte 20)           │
├─────────────────────┬──────────────────────┤
│  TaskJournal        │  TicketJournal       │
├─────────────────────┼──────────────────────┤
│  CommentJournal     │  AttachmentJournal   │
│  (eigene)           │  (eigene)            │
└─────────────────────┴──────────────────────┘
```

---

### B) Projekt-Dashboard

```
┌─────────────────────┬──────────────────────┐
│  TaskStatusReport   │  TicketStatusReport  │
├─────────────────────┴──────────────────────┤
│  MilestoneProgressWidget                   │
├─────────────────────┬──────────────────────┤
│  TaskJournal        │  TicketJournal       │
├─────────────────────┼──────────────────────┤
│  CommentJournal     │  AttachmentJournal   │
├─────────────────────┴──────────────────────┤
│  GlobalJournalWidget                       │
└────────────────────────────────────────────┘
```

---

### C) Meilenstein-Dashboard

```
┌─────────────────────┬──────────────────────┐
│  TaskStatusReport   │  TicketStatusReport  │
├─────────────────────┼──────────────────────┤
│  TaskJournal        │  CommentJournal      │
├─────────────────────┼──────────────────────┤
│  AttachmentJournal  │                      │
└─────────────────────┴──────────────────────┘
```

---

### D) Aufgaben-Dashboard *(nur wenn `subtaskCount > 0`)*

```
┌────────────────────────────────────────────┐
│  TaskStatusReport (Subtasks)               │
├─────────────────────┬──────────────────────┤
│  TaskJournal        │  CommentJournal      │
├─────────────────────┼──────────────────────┤
│  AttachmentJournal  │                      │
└─────────────────────┴──────────────────────┘
```

---

## Technische Umsetzungsstrategie

### Backend — neue Endpunkte

```
GET /api/tasks/stats[?ownerType=X&ownerId=Y]
GET /api/tickets/stats[?ownerType=X&ownerId=Y]
GET /api/comments/recent[?ownerType=X&ownerId=Y&mine=true&limit=N]
GET /api/attachments/recent[?ownerType=X&ownerId=Y&mine=true&limit=N]
```

Alle vier aggregieren über ihre jeweiligen Junction-Tabellen und reichern
Ergebnisse mit `entityLabel` an. Bestehende Endpunkte:
- `GET /api/tasks`, `GET /api/tickets`: `limit` + `sort`-Parameter prüfen
- `GET /api/journal`: Globalmodus ohne Objektfilter prüfen

---

### Frontend — neue Hooks und Komponenten

**Neue Hooks:**
- `useTaskStats`, `useTicketStats`
- `useGlobalJournalEntries`
- `useRecentComments`
- `useRecentAttachments`

**Neue Komponenten in `components/dashboard/`:**

| Datei | Scope | Phase |
|---|---|---|
| `DashboardGrid.tsx` | Layout-Wrapper | MVP |
| `TaskStatusReport.tsx` | Global/Projekt/Meilenstein/Aufgabe | MVP |
| `TicketStatusReport.tsx` | Global/Projekt/Meilenstein | MVP |
| `TaskJournal.tsx` | Global/Projekt/Meilenstein/Aufgabe | MVP |
| `TicketJournal.tsx` | Global/Projekt/Meilenstein | MVP |
| `GlobalJournalWidget.tsx` | Global/Projekt | MVP |
| `CommentJournal.tsx` | Global/Projekt/Meilenstein/Aufgabe | MVP |
| `AttachmentJournal.tsx` | Global/Projekt/Meilenstein/Aufgabe | MVP |
| `ProjectDashboard.tsx` | Komposition | MVP |
| `MilestoneDashboard.tsx` | Komposition | MVP |
| `GlobalDashboard.tsx` | Komposition | MVP |
| `TaskDashboard.tsx` | Komposition | MVP |
| `MilestoneProgressWidget.tsx` | Projekt | Phase 2 |
| `OverdueTaskWidget.tsx` | Global/Projekt | Phase 2 |

---

## Umsetzungsreihenfolge für Codex

| # | Aufgabe | Abhängigkeit |
|---|---|---|
| 1 | Backend: `tasks/stats` + `tickets/stats` | — |
| 2 | Backend: Journal-Globalendpunkt prüfen | — |
| 3 | Backend: `comments/recent` | — |
| 4 | Backend: `attachments/recent` | — |
| 5 | Frontend: `useTaskStats`, `useTicketStats` | 1 |
| 6 | Frontend: `useGlobalJournalEntries` | 2 |
| 7 | Frontend: `useRecentComments` | 3 |
| 8 | Frontend: `useRecentAttachments` | 4 |
| 9 | Widgets: `TaskStatusReport`, `TicketStatusReport` | 5 |
| 10 | Widgets: `TaskJournal`, `TicketJournal` | bestehende API |
| 11 | Widget: `GlobalJournalWidget` | 6 |
| 12 | Widget: `CommentJournal` | 7 |
| 13 | Widget: `AttachmentJournal` | 8 |
| 14 | Kompositionen: alle vier Dashboards | 9–13 |
| 15 | Integration: Tab „Übersicht" in Forms | 14 |
| 16 | Seite: `DashboardPage` + Route + Navigation | 14 |
| 17 | `MilestoneProgressWidget` + Backend-Felder | Phase 2 |
| 18 | `OverdueTaskWidget` | Phase 2 |

**MVP = Schritte 1–16.** Schritte 1–4 und 10 sind ohne Voraussetzungen startbar.

---

## Abgrenzung: Dashboard-Widget vs. Vollansicht-Tab

| Kriterium | Dashboard-Widget | Vollansicht (Tab) |
|---|---|---|
| Zweck | Orientierung, Überblick | Bearbeiten, Verwalten |
| Interaktion | read-only (Klick → Navigation/Download) | CRUD, Filter, Kanban |
| Datenmenge | Zählungen / letzte N Einträge | Alle Einträge, vollständig |
| Performance | Sehr schnell (Aggregation) | Abhängig von Datenmenge |

Dashboard-Widgets **ersetzen keine** bestehenden Tabs — sie **ergänzen** sie.
