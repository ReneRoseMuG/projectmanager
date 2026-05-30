# Log: Kommentar Markdown HTML

**Datum:** 27.05.26  
**Schritt:** Fix — Kommentar-Markdown beim Speichern als HTML übernehmen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Rich-Text-Inline-Editor übernimmt Legacy-Markdown im `liveUpdate`-Modus direkt nach dem Öffnen als aktuelles Editor-HTML in den Formular-State. Dadurch speichert das Kommentar-Bearbeitungsmodal die bereits sichtbare HTML-Konvertierung auch dann, wenn der Kommentar nach dem Öffnen nicht weiter verändert wird. Der bestehende Kommentar-Workflow über `CommentThread` bleibt unverändert und verwendet weiterhin `expectedVersion`. Die Testleitplanken wurden angewendet; betroffen ist die Web-Unit-Ebene mit gemocktem TipTap-Editor, um den State-Übergang des Rich-Text-Feldes isoliert zu beweisen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Legacy-Markdown wird beim Öffnen im Live-Update-Modus als Editor-HTML gemeldet |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Regressionstest für Speichern ohne weitere Texteingabe ergänzt |
| `logs/2026-05-27-fix-kommentar-markdown-html.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
