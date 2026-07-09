# Log: Vorschaubilder für PDF, Office und ODF in der Kachelansicht

**Datum:** 08.07.26  
**Uhrzeit:** 14:55:07  
**Schritt:** Feature — serverseitig gerenderte Kachel-Vorschaubilder (erste Seite als PNG)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dokumentkacheln zeigten bisher nur bei Bildern eine echte Vorschau, sonst ein Typ-Icon. Jetzt rendert der Server für PDF, Office und ODF die **erste Seite als PNG** und die Kachel zeigt sie an.

**Vor dem Entwurf gemessen statt angenommen.** Der entscheidende Fund war, dass **LibreOffice bereits Laufzeit-Abhängigkeit ist** (`LIBREOFFICE_PATH`, headless) und Office/ODF für die Dokumentvorschau schon zu PDF konvertiert. Damit war die Frage nur noch, ob es auch rastern kann. Lokal verifiziert (`C:\Program Files\LibreOffice\program\soffice.exe`, nicht im PATH):

| Prüfung | Ergebnis |
|---|---|
| PDF → PNG | funktioniert (`draw_png_Export`) |
| DOCX / ODT → PNG | funktioniert |
| Mehrseitiges PDF | erzeugt genau **eine** Datei (Seite 1) |
| Auflösung steuerbar | ja, per `FilterOptions` exakt 400×566 px, ~5 KB |
| Dauer | ~800 ms pro Datei (warmes Profil) |
| Eingebettetes Thumbnail | ODF: ja (362×512). DOCX: **nein** |
| `execFile`-Argument unter Windows | verifiziert — Escaping von `{}` und `"` hält, Ergebnis 400×566 |

Daraus folgte: **keine Bildbibliothek, kein zusätzliches Binary.** LibreOffice skaliert selbst.

**Ein einheitlicher Weg über PDF.** Ein PDF wird direkt gerastert; Office/ODF nutzen zuerst die (gecachte) PDF-Fassung. Dafür wurde aus `convertOfficePreview` der Schritt `ensureOfficePdf` herausgezogen — Dokumentvorschau und Thumbnail teilen ihn. Ein bereits vorschauten Dokument kostet damit nur einen LibreOffice-Aufruf.

**Cache und Aufräumen kommen geschenkt.** Das Bild liegt als `attachment-<id>-<hash>-thumb.png` im vorhandenen `previewCacheDir`. `removeAttachmentPreviews(id)` löscht bereits alles mit dem Präfix `attachment-<id>-` — die Bereinigung beim Löschen eines Dokuments funktionierte ohne eine Zeile Zusatzcode. Ein Unit-Test hält dieses Präfix ausdrücklich fest, damit es nicht versehentlich geändert wird.

**Faul erzeugt, nicht beim Upload** (Entscheidung des Nutzers, Empfehlung bestätigt). Bei ~0,8–1,6 s pro Datei hätte ein 20-Dateien-Upload sonst 16–32 Sekunden länger gedauert. Das entspricht zudem dem bestehenden Vorschau-Design.

**Gegen den Prozess-Schwarm.** Ein Kachelraster fordert viele Bilder gleichzeitig an. Drei Bremsen: `loading="lazy"` (nur sichtbare Kacheln fragen an), ein **Single-Flight** je Dokument (parallele Anfragen teilen sich eine Erzeugung) und ein **globales Limit** (`THUMBNAIL_CONCURRENCY`, Standard 2). Der frei werdende Platz wird direkt an einen Wartenden übergeben, statt freigegeben und neu belegt zu werden — sonst könnte ein frisch eintreffender Aufruf ihn wegschnappen.

