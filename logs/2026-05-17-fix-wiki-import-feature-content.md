# Log: Wiki-Import Feature-Content

**Datum:** 17.05.26  
**Schritt:** Fix — Wiki-Import Feature-Content  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Prüfung hat ergeben, dass die importierten Feature-Dateien im Content-Verzeichnis nicht leer waren. Der Inhalt wurde jedoch als Markdown gespeichert, während der bestehende Rich-Text-Editor Feature-Inhalte als HTML erwartet. Der Wiki-Import wandelt Feature-Kerninhalt, Use-Case-Inhalte, Aufgabenbeschreibungen und Backlog-Beschreibungen jetzt vor dem Speichern in einfaches HTML um. Der Feature-Kerninhalt wird weiterhin vor dem Abschnitt `## Use Cases` gekürzt. Der Integrationstest prüft nun zusätzlich, dass importierter Feature-Inhalt als HTML mit Überschrift gespeichert wird und die alten Steuerabschnitte weiterhin ausgeschlossen bleiben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/wiki-import.service.ts` | geändert | Markdown-zu-HTML-Konvertierung für importierte Feature-, Use-Case-, Task- und Backlog-Inhalte ergänzt |
| `apps/api/src/app.integration.test.ts` | geändert | Import-Test um HTML-Erwartung für Feature-Inhalt erweitert |
| `logs/2026-05-17-fix-wiki-import-feature-content.md` | neu | Schritt-Log für die Fehlerbehebung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die bestehenden bereits importierten Feature-Inhalte werden durch die Codeänderung nicht automatisch umgeschrieben. Sie werden beim erneuten Import derselben Wiki-Quelle aktualisiert.

## Offene Punkte / Folgeaufgaben

Der Wiki-Import sollte für das betroffene Projekt erneut ausgeführt werden, damit die bereits gespeicherten Feature-Inhalte im HTML-Format neu geschrieben werden.
