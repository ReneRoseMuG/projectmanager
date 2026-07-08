# Log: Sammlung und Kategorie als Ablage-Kontext des Uploads

**Datum:** 08.07.26  
**Uhrzeit:** 12:36:50  
**Schritt:** Feature — Upload übernimmt Sammlung + Kategorie, einschränkende Filter fallen weg; Endungsfilter-Gate korrigiert  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Nutzer fragte, was beim Upload passiert, wenn eine Sammlung **und** eine Kategorie gewählt sind. Die Analyse ergab eine Halbheit: `folderScope` diente doppelt als Upload-Ziel, `categoryFilter` nicht. Die Datei landete in der Sammlung, bekam aber keine Kategorie — und war damit durch den aktiven Kategoriefilter sofort unsichtbar. Der Erfolgs-Toast erschien trotzdem. Dasselbe galt für Label-, Typ-, Endungsfilter und Suche.

Nach Entscheidung des Nutzers wurde der **Kontext** (Sammlung + Kategorie) zum Ziel gemacht und die **Einschränkungen** (Label, Typ, Endung, Suche) nach erfolgreichem Upload geleert. Damit ist eine hochgeladene Datei anschließend garantiert sichtbar.

Die Kategorie wird **serverseitig und symmetrisch zur Sammlung** angewendet: `POST /documents` nimmt jetzt neben `?folder=` auch `?category=` entgegen und ruft den bereits vorhandenen `assignCategoryToAttachment`. Die naheliegende Frontend-Variante (Upload, danach `assignCategory` nachschieben) wurde verworfen: Sie hätte pro Datei **zwei** Requests und — schwerer wiegend — **zwei Invalidierungen** bedeutet. Weil die Bibliothek progressiv lädt, startet jede Invalidierung das Nachladen aller Blöcke neu; bei einem Zehn-Dateien-Upload (der Uploader nimmt `multiple`) wären das 20 statt 10 vollständige Reloads.

**Gegen eine neue verborgene Schreibwirkung.** Der Upload schreibt eine Zuordnung, die aus einem Ansichtszustand abgeleitet ist — genau das Muster, das in diesem Projekt bereits dreimal als Fehlerquelle auffiel (Doppelmodus, verwaiste Auswahl, unsichtbarer Upload). Damit der Unterschied nicht bloß Absicht bleibt, benennt der Erfolgs-Toast das Ziel ausdrücklich: „Einsortiert in Sammlung ‚Rechnungen' · Kategorie ‚Wichtig'". Ein Test hält das fest.

