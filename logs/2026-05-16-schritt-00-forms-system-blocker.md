# Log: Forms/System-Blocker

**Datum:** 16.05.26  
**Schritt:** 0 — Voraussetzungen Forms/System  
**Status:** 🔴 Blockiert

## Was wurde umgesetzt

Der Auftrag `Auftrag-Codex-Studie-2-Forms-und-System.md` wurde vollständig gelesen und als Klasse-5-Großauftrag eingeordnet. Die ZIP `Project Manager.zip` wurde in einen temporären Ordner extrahiert, damit `Designstudie-2/Forms.html`, `Designstudie-2/System.html` und `Designstudie-2/assets/styles.css` als Referenz verfügbar sind. Anschließend wurden die harten Voraussetzungen aus dem Auftrag gegen die aktuelle Codebasis geprüft. Dabei wurde festgestellt, dass mehrere vorausgesetzte UI-Patterns und Datenflächen noch nicht existieren. Deshalb wurde die Umsetzung vor Schritt 1 kontrolliert gestoppt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-16-schritt-00-forms-system-blocker.md` | neu | Blocker-Log für den Forms/System-Auftrag |
| `logs/README.md` | geändert | Blocker im Log-Index ergänzt |

## Probleme und Abweichungen

Die Mockups sind jetzt verfügbar, aber nur temporär unter `%TEMP%\project-manager-designstudie-2`; sie wurden nicht ins Repo übernommen.

Folgende Voraussetzungen aus dem Auftrag fehlen oder passen nicht zur aktuellen Codebasis:

- Der vorausgesetzte Studie-2-Task-Detail-Auftrag ist nicht umgesetzt: `TaskDetail.tsx` nutzt weiterhin den alten Modal-Aufbau mit Tabs und nativen `Select`-Feldern für Status/Priorität.
- Ein eigenständiges `iconbtn`-Pattern beziehungsweise eine `IconButton`-Komponente existiert nicht; es gibt nur `Button` mit Icon-only-Verhalten.
- Wiederverwendbare Segmented-Controls aus dem Task-Detail-Auftrag existieren nicht; Feature/UseCase nutzen aktuell lokale Inline-Buttons.
- `ProjectForm` hat keine bestehenden States oder API-Felder für Kürzel/Slug, Startdatum oder Fälligkeitsdatum; `ProjectInput` enthält nur `name`, `description`, `status` und `color`.
- `TaskForm` hat keine Props oder Datenbasis für `projectName`, Feature-Auswahl des aktuellen Projekts oder Vollansicht-Öffnen aus dem Formular heraus.
- `NoteEditor` arbeitet heute mit `contentJson` und `RichTextEditor`; der Auftrag verlangt einen MarkdownEditor, Markdown-Export und Verknüpfungs-/Tag-Metadaten, die dort nicht vorhanden sind.
- Ein `WikiEditor.tsx` existiert nicht; die aktuelle Wiki-Bearbeitung läuft über `WikiPageForm.tsx` und besitzt keine Kategorie-, `inNav`-, `internal`- oder Versionen-Daten.
- Ein Tag-Usage-Hook für Projekt-/Task-/Notiz-Verwendungszahlen ist nicht vorhanden.

Diese Punkte können nicht rein optisch umgesetzt werden, ohne Daten- oder Komponentenverträge zu erweitern. Das wäre eine Scope-Ausweitung entgegen dem Auftrag.

## Offene Punkte / Folgeaufgaben

Vor dem Forms/System-Auftrag muss entweder der fehlende Studie-2-Task-Detail-Auftrag aus der ZIP umgesetzt werden oder der Forms/System-Auftrag muss fachlich in einen vorbereitenden Prerequisite-Auftrag und einen reduzierten UI-Auftrag geteilt werden.
