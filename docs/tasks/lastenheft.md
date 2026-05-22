# Lastenheft — Projekt Manager

> Übersichtsseite · Stand: Mai 2026  
> Strukturiert nach Feature-Blöcken. Jeder Block wird in einem eigenen Dokument ausgearbeitet.

---

## Feature-Gliederung

| Nr. | Feature-Block | Kernthema |
|-----|---------------|-----------|
| FT 01 | Authentifizierung & Benutzerverwaltung | Login, Rollen, Berechtigungen (RBAC) |
| FT 02 | Projekte | Kernobjekt, Lebenszyklus, Listenansicht |
| FT 03 | Meilensteine | Zeitliche Gliederung, Fortschritt |
| FT 04 | Aufgaben (Tasks) | Hierarchie, Subtasks, Zuweisung, Fälligkeit |
| FT 05 | Ticket-System | Issue-Tracking, Typen, Beziehungen, Resolution |
| FT 06 | Anforderungen & Planung | Features, Use Cases, Backlog |
| FT 07 | Wiki | Hierarchische Wissensbasis, Import |
| FT 08 | Kalender & Ereignisse | Kalenderansicht, Verknüpfung mit Fachobjekten |
| FT 09 | Dashboard | Konfigurierbare Widgets, Kontext, Builder |
| FT 10 | Journal & Auditlog | Änderungsprotokoll aller Fachobjekte |
| FT 11 | Querschnittsobjekte | Kommentare, Notizen, Anhänge, Tags |
| FT 12 | Globale Suche | Volltext, projektübergreifend, Standalone-Modus |
| FT 13 | KI-Assistent | Text-Assist, Agent-Modus, lokales Modell (Ollama) |
| FT 14 | Einstellungen & Konfiguration | Präferenzen, Kataloge, Rollen, Berechtigungen |
| FT 15 | Datensicherung & Import | Dump, SFTP-Backup, Wiederherstellung |

---

## Kurzbeschreibungen

**FT 01 — Authentifizierung & Benutzerverwaltung**  
Session-basierter Login, Passwort-Setup-Flow für neue Nutzer. Rollenbasiertes Berechtigungsmodell (RBAC) mit granularen Resource/Action-Paaren. Admin-Bereich für Nutzer- und Rollenpflege.

**FT 02 — Projekte**  
Kernobjekt der Anwendung. Projekte besitzen Status, Farbe, Start- und Fälligkeitsdatum sowie eine konfigurierbare Board- und Listenansicht. Alle weiteren Fachobjekte sind direkt oder indirekt einem Projekt zugeordnet.

**FT 03 — Meilensteine**  
Zeitliche und inhaltliche Gliederung innerhalb eines Projekts. Meilensteine bündeln Aufgaben, Tickets und Features und zeigen deren Fortschritt aggregiert an.

**FT 04 — Aufgaben (Tasks)**  
Hierarchische Aufgaben mit beliebig tiefer Unteraufgaben-Struktur (Subtasks). Felder: Status, Priorität, Zuweisung, Fälligkeitsdatum. Aufgaben sind mit Projekten, Meilensteinen, Features und Use Cases verknüpfbar.

**FT 05 — Ticket-System**  
Issue-Tracking mit konfigurierbaren Typen (Bug, Feature-Request u. a.), Priorität, Zuständigkeit und Resolution. Tickets unterstützen Eltern-Kind-Hierarchien und Beziehungstypen (blocks, related, duplicate). Verknüpfbar mit allen Fachobjekten.

**FT 06 — Anforderungen & Planung**  
Allgemeiner Planungsbereich, domänenunabhängig nutzbar. Features beschreiben fachliche Anforderungsgruppen mit typisierten Relationen (related, depends_on, consumed_by). Use Cases spezifizieren das gewünschte Verhalten auf feingranularer Ebene. Backlog-Items übersetzen Anforderungen in priorisierbare Arbeitseinheiten mit optionalem Feature- und Use-Case-Bezug.

**FT 07 — Wiki**  
Hierarchische Wissensbasis mit Baumstruktur (Eltern-Kind-Seiten) und optionaler Projektzuordnung. Inhalte werden als strukturierter Markdown-Text gespeichert. Import aus externen Quellen wird unterstützt.

**FT 08 — Kalender & Ereignisse**  
Kalenderansicht für Ereignisse (Ganztags oder Zeitraum). Ereignisse sind mit Projekten, Meilensteinen und Aufgaben verknüpfbar. Vorschau bevorstehender Termine direkt im Kontext.

**FT 09 — Dashboard**  
Konfigurierbare Widget-Dashboards auf vier Kontext-Ebenen: global, Projekt, Meilenstein, Aufgabe. Widget-Bibliothek mit Statusübersichten, Journalansichten, Fortschrittsanzeigen und Fälligkeitswarnungen. Dashboard-Builder und benutzerspezifische Defaults.

**FT 10 — Journal & Auditlog**  
Vollständiges Änderungsprotokoll aller Fachobjekte: Operationen (create, update, delete, link, unlink) mit Feldänderungen, Akteur und Kontextobjekten. Basis für Transparenz, Nachvollziehbarkeit und spätere Benachrichtigungslogik.

**FT 11 — Querschnittsobjekte**  
Kommentare, Notizen (Rich-Text), Anhänge (Upload mit Vorschau) und Tags als Support-Objekte. Alle vier können an beliebige Fachobjekte gebunden werden — ohne polymorphe Felder, über dedizierte Junction-Tabellen.

**FT 12 — Globale Suche**  
Projektübergreifende Volltextsuche über alle Fachobjekte. Unterstützt einen Standalone-Modus, in dem die Suche als eigenständiges Fenster ohne Hauptnavigation geöffnet werden kann (z. B. für externe Launcher).

**FT 13 — KI-Assistent**  
Lokales KI-Modell über Ollama (kein externer Cloud-Dienst erforderlich). Text-Assist für einzelne Felder (umformulieren, zusammenfassen, erweitern, übersetzen). Agent-Modus: Erstellen und Verknüpfen mehrerer Objekte aus einer natürlichsprachlichen Eingabe, mit Planungsschritt vor der Ausführung.

**FT 14 — Einstellungen & Konfiguration**  
Benutzerpräferenzen (nutzerspezifisch). Admin-Kataloge für konfigurierbare Wertebereiche: Statuswerte, Tickettypen, Prioritäten — jeweils mit Farbe und Sortierung. Rollendefinition mit granularen Berechtigungen (Resource × Action).

**FT 15 — Datensicherung & Import**  
Manueller Datenbank-Dump als ZIP-Archiv. Automatisches SFTP-Backup auf einen konfigurierten Remote-Server. Wiederherstellung aus einem bestehenden Backup. Import von Inhalten aus externen Quellen (z. B. Wiki-Seiten).
