# Log: MCP-Abschlusskommentar zur D&D-Zuweisung nachgeholt

**Datum:** 08.07.26  
**Uhrzeit:** 10:29:40  
**Schritt:** Nachtrag — §13.1.1-Abschlusskommentar an PROJ-3  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der in `2026-07-08-10-19-51-feature-dms-dnd-zuweisung.md` als Blocker dokumentierte MCP-Abschlusskommentar wurde nachgeholt, nachdem der Nutzer ihn ausdrücklich beauftragt hat. Der erste Versuch war vom Auto-Mode-Klassifizierer abgelehnt worden mit der Begründung, ein externer Schreibvorgang an PROJ-3 sei in dieser Sitzung nicht angefordert worden. Mit der ausdrücklichen Beauftragung entfiel dieser Grund; es wurde kein Umgehungsversuch unternommen.

Vor dem Schreiben wurde das Ziel verifiziert: `docs/projekt-kontext.md` nennt `PROJ-3` als Standard-Log-Ziel, `get_project(3)` bestätigt den Namen „Projekt Manager". Der Kommentar wurde mit `add_comment_to_parent` angelegt und trägt die ID **168**.

Inhalt: was umgesetzt wurde (D&D-Zuweisung, Klick filtert immer, Wegfall der Bulk-Rückfrage, scrollende Listen, automatische Spaltenbreite, entzerrte Suchleiste), die bewussten Einschränkungen (kein Rückgängig, Lösen in der Großansicht, keine Tastaturbedienung, keine Ablageziele bei eingeklapptem Panel), die durchgeführten Prüfungen sowie die offenen Punkte inklusive der fehlenden visuellen Prüfung. Ergänzt um den Stand `Commit e165b29 auf Branch work, gepusht`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-07-08-10-29-40-nachtrag-mcp-kommentar-dnd-zuweisung.md` | neu | Dieser Nachtrag |
| `logs/README.md` | geändert | Index-Eintrag |

Kein Code, kein Leitfaden, keine Testdatei berührt.

## Probleme und Abweichungen

**Formatierung im Kommentar gedrängt.** Das Kommentarfeld der App speichert Rich Text (HTML). Der als Klartext übergebene Body wurde beim Speichern so umgesetzt, dass Zeilenumbrüche innerhalb eines Blocks verloren gehen: Die mit `-` eingeleiteten Aufzählungspunkte stehen nun als Fließtext innerhalb weniger `<p>`-Absätze statt als Liste. Der Inhalt ist vollständig und lesbar, die Gliederung aber schwächer als beabsichtigt.

Konsequenz für künftige Abschlusskommentare: Body als HTML mit `<ul><li>…</li></ul>` übergeben statt mit Klartext-Bindestrichen. Ein Nachbessern des bestehenden Kommentars ist derzeit nicht möglich — der MCP bietet für Kommentare kein Update- oder Delete-Werkzeug (nur `update_note` für Notizen).

## Offene Punkte / Folgeaufgaben

- Die offenen Punkte des Feature-Logs bleiben unverändert bestehen: keine visuelle Browser-Prüfung, keine E2E-Abdeckung für `/documents`, kein Rückgängig nach einem Drop, In-Memory-Filterung der Bibliotheksliste, Etappe 2 (Mehrfachfilter für Kategorien und Tags).
- Kommentar-Formatierung: bei der nächsten Gelegenheit HTML-Listen verwenden.
