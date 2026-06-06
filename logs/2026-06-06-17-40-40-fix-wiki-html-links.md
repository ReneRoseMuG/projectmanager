# Log: Wiki HTML Links

**Datum:** 06.06.26  
**Uhrzeit:** 17:40:40  
**Schritt:** Fix — Wiki HTML Links  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Wiki-Seiten-Links im Rich-Text-Editor werden jetzt als normale App-Route mit `/wiki/<id>` und zusätzlicher `data-wiki-page-id` erzeugt. Der Lesemodus-Interceptor liest die Datenbank-ID robust aus dem Link oder aus der Href und navigiert per React Router weiter; ältere `wiki://<id>`-Links bleiben kompatibel. Die TipTap-Link-Extension wird nur noch einmal registriert und erhält ein eigenes Attribut für die Wiki-Seiten-ID. Der Wiki-HTML-Export schreibt sowohl ältere `wiki://<id>`-Links als auch neue `/wiki/<id>`-Links in relative `index.html`-Dateipfade um. Die Testentwurfsleitplanken wurden angewendet: Unit-Testebene für Editor-Navigation und Link-Erzeugung mit gemocktem Router/TipTap, Integrationstestebene für Export mit echter Fastify-App, isolierter Test-DB und temporärem Exportverzeichnis.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Wiki-Link-Attribute, Klicknavigation und TipTap-Link-Konfiguration stabilisiert |
| `apps/api/src/services/wiki.service.ts` | geändert | Export-Umschreibung für alte und neue interne Wiki-Linkformen erweitert |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Unit-Tests für Wiki-Link-Erzeugung und Navigation über Datenbank-ID ergänzt |
| `tests/integration/api/wiki.test.ts` | geändert | Integrationstest für relative HTML-Dateipfade beim Wiki-Export ergänzt |
| `logs/2026-06-06-17-40-40-fix-wiki-html-links.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der vollständige Web-Unit-Testlauf für `rich-text-inline-field.test.tsx` bleibt rot mit drei bestehenden, nicht Wiki-Link-bezogenen Fällen: `T-14b` wegen fehlendem `editor.state.schema.marks` im Mock, `T-22` wegen erwarteter Sticky-Klassen am Toolbar-Element statt am Wrapper, und `T-27` wegen abweichender Flex-Klassen. Der fokussierte Wiki-Link-Testlauf ist grün. Keine Abweichung vom geplanten technischen Ansatz.

## Offene Punkte / Folgeaufgaben

Die bestehenden roten Editor-Tests `T-14b`, `T-22` und `T-27` sollten in einem separaten Folgeauftrag geklärt werden.
