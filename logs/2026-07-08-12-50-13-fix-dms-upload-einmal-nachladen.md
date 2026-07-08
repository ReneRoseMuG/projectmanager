# Log: Einmal nachladen pro Upload-Vorgang statt einmal pro Datei

**Datum:** 08.07.26  
**Uhrzeit:** 12:50:13  
**Schritt:** Fix — Mehrfach-Upload lädt die Bibliothek nur noch einmal nach  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Nutzer wies darauf hin, dass ein Upload von 20 Dateien zum Problem wird. Die Analyse bestätigte das und zeigte, dass die Lage schlimmer war als im Vorgänger-Log notiert:

Die Upload-Mutation trug `onSuccess: invalidate`. `invalidateDocuments` ruft `invalidateMany`, das `Promise.all(queryClient.invalidateQueries(...))` **abwartet** — für `documents`, `globalSearch` und `journal`. TanStack Query v5 wartet in `mutateAsync` auf das Promise aus `onSuccess`. Ergebnis: **Pro Datei** wurde die aktive Infinite-Query invalidiert, lud **alle bereits geladenen Seiten** neu, und der nächste Upload startete erst danach. Bei 1.000 Dokumenten (Seitengröße 50 → 20 Seiten) und 20 Dateien sind das bis zu 400 `GET /documents`-Requests, von denen jeder serverseitig die gesamte `attachments`-Tabelle lädt und im Speicher filtert. Der Upload-Fortschritt hing an vollständigen Bibliotheks-Neuladungen.

Umgesetzt: `AttachmentUploader` bekommt eine **optionale** Prop `onBatchComplete`, die einmal nach der Datei-Schleife läuft und abgewartet wird, bevor die „lädt hoch…"-Anzeige verschwindet. Weil sie optional ist, bleiben die **sechs anderen Aufrufer** (Projekt-, Task-, Ticket-, Feature-, Meilenstein-, Wiki-Formular) unverändert; deren Mutationen invalidieren weiterhin selbst.

`useDocumentActions` verliert das `onSuccess: invalidate` an der Upload-Mutation und exportiert stattdessen `refreshDocuments`. Das ist vertretbar, weil ausschließlich `DocumentsPage` diesen Hook nutzt (geprüft) — ein Kommentar an der Mutation hält die Kopplung fest.

