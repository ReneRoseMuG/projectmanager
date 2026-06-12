# Log: Detailkopf-Vereinheitlichung (Wiki ↔ FormModal)

**Datum:** 12.06.26  
**Uhrzeit:** 07:29:21  
**Schritt:** Feature — Vereinheitlichung Detail-Header (Tier 1+2)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Aktions-Cluster der Detail-Kopfzeile (Speicherstatus → Bearbeiten → ID kopieren → In neuem Tab → Löschen → Schließen) wurde in eine geteilte Komponente `DetailHeaderActions` extrahiert und von `FormModal` (alle Entitäts-Detailseiten) sowie `WikiPageForm` (alle drei Modi) gemeinsam genutzt. Damit erhält die Wiki-Detailseite im Wiki-Tab (eingebetteter Modus) erstmals die „ID kopieren"-Funktion, eine Löschaktion und „In neuem Tab öffnen" — ohne einen zweiten Hero zu erzeugen (Master-Detail-Layout bleibt erhalten). Wiki-Seiten bekamen eine echte Referenz `WIKI-<id>` über das zentrale `objectReference`-System statt der rohen numerischen ID. Der letzte handgebaute Wiki-Modal-`<header>` wurde durch `PageHero variant="detail"` ersetzt, sodass kein Sonder-Header mehr existiert. Auftragsklasse 5; Auftragsart „Vereinheitlichung". Gates angewendet: planungsleitplanken, test-entwurfsleitplanken, code-discipline.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/DetailHeaderActions.tsx` | neu | Geteilter Detail-Header-Aktionscluster, tone `onSteel`/`onLight` |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Inline-Aktionen durch `DetailHeaderActions` ersetzt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | 3 Modi auf Cluster umgestellt; Modal-Header → `PageHero`; embedded erhält Copy/Delete/Tab; `objectReference("wikiPage", …)` |
| `apps/web/src/pages/WikiPage.tsx` | geändert | `onDelete` an `canWrite` gebunden; `onOpenInTab` verdrahtet |
| `apps/web/src/lib/references.ts` | geändert | `wikiPage: "WIKI"` zu `ObjectReferenceType` + Präfixkatalog |
| `tests/unit/web/components/ui/DetailHeaderActions.test.tsx` | neu | Reihenfolge, bedingte Darstellung, Klick-Handler, Labels (5 Tests) |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Embedded zeigt/kopiert `WIKI-5` (2 neue Tests) |
| `tests/unit/web/utils/references.test.ts` | geändert | `wikiPage`- und `note`-Referenzfall ergänzt |

## Probleme und Abweichungen

Testleitplanken: Unit-Ebene, echte React-Komponenten; Mocks nur für Support-Hooks (Kommentare/Notizen/Dateien/Journal) und Clipboard — keine fachlichen Wunschzustände. Abgedeckt: neuer Cluster, WIKI-Referenz, Wiki-embedded-Copy.

Verifikation: Betroffene Dateien (references, DetailHeaderActions, FormModal, WikiPageForm, WikiPage) = 45/45 grün. Voller Web-Unit-Lauf: 681 grün / 30 rot. Per Stash-Baseline nachgewiesen, dass exakt dieselben 30 Tests **ohne** diese Änderung fehlschlagen (Board-Views, Panels, NoteEditor, invalidation.integration) — also vorbestehend und außerhalb des Auftrags; diese Änderung fügt 9 grüne Tests und 0 neue Fehler hinzu. `tsc`-Typecheck sauber.

Permission-Korrektur bewusst benannt: `WikiPage` übergibt `onDelete` jetzt nur bei `wiki:write` (`canWrite`), da der Kopf neu eine Löschaktion zeigt; die API bleibt verbindliche Sicherheitsgrenze.

Nicht von diesem Auftrag: Während der Skill-Aufrufe wurden `agents.md`, `.claude/skills/projekt-manager/SKILL.md` und `.claude/hooks/` vom Tooling automatisch verändert (Skill-Pfad-Aktualisierungen). Nicht angefasst, dem Nutzer gemeldet.

## Offene Punkte / Folgeaufgaben

- 30 vorbestehende rote Web-Unit-Tests (Board-Views u. a.) bleiben offen — separater Auftrag nötig.
- Optional: MCP-Resolver für `WIKI-<id>` prüfen, falls kopierte Wiki-Referenzen auch serverseitig auflösbar sein sollen.
