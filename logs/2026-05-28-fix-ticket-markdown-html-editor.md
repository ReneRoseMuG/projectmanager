# Log: Ticket Markdown HTML Editor

**Datum:** 28.05.26  
**Schritt:** Fix — TKT-21 Ticket Markdown HTML Editor  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der gemeinsame HTML-Editor `RichTextInlineField` konvertiert eingefügten Markdown-Plain-Text jetzt zentral über die vorhandene `tiptap-markdown`-Extension in HTML. Dafür wurde die Markdown-Extension mit `transformPastedText` aktiviert, während die bestehende Paste-Bereinigung für überzählige Leerzeilen sowie Farb- und TextStyle-Marks erhalten bleibt. Weil das Ticket ausdrücklich alle HTML-Editor-Verwendungen betrifft, wurde keine Ticket-spezifische Sonderlogik in `TicketForm` ergänzt. Der direkte Web-Unit-Test der Editor-Komponente wurde erweitert und läuft grün. Ein neuer Browser-Test für den Ticket-Flow wurde ergänzt, konnte aber nicht bis zum Formular laufen, weil die E2E-Anmeldung bereits auf der Login-Auswahlseite hängen blieb.

Testleitplanken angewendet: Web-Unit und Browser/E2E. Die Unit-Ebene beweist die zentrale Editor-Konfiguration mit gemocktem TipTap-Editor. Die Browser/E2E-Ebene soll mit echter App, echter isolierter E2E-Testdatenbank unter `tests/.runtime/e2e` und echter Ticket-API beweisen, dass eingefügtes Markdown im Ticketformular als HTML gespeichert wird. Es wurden keine produktiven Daten, Uploads oder Content-Verzeichnisse verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Markdown-Paste-Konvertierung im gemeinsamen HTML-Editor aktiviert |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Unit-Test für zentrale Markdown-Paste-Konfiguration ergänzt |
| `tests/browser/web/tickets.spec.ts` | geändert | Browser-Test für Markdown-Paste im Ticketformular ergänzt |
| `logs/2026-05-28-fix-ticket-markdown-html-editor.md` | neu | Schritt-Log für TKT-21 |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der gezielte Browser-Test `npm run e2e -w apps/web -- tickets.spec.ts -g "eingefügtes Markdown"` ist blockiert. Playwright erreichte nicht den Ticket-Editor, sondern blieb im Authentifizierungs-Setup auf der Login-Auswahlseite mit dem Button „Als Rene anmelden“ hängen. Der Lauf endete nach 30 Sekunden mit Timeout; der anschließende Cleanup brach ab, weil Browser/Page bereits geschlossen waren. Das ist nach aktuellem Befund ein E2E-Auth-/Helper-Blocker vor dem eigentlichen Ticket-Flow, kein beobachteter Fehler der Markdown-Konvertierung.

## Offene Punkte / Folgeaufgaben

E2E-Login-Helper bzw. Testmodus-Anmeldung prüfen und danach den neuen Browserfall erneut ausführen. Bei erfolgreicher Authentifizierung muss der Test beweisen, dass `# Markdown Ticket`, Listen und `**fett**` nicht als Rohtext, sondern als HTML in der Ticketbeschreibung gespeichert werden.
