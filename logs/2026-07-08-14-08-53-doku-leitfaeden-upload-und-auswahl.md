# Log: Leitfäden auf Auswahl-Bereinigung, Upload-Kontext und Batch-Nachladen nachgezogen

**Datum:** 08.07.26  
**Uhrzeit:** 14:08:53  
**Schritt:** Doku — Leitfaden-Pflege nach Commit `188ef7f` (Freigabe durch Nutzer erteilt)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Über den Skill `leitfaden-pflege` geprüft, welche Abschnitte die Änderungen aus `188ef7f` berühren. Zuordnung über `docs/leitfaden-scope.json`: `apps/web/src/**/*.tsx` → Design-Leitfaden §8; `apps/api/src/**` → Architektur-Leitfaden §4 (Schichtarchitektur) und §5 (bekannter Änderungsbedarf). Nur diese Abschnitte gelesen. Der Wissensgraph ist frisch (`graphify update .` lief vor dem Commit).

**Design-Leitfaden §8.26 — drei Lücken geschlossen** (Ergänzung, keine Ersetzung):

- *Auswahl und Filter:* Ausgefilterte Dokumente verlieren ihre Markierung, sobald die Liste vollständig geladen ist. Das Gate ist ausdrücklich `isComplete`, **nicht** `loading`/`loadingMore` — beide sind zwischen zwei Blöcken des progressiven Nachladens `false`. Begründet mit dem, was sonst passiert: unehrlicher Zähler, nicht abwählbare Markierung, stilles Mitziehen beim Drag.
- *Upload-Kontext:* Sammlung und Kategorie sind das Ziel (`?folder=`, `?category=`), Label/Typ/Endung/Suche sind Einschränkungen und werden nach erfolgreichem Upload geleert. Weil ein Ansichtszustand eine Schreibwirkung auslöst, muss der Erfolgs-Toast das Ziel benennen.
- *Mehrfach-Upload:* Nachgeladen wird einmal je Upload-Vorgang (`onBatchComplete`), nicht je Datei; die Upload-Mutation invalidiert bewusst nicht. Mit der Begründung, warum: `mutateAsync` wartet auf `onSuccess`, eine Invalidierung je Datei holt die progressiv geladene Liste jedes Mal vollständig neu und blockiert den nächsten Upload.

**Architektur-Leitfaden §5 — ein Eintrag unter „Routes" ergänzt.** Der Upload-Handler in `routes/dms.ts` orchestriert `createUnboundAttachment` + optional `addAttachmentToFolder` + optional `assignCategoryToAttachment` selbst. Nach §4 gehört diese Ablauflogik in eine Service-Funktion. Der Eintrag hält zusätzlich die bekannte Grenze fest: Der Ablauf ist nicht transaktional; schlägt eine Zuordnung fehl, ist das Attachment bereits angelegt.

**§4 wurde bewusst NICHT angefasst.** Die Schichtregel dort ist richtig — abgewichen ist der Code. Eine Aufweichung des Leitfadens, damit er zur Implementierung passt, wäre die falsche Richtung. Der Befund gehört deshalb unter „bekannter Änderungsbedarf".

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/design-leitfaden.md` | geändert | §8.26 um Auswahl/Filter, Upload-Kontext und Mehrfach-Upload ergänzt |
| `docs/architektur-leitfaden.md` | geändert | §5, Abschnitt „Routes": Orchestrierung im Upload-Handler als Änderungsbedarf vermerkt |
| `logs/README.md` | geändert | Index-Eintrag |

Kein Code, keine Testdatei berührt.

## Probleme und Abweichungen

**Befund: `docs/architektur-leitfaden.md` §5 ist in weiten Teilen veraltet.** Die Liste verlangt dort unter anderem:

- „`users`-Tabelle fehlt vollständig — anlegen" — existiert längst (Auth, Rollen, Permissions).
- „Repositories: Verzeichnis und alle Repository-Dateien fehlen vollständig — anlegen" — `apps/api/src/repositories/` existiert (u. a. `attachment.repository.ts`, `tag.repository.ts`).
- „`attachments`: nullable FK-Felder müssen durch Junction-Tabellen ersetzt werden" — die Junction-Tabellen (`projectAttachments`, `taskAttachments`, …) sind produktiv im Einsatz.
- „`version`, `created_by`, `updated_by` fehlen auf allen Entity-Tabellen" — sind vorhanden.

Der Abschnitt beschreibt also einen Zustand, der seit Langem erledigt ist. Der Skill sieht vor, dass erledigter Änderungsbedarf aus §5 herauswandert. Das ist ein eigener Audit über den gesamten Abschnitt und deutlich mehr als der freigegebene Auftrag — **nicht durchgeführt**, hier als Folgeaufgabe dokumentiert. Mein neuer Eintrag steht in der bestehenden Struktur (`**Routes:**`), damit er beim späteren Aufräumen auffindbar bleibt.

## Offene Punkte / Folgeaufgaben

- **Audit von `architektur-leitfaden.md` §5:** erledigte Punkte entfernen (users-Tabelle, Repositories, Junction-Tabellen, Pflichtfelder), verbleibende auf ihren tatsächlichen Stand prüfen. Eigener Auftrag.
- **Der neue §5-Eintrag beschreibt Änderungsbedarf, nicht Erledigtes.** Wird der Upload-Handler in eine Service-Funktion überführt, wandert er wieder heraus.
- Kommt Etappe 2 (Mehrfachfilter für Kategorien und Tags, Tags in die linke Spalte), sind §8.25 und §8.26 erneut zu prüfen — dann zusätzlich §4, weil der Filter-Contract über Route und Service wächst.
- Die übrigen offenen Punkte der Vorgänger-Logs bleiben bestehen (keine visuelle Browser-Prüfung, keine E2E-Abdeckung für `/documents`, kein Rückgängig nach einem Drop, stiller Datei-Skip in `uploadFiles`, In-Memory-Filterung der Bibliotheksliste).