**Die Kachel legt das Bild über das Typ-Icon.** Dadurch ist das Icon von selbst der Platzhalter beim Laden und der Rückfall bei `404` oder fehlgeschlagener Erzeugung (`onError`).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/config.ts` | geändert | `thumbnailWidth`, `thumbnailHeight`, `thumbnailConcurrency` |
| `apps/api/.env.example` | geändert | Die drei Werte dokumentiert, Windows-Hinweis zu `LIBREOFFICE_PATH` |
| `apps/api/src/services/attachment-preview.service.ts` | geändert | `ensureOfficePdf` + `runLibreOffice` extrahiert; `supportsThumbnail`, `thumbnailFilename`, `thumbnailFilterArgument`, Rasterung, Single-Flight, Prozess-Limit, `getAttachmentThumbnail` |
| `apps/api/src/routes/dms.ts` | geändert | `GET /documents/:id/thumbnail` (`attachmentsAuth("read")`, Binär-Stream, 404-Fallback) |
| `apps/web/src/api/documents.ts` | geändert | `documentThumbnailUrl(id)` |
| `apps/web/src/components/attachments/DocumentTile.tsx` | geändert | Vorschaubild über dem Typ-Icon, `loading="lazy"`, `onError`-Rückfall |
| `tests/unit/api/services/attachment-thumbnail.test.ts` | neu | Eignung, Cache-Name (Aufräum-Präfix), Filter-Argument |
| `tests/integration/api/dms.test.ts` | geändert | Drei Fälle: Auslieferung, Rechte (401/Leser 200), 404-Pfade |
| `tests/unit/web/components/attachments/DocumentTile.test.tsx` | geändert | Bestehenden Test nachgeführt (§4.4) + fünf Fälle |
| `tests/unit/web/pages/DocumentsPage.{dnd,upload}.test.tsx` | geändert | `api/client`-Mock um `api`/`apiBaseUrl` ergänzt |

**Keine Migration, keine Schema-Änderung, keine neue Spalte.** Ein `hasThumbnail`-Feld hätte pro Dokument einen Dateisystem-Zugriff in der Listenabfrage erzwungen; stattdessen entscheidet der Dateityp, und ein fehlendes Bild fällt still auf das Icon zurück.

## Probleme und Abweichungen

**Der volle Web-Testlauf war nötig.** Die gezielten Läufe waren grün, der volle Lauf zeigte **19 rote Tests in zwei Dateien**: `DocumentTile` importiert nun `api/documents`, das `api` und `apiBaseUrl` aus `api/client` bezieht — die `DocumentsPage`-Tests mockten `api/client` nur mit `assetUrl`, weshalb bereits der Import scheiterte. Mocks ergänzt. Danach **923 Tests, 130 Dateien, alle grün**.

**Sicherheit geprüft, nicht angenommen.** `registerGlobalAuthGuard` hängt einen globalen `preHandler` ein; offen sind nur `/health` und `/api/auth/*`. `/uploads` und `/previews` liegen also bereits hinter der Session. Der neue Endpunkt fügt keine Angriffsfläche hinzu und läuft unter `attachmentsAuth("read")`. Das `<img>` überträgt die Session-Cookie (`SameSite=lax` greift auch bei abweichendem Port).

**Blocker — die Rasterung selbst ist nicht automatisiert abgesichert.** Keine bestehende Testdatei startet LibreOffice, und es ist nicht auf jeder Maschine vorhanden. Die Integrationstests stellen deshalb den Cache-Treffer vorab her und prüfen damit Routing, Berechtigung, Header und Auslieferung **real, ohne Prozess-Start** (der 404-Fall für eine Textdatei antwortet in 362 ms, also nachweislich ohne Konvertierung). Die Rasterung wurde manuell verifiziert (Tabelle oben), inklusive des `execFile`-Aufrufs mit exakt dem Argument-Array des Produktivcodes. Einen Test, der auf fremden Maschinen grün ist, weil er nichts prüft, habe ich nicht gebaut.

**Umfang bewusst weiter als gefragt** (vom Nutzer freigegeben): Neben PDF, DOCX und ODF bekommen auch XLSX, PPTX, ODS, ODP, DOC, XLS, PPT und RTF ein Vorschaubild — dieselbe Pipeline, kein Mehraufwand. Sonst hätte die Tabelle ein Icon und das Textdokument ein Bild.

**Die ODF-Abkürzung bewusst nicht genutzt** (vom Nutzer freigegeben): ODF-Dateien tragen ein fertiges `Thumbnails/thumbnail.png` (362×512, gemessen), und `unzipper` ist Abhängigkeit. Das spart einmalig ~800 ms, kostet aber einen zweiten, formatspezifischen Codepfad und liefert eine kleinere, fremd erzeugte Bildqualität.

## Angewendete Leitplanken

`planungsleitplanken` (Plan vorgelegt, drei Entscheidungen eingeholt, Freigabe abgewartet), `test-entwurfsleitplanken`.

**Testebenen:** Unit (API), Integration (API), Unit (Web).

*Unit API* — reine Funktionen, keine Mocks: Eignung je Dateityp inklusive Gegenbeispielen (Text, Bild, Video, Audio, Archiv, CSV) und des Falls „nichtssagender Mimetype, Endung entscheidet"; Cache-Dateiname trägt das Aufräum-Präfix und unterscheidet verschiedene Ablagedateien; Filter-Argument.

*Integration API* — echte Fastify-App, echte MySQL-Temp-DB, echte Sessions, Temp-`PREVIEW_CACHE_DIR`, keine Mocks: gecachtes PNG wird mit `image/png` und `Cache-Control: private` ausgeliefert (Bytes verglichen); `401` ohne Session, Leser (`read`) erhält `200`; `404` für eine Textdatei und für eine unbekannte ID im dokumentierten Fehlerformat.

*Unit Web* — echte `DocumentTile`: PDF und ODT fordern das Bild an (`src`, `loading="lazy"`), Typ-Icon und Badge bleiben darunter; ZIP und Video fordern **kein** Bild an (Gegenbeispiele); nach `onError` verschwindet das Bild und das Icon bleibt.

**Prüfungen:** `tsc -p apps/api` ✅ · `typecheck -w apps/web` ✅ · `lint -w apps/web` ✅ · `dms.test.ts` 16 Tests grün (vorher 13) · neue API-Unit-Tests 6 grün · **volle Web-Suite 923 Tests grün**.

## Offene Punkte / Folgeaufgaben

- **`LIBREOFFICE_PATH` muss in der deployten `.env` gesetzt sein.** `soffice` liegt unter Windows nicht im PATH. Fehlt der Wert, bleibt es folgenlos — die Kacheln behalten ihr Typ-Icon —, aber es gibt keine Vorschaubilder. Betrifft die Runtime unter `%LOCALAPPDATA%`.
- **Keine visuelle Browser-Prüfung** (Anmeldung + zentrale DB nötig), wie in den Vorgänger-Logs.
- **Erstaufruf eines großen Ordners** erzeugt viele Bilder nacheinander (Limit 2, ~800 ms je Bild). Die Kacheln füllen sich nach und nach; `loading="lazy"` begrenzt das auf den sichtbaren Bereich. Beobachtung, kein Blocker.
- **Design-Leitfaden §8.26** kennt die Vorschaubild-Regel noch nicht (Bild über Typ-Icon, Icon als Platzhalter und Rückfall, `loading="lazy"`). Formulierungsvorschlag folgt; nicht ungefragt geschrieben.
- **Architektur-Leitfaden §5** (bereits vermerkt): Der Upload-Handler orchestriert weiterhin selbst. Die neue Thumbnail-Route ruft dagegen genau einen Service auf.
- Weiterhin offen: keine E2E-Abdeckung für `/documents`, kein Rückgängig nach einem Drop, stiller Datei-Skip in `uploadFiles`, In-Memory-Filterung der Bibliotheksliste, Etappe 2 (Mehrfachfilter für Kategorien und Tags).
