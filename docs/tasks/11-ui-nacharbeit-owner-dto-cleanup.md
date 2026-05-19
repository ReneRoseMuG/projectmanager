# Codex-Aufgabe: UI-Nacharbeit Owner-DTO-Cleanup

## Aufgabenbeschreibung

Prüfe nach dem Entfernen der Legacy-Owner-Spalten aus `comments` und `attachments`, ob die Web-Oberfläche, UI-Testfixtures und Query-Hooks ausschließlich das Zielbild `owners: [...]` verwenden. Die Aufgabe dient als Nachfolgeprüfung für sichtbare UI-Auswirkungen des Schema-Cleanups; neue UI-Funktionalität ist nicht Teil des Scope.

## Scope

Betroffen sind Web-Komponenten, Hooks, API-Clients und Tests, die Comments oder Attachments darstellen, erzeugen oder mocken:

- `apps/web/src/components/ui/CommentThread.tsx`
- `apps/web/src/hooks/useEntityComments.ts`
- `apps/web/src/hooks/useAttachments.ts`
- `apps/web/src/api/comments.ts`
- `apps/web/src/api/attachments.ts`
- `apps/web/src/components/ui/__tests__/CommentThread.test.tsx`
- `apps/web/src/components/ui/__tests__/CommentThread.integration.test.tsx`
- `apps/web/src/components/test/ownerFormTestUtils.tsx`
- weitere Web-Fixtures mit `Comment`- oder `Attachment`-Objekten

---

## Schritt 1: Bestandsaufnahme

Lies gezielt die betroffenen Web-Dateien und dokumentiere eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `CommentThread.tsx` | rendert Comment-DTOs | keine Nutzung von `taskId`, `entityType` oder `entityId` aus Comment-Objekten |
| `useEntityComments.ts` | adressiert Kommentare über Entity-Routen | Route-Adressierung bleibt erhalten, DTO-Auswertung läuft über `owners` |
| `useAttachments.ts` | adressiert Attachments über Owner | DTO-Auswertung läuft über `owners` |
| Web-Testfixtures | könnten alte Owner-Felder enthalten | Fixtures enthalten nur noch `owners: [...]` |

Dokumentiere außerdem:

- Welche UI-Komponenten keine Änderung benötigen
- Welche Testfixtures angepasst werden müssen
- Welche Tests die neue DTO-Form absichern

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: DTO-Nutzung in Komponenten prüfen

- Suche nach Zugriffen auf alte Comment-Felder `taskId`, `entityType`, `entityId`.
- Suche nach Zugriffen auf alte Attachment-Felder `projectId`, `taskId`, `featureId`, `ticketId`.
- Route-Parameter und Query-Keys dürfen weiter `entityType`/`entityId` als Adressierung verwenden; sie sind keine DTO-Felder.
- Sichtbare UI darf keine alten Owner-Felder voraussetzen.

---

## Schritt 3: Fixtures und Tests bereinigen

- Entferne alte Owner-Felder aus allen `Comment`-Fixtures.
- Entferne alte Owner-Felder aus allen `Attachment`-Fixtures.
- Stelle sicher, dass jedes Comment-/Attachment-Testobjekt ein passendes `owners: [...]` enthält.
- Ergänze bei Bedarf Assertions auf `owners`, wenn dadurch eine relevante Regression abgesichert wird.

---

## Schritt 4: API-Client und Hooks prüfen

- `comments.ts` darf Entity-Routen weiter über `CommentEntityType` adressieren.
- `attachments.ts` darf Owner-Routen weiter über Pfadparameter adressieren.
- Hooks dürfen rohe Fehler nicht an Komponenten weiterreichen.
- Query-Invalidierung bleibt zentral über `src/queries/invalidation.ts`.

---

## Schritt 5: Tests

Seriell ausführen und Ergebnis dokumentieren:

- `npm run build -w packages/shared-types`
- `npm run test -w apps/web`
- falls verfügbar: `npm run e2e -w apps/web`

Fehlschläge nicht während des Testlaufs reparieren, sondern nach Testende gruppieren.

---

## Schritt 6: Abschluss

- Ergebnis gegen diese Aufgabe prüfen.
- Abweichungen und verbleibende UI-Risiken dokumentieren.
- Schritt-Log nach `logs/` schreiben und `logs/README.md` aktualisieren.

---

## Abnahmekriterien

- [ ] Keine Web-Komponente liest Legacy-Owner-Felder aus `Comment` oder `Attachment`.
- [ ] Alle Comment-Fixtures nutzen nur noch `owners: [...]`.
- [ ] Alle Attachment-Fixtures nutzen nur noch `owners: [...]`.
- [ ] Route-Adressierung über `entityType`/`entityId` ist klar von DTO-Feldern getrennt.
- [ ] Web-Tests wurden seriell ausgeführt oder ein Blocker wurde konkret dokumentiert.
- [ ] Keine neue UI-Funktion wurde eingeführt.

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Shared Types: `packages/shared-types/src/index.ts`
- Comment-Hook: `apps/web/src/hooks/useEntityComments.ts`
- Attachment-Hook: `apps/web/src/hooks/useAttachments.ts`
- UI-Komponente: `apps/web/src/components/ui/CommentThread.tsx`