**Mitgenommen (auf ausdrückliche Freigabe):** Der Endungsfilter-Reset hing am falschen Gate (`loading || loadingMore`) und konnte in der 200-ms-Pause zwischen zwei Blöcken den Filter zurücksetzen, wenn die gewählte Endung erst später geladen wurde. Er hängt jetzt an `isComplete`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/dms.ts` | geändert | `uploadQuerySchema` um `category`; Handler wendet `assignCategoryToAttachment` symmetrisch zu `folder` an |
| `apps/web/src/api/documents.ts` | geändert | `uploadDocument(file, folderId?, categoryId?)`; Query über `URLSearchParams` |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Upload-Mutation reicht die Kategorie durch |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | `uploadCategory`, `handleUpload` mit Zielangabe im Toast, Leeren der einschränkenden Filter, `run` um `successMessage` erweitert, Endungsfilter-Gate auf `isComplete` |
| `tests/integration/api/dms.test.ts` | geändert | Drei Testfälle zum Upload-Kontext; Pflichtkommentar nachgeführt |
| `tests/unit/web/pages/DocumentsPage.upload.test.tsx` | neu | Fünf Testfälle: Ziel, kein Ziel, Toast-Zielangabe, Filter geleert, Fehlerfall |

Datenbank und Migrationen: unberührt — die m:n-Tabellen tragen die Zuordnung längst. Berechtigung unverändert `attachmentsAuth("write")`; es ist derselbe Schreibvorgang, keine neue Ressource.

## Probleme und Abweichungen

**Teileffekt bei unbekanntem Ziel — bewusst nicht repariert, sondern nachgewiesen.** Schlägt die Kategoriezuweisung fehl (unbekannte Kategorie → 404), ist das Attachment bereits angelegt; Upload und Zuordnung liegen nicht in einer Transaktion. Das ist **exakt das seit jeher bestehende Verhalten der `folder`-Zuweisung** an derselben Stelle. Ich habe kein neues Muster eingeführt und keine Transaktion über Dateisystem und DB erfunden, die niemand verlangt hat. Der Integrationstest hält die Grenze ausdrücklich fest, statt sie zu verschweigen.

**Contract:** `uploadQuerySchema` steht auf `additionalProperties: false`. Ein Frontend, das `category` gegen eine alte API sendet, bekäme `400`. Im Monorepo gehen Web und API gemeinsam raus — unkritisch, aber erwähnt.

**Mehrfach-Upload:** Der Uploader ruft `onUpload` je Datei sequenziell auf. Das Leeren der Filter greift nur, wenn überhaupt einer gesetzt ist; nach der ersten Datei ist der Zustand bereits leer, weitere Aufrufe lösen keinen neuen Query-Key aus.

## Angewendete Leitplanken

`planungsleitplanken` und `test-entwurfsleitplanken` (beide in dieser Sitzung angewendet, unverändert gültig); Plan vorgelegt, Freigabe abgewartet.

**Testebenen:** Integration (API) und Unit (Web).

*Integration* — echte Fastify-App, echte MySQL-Temp-DB (`createTestDb`, `truncateAll`), echte Sessions und Rollen, echter Multipart-Upload ins Temp-Verzeichnis, **keine Mocks**. Bewiesen: `?folder=&category=` ordnet beides zu; ein Upload ohne Query bleibt ohne Sammlung und Kategorie (Gegenbeispiel); unbekannte Kategorie → `404` im dokumentierten Fehlerformat, Dokument bleibt angelegt; Leser erhält `403`.

*Unit* — echte Seitenverdrahtung, `@dnd-kit` und Datenhooks als Page-Grenze gemockt, `AttachmentUploader` durch eine Schaltfläche ersetzt, die `onUpload` mit einer echten `File`-Instanz ruft. Bewiesen: Sammlung und Kategorie werden als Ziel übergeben; ohne Kontext kein Ziel; der Toast benennt das Ziel; Suche und Typfilter werden geleert, Sammlung und Kategorie bleiben; bei fehlgeschlagenem Upload bleiben die Filter stehen (Negativfall).

**Prüfungen:** `typecheck` (web + api) ✅ · `lint` (web) ✅ · `dms.test.ts` 13 Tests grün (vorher 10) · Web-Tests der berührten Bereiche 47 grün (`useDocuments`, `DocumentsPage.dnd`, `DocumentsPage.upload`, `DocumentTile`, `documentDnd`, `documentPanelWidth`).

## Offene Punkte / Folgeaufgaben

- **Design-Leitfaden §8.26** kennt die Upload-Kontext-Regel noch nicht (Sammlung + Kategorie als Ziel, einschränkende Filter werden geleert, Ziel muss im Toast benannt werden). Formulierungsvorschlag liegt dem Nutzer vor; nicht ungefragt geschrieben.
- **Keine visuelle Browser-Prüfung** (Anmeldung + zentrale DB nötig), wie in den Vorgänger-Logs.
- **Keine E2E-Abdeckung für `/documents`.**
- **Kein Rückgängig nach einem Drop** (bewusste Variante A).
- **Beobachtung ohne Auftrag (Skalierung):** `listDocumentLibrary` lädt alle Attachments und filtert im Speicher; die Paginierung greift erst danach. Bestand vorher.
- **Beobachtung ohne Auftrag:** Jede Upload-Invalidierung startet das progressive Nachladen der gesamten Bibliothek neu. Bei einem Mehrfach-Upload summiert sich das (eine Neuladung je Datei). Bestand vorher; durch die serverseitige Kategoriezuweisung wenigstens nicht verdoppelt.
