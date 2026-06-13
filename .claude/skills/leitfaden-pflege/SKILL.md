---
name: leitfaden-pflege
description: >
  Hält die beiden Leitfäden (docs/design-leitfaden.md, docs/architektur-leitfaden.md)
  aktuell. Prüft, ob Code-Änderungen (neue Features, Fixes) einen Leitfaden-Abschnitt
  betreffen, und liefert Befund plus Formulierungsvorschlag. Schreibt NICHT
  selbstständig in die Leitfäden — Aufnahme erst nach Freigabe.
  Auslöser: Hinweis des Stop-Hooks (leitfaden-check.sh), "prüfe die Leitfäden",
  "ist der Design-Leitfaden noch aktuell", "muss das in den Architektur-Leitfaden",
  "Leitfaden-Pflege", "Leitfaden ergänzen".
---

# leitfaden-pflege — Leitfäden aktuell halten

Du prüfst, ob Änderungen an der App in den Leitfäden nachgezogen werden müssen, und
lieferst einen konkreten Formulierungsvorschlag. Du bist **read-only gegenüber den
Leitfäden**: kein stilles Umschreiben. Die Aufnahme erfolgt erst nach Freigabe durch
Rene (gleiche Haltung wie `code-inspector`). Du änderst auch keinen Code.

## Datenquellen

- **Zuordnung:** `docs/leitfaden-scope.json` — welcher Leitfaden gehört zu welchen
  Code-Bereichen und welche Abschnitte sind je Fall relevant. Quelle der Wahrheit.
- **Leitfäden:** `docs/design-leitfaden.md` (Frontend `apps/web`),
  `docs/architektur-leitfaden.md` (Datenmodell & Schichten).
- **Geänderte Dateien:** `git status --porcelain` bzw. `git diff` — was hat sich seit
  dem letzten Commit / im aktuellen Auftrag geändert.
- **Code via Graphify:** `graphify-out/` budgetschonend nutzen (siehe `code-inspector`):
  `graph.json` nicht komplett laden, gezielt nach Begriffen filtern, dann wenige
  betroffene Dateien lesen. `GRAPH_REPORT.md` zur Orientierung.

## Auslöser

1. **Automatisch:** Der Stop-Hook `leitfaden-check.sh` meldet am Ende eines Auftrags,
   dass geänderte Dateien einen Leitfaden-Bereich berühren. Dann diesen Skill anwenden.
2. **Explizit:** Rene bittet um Prüfung oder Ergänzung eines Leitfadens.

## Ablauf

1. **Betroffene Leitfäden bestimmen.** Aus dem Hook-Hinweis bzw. `git status` + den
   `trigger_globs` in `leitfaden-scope.json` ableiten, welche Leitfäden in Frage kommen.
2. **Relevante Abschnitte eingrenzen.** In `leitfaden-scope.json` → `abschnitte` die
   passenden Abschnitte je Leitfaden auswählen (`wann`-Hinweise nutzen). Nur diese
   Abschnitte des Leitfadens lesen, nicht den ganzen.
3. **Ist-Stand prüfen.** Die geänderten Code-Stellen gezielt lesen (bei Bedarf erst über
   Graphify die betroffenen Module finden). Frische des Graphen prüfen
   (`built_at_commit` gegen HEAD); ist er veraltet, Befund unter Vorbehalt melden und
   Rene zu `graphify update .` auffordern.
4. **Drift klassifizieren** — pro betroffenem Abschnitt genau eine Kategorie:
   - **Lücke:** Etwas Neues ist implementiert, aber im Leitfaden nicht beschrieben.
   - **Differenz:** Der Leitfaden beschreibt es anders, als es jetzt implementiert ist.
   - **Kein Handlungsbedarf:** Änderung ist vom Leitfaden gedeckt → kurz begründen, fertig.
5. **Formulierungsvorschlag liefern.** Für Lücke/Differenz einen konkreten Textvorschlag
   im **neutralen Stil und Format des jeweiligen Leitfadens** (Markdown, bestehende
   Abschnitts-Nummerierung und Tonalität). Angeben: Ziel-Datei, Ziel-Abschnitt
   (Nr. + Titel), und ob Ergänzung oder Ersetzung.
6. **Freigabe abwarten.** Erst nach Renes OK den Vorschlag in den Leitfaden einarbeiten
   und als normalen Commit übergeben. Ohne Freigabe nichts in die Leitfäden schreiben.

## Stilregeln je Leitfaden

- **design-leitfaden.md:** Tailwind-Token-Pflicht, Komponenten-Regeln, erlaubte Radii/
  Schatten, verbotene Muster. Neue Komponenten als eigener Unterabschnitt unter §8;
  neu entdeckte, noch nicht bereinigte Drift unter §13 (mit Priorität).
- **architektur-leitfaden.md:** Schichtreihenfolge (shared-types → routes → repositories
  → services → web-api → hooks), Datenmodell (Fach-/Support-Objekte, Beziehungsregeln),
  Pflicht-/Querschnittsfelder. Erledigter Änderungsbedarf wandert aus §5 heraus.

## Grenzen

- Keine Code-Änderung, keine stille Leitfaden-Änderung.
- Keine Aussage über Implementierung ohne Blick in den Code (kein Raten).
- Bei veraltetem Graphen Befunde nur unter Vorbehalt.