`DocumentsPage` zählt Erfolge je Datei und erledigt am Batch-Ende **einmal**: einschränkende Filter leeren, `refreshDocuments()`, und **einen** zusammenfassenden Erfolgs-Toast mit Zielangabe („3 Dokumente hochgeladen · Einsortiert in Sammlung ‚Rechnungen' · Kategorie ‚Wichtig'"). Fehler meldet `run` weiterhin je Datei. Kam keine Datei durch, geschieht nichts — auch die Filter bleiben stehen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/AttachmentUploader.tsx` | geändert | Optionale Prop `onBatchComplete`, einmal nach der Schleife, abgewartet |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Upload-Mutation ohne `onSuccess: invalidate`; `refreshDocuments` exportiert |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Erfolgs-Zähler, `handleUploadBatchComplete`, Summen-Toast, `run` wieder ohne `successMessage` |
| `tests/unit/web/components/attachments/AttachmentUploader.test.tsx` | neu | Vier Fälle: Reihenfolge, genau ein Abschluss, Abschluss trotz Wurf, Prop optional |
| `tests/unit/web/pages/DocumentsPage.upload.test.tsx` | geändert | Drei neue Fälle (kein Nachladen je Datei, genau ein Nachladen + Summen-Toast, kein Erfolg → nichts); bestehende auf Batch-Abschluss umgestellt |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Neuer Fall: Upload invalidiert NICHT, `refreshDocuments` invalidiert |

Backend, API-Contract, Datenbank, Berechtigungen: unberührt.

## Probleme und Abweichungen

**Der `successMessage`-Parameter an `run` wurde wieder entfernt.** Ich hatte ihn im vorigen Auftrag für den Upload-Toast eingeführt; durch den Summen-Toast (der `showToast` direkt ruft) hatte er keinen Aufrufer mehr. Verwaister Code, der erst durch die eigene Änderung entstand — entfernt.

**Ein Seiten-Test allein beweist die Änderung nicht.** In `DocumentsPage.upload.test.tsx` ist `useDocumentActions` vollständig gemockt; dort wäre „keine Invalidierung je Datei" auch vor der Änderung trivial erfüllt gewesen. Der eigentliche Nachweis liegt deshalb in `useDocuments.test.tsx` mit echtem `QueryClient`: Nach `uploadDocument` ist `getQueryState(libraryKey).isInvalidated` **false**, erst `refreshDocuments()` setzt es auf true. Vor der Änderung wäre dieser Test rot.

**Beobachtung, nicht behoben (kein Auftrag):** Die Schleife in `uploadFiles` steht in einem `try/catch` — wirft ein `onUpload`, bricht sie ab und **überspringt die restlichen Dateien stillschweigend**. Von der Dokumente-Seite aus tritt das nicht auf, weil `run` intern fängt; für die sechs Formular-Aufrufer kann es zutreffen. Der neue Uploader-Test hält dieses Verhalten ausdrücklich fest, statt es zu verschweigen.

**Was das nicht heilt:** Jeder einzelne `GET /documents` lädt weiterhin die gesamte Tabelle und filtert im Speicher. Gesenkt wurde die Häufigkeit, nicht die Kosten pro Anfrage.

## Angewendete Leitplanken

`planungsleitplanken` und `test-entwurfsleitplanken` (in dieser Sitzung angewendet, unverändert gültig); Plan vorgelegt, Freigabe abgewartet.

**Testebene:** Unit. **Mock-Entscheidung:** `AttachmentUploader` wird als **echte** Komponente getestet (echter File-Input, echte `File`-Instanzen, Callbacks als Spies — sie sind der Vertrag, kein Innenleben). Für `useDocumentActions` echter `QueryClient`, nur die ky-API-Schicht ersetzt. In `DocumentsPage` bleiben Datenhooks und `@dnd-kit` als Page-Grenze gemockt. **Isolation:** jsdom, kein Netzwerk, kein Dateisystem.

**Prüfungen:** `typecheck -w apps/web` ✅ · `lint -w apps/web` ✅ · 55 Tests grün über sieben Dateien (`useDocuments`, `AttachmentUploader`, `DocumentsPage.dnd`, `DocumentsPage.upload`, `DocumentTile`, `documentDnd`, `documentPanelWidth`).

## Offene Punkte / Folgeaufgaben

- **Architektur-Leitfaden §5 (Vorschlag liegt vor, nicht geschrieben):** Der Upload-Handler in `routes/dms.ts` orchestriert `createUnboundAttachment` + `addAttachmentToFolder` + `assignCategoryToAttachment` selbst. Diese Ablauflogik gehört in eine Service-Funktion. Rein architektonisch, ohne Laufzeitwirkung — vom Nutzer geparkt.
- **Design-Leitfaden §8.26 (Vorschlag liegt vor, nicht geschrieben):** Upload-Kontext-Regel und Batch-Nachladen.
- **`uploadFiles` überspringt nach einem Wurf die restlichen Dateien stillschweigend** (betrifft die sechs Formular-Aufrufer). Vorbestehend, eigener Auftrag.
- **Skalierung:** `listDocumentLibrary` lädt alle Attachments und filtert im Speicher; Paginierung greift erst danach. Vorbestehend.
- Weiterhin offen: keine visuelle Browser-Prüfung, keine E2E-Abdeckung für `/documents`, kein Rückgängig nach einem Drop, Etappe 2 (Mehrfachfilter für Kategorien und Tags).
