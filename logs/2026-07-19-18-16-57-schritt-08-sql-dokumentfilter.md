# Log: SQL-Dokumentfilter

**Datum:** 19.07.26  
**Uhrzeit:** 18:16:57  
**Schritt:** 8 — TASK-502: Dokumentfilter und Pagination vollständig datenbankseitig ausführen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Bibliothekssichtbarkeit, rekursive Sammlung, „Ohne Sammlung“, Kategorie, mehrere DMS-Tags, Dateityp und Suche in Originalname, Anzeigename und Beschreibung werden nun vor `COUNT(*)`, Sortierung, `LIMIT` und `OFFSET` in einer gemeinsamen SQL-Bedingung ausgewertet. Mehrere Tags erzeugen je eine `EXISTS`-Bedingung und arbeiten dadurch mit UND-Semantik. `total` und Seitenrecords verwenden dieselbe WHERE-Klausel; erst die tatsächlich angeforderte Seite wird gebündelt um Owner, Kategorien, Tags und direkte Sammlung ergänzt. Die Reihenfolge ist über `created_at DESC, id DESC` stabil. Die API akzeptiert den bisherigen einzelnen `tag`-Parameter kompatibel weiter und ergänzt den URL-fähigen Parameter `tags=1,2`; Syntax, Maximalzahl, DMS-Domain und Dokumenttyp werden validiert. Zwei wiederanlauffähig angelegte Indizes stützen Typ-/Sortierfilter und die inverse Tag-Suche. Der Web-Filterzustand liegt vollständig in der URL, mehrere Tags können hinzugefügt werden, aktive Filter sind einzeln entfernbar und „Alle zurücksetzen“ löscht den gesamten Zustand. Die sechs Owner-Relationen werden seriell geladen, damit ein Listenrequest nicht gleichzeitig fast den gesamten zentralen Pool belegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Filterindizes für Bibliothekstyp und Tag→Attachment ergänzt |
| `apps/api/src/db/migrations/20260719161053_ms80_document_filter_indexes/` | neu | Generierte, wiederanlauffähig gehärtete Indexmigration mit Snapshot |
| `apps/api/src/services/document.service.ts` | geändert | Vollständige SQL-Filterung, gemeinsames Count/Page-WHERE und Seitenanreicherung |
| `apps/api/src/services/attachments.service.ts` | geändert | Gebündelte Owner-Queries poolschonend serialisiert |
| `apps/api/src/routes/dms.ts` | geändert | Mehrfach-Tags, strikte Typ-/Suchvalidierung und kompatibler Einzel-Tag-Parameter |
| `apps/web/src/api/documents.ts` | geändert | Mehrfach-Tagfilter in stabiler URL-Kodierung |
| `apps/web/src/components/documents/documentLibraryUrl.ts` | neu | Reines URL-Parsing und gezielte Parameteraktualisierung |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | URL-basierte Filter, Mehrfach-Tags, aktive Chips und Reset |
| `tests/integration/api/dms.test.ts` | geändert | Filterdimensionen, Kombinationen, UND, leere Treffer, Validation und 100/1.000/3.000 Lastfälle |
| `tests/integration/api/dms-schema-migration.test.ts` | geändert | Neue Filterindizes in der echten Migrationskette geprüft |
| `tests/unit/web/components/documents/documentLibraryUrl.test.ts` | neu | Reload-, Einzelentfernungs- und ungültige URL-Werte |

## Probleme und Abweichungen

Der echte DMS-Integrationstest konnte weiterhin nicht initialisiert werden, weil für `root@localhost` kein Testpasswort konfiguriert ist. Die Suite brach vor Assertions ab und übersprang alle 15 Tests; die darin enthaltenen neuen Lastfälle mit 100, 1.000 und 3.000 Dokumenten wurden daher nicht ausgeführt. Gemäß Nutzerfreigabe erfolgte kein Testinfrastruktur-Fix. Der Browser-/E2E-Nachweis für Reload und Vor-/Zurück-Navigation bleibt ebenfalls offen. Gegen den realen Bestand wurde der neue Servicepfad stattdessen erfolgreich lesend ausgeführt; dies ersetzt nicht den isolierten Integrations- und Browsernachweis.

## Testleitplanken und Prüfergebnisse

Angewendet wurden die Projekt-Skills `projekt-manager-test-entwurfsleitplanken` und `code-discipline`. Die Unit-Ebene verwendet echte `URLSearchParams` ohne Mocks. Die API-Integration ist mit echter temporärer MySQL, Fastify, Rollen/Sessions und echten Relationstabellen entworfen. Der Lastfall fügt Daten in begrenzten 500er-Batches ein und fordert je Bestand nur eine 25er-Seite an.

- `npm run typecheck -w apps/api`: grün.
- `npm run db:migrate -w apps/api`: grün; Shared-Types-/API-Build und Migration `20260719161053_ms80_document_filter_indexes` erfolgreich.
- Reale lesende Serviceprüfung: Einzel-Tag 14 = 34 Treffer, Einzel-Tag 21 = 205 Treffer, Tags 14 UND 21 = 0 Treffer; UND-Ergebnis ist nicht größer als eine Einzelmenge.
- Reale kombinierte Suche `q=Sauna&type=image/`: `total = 68`, zurückgegeben = 5 bei `pageSize = 5`.
- `npm run build -w apps/web`: grün; bekannte Chunk-Größenwarnung ohne Build-Abbruch.
- `npx vitest run tests/unit/web/components/documents/documentLibraryUrl.test.ts`: 1 Datei, 3/3 Tests grün.
- `npx vitest run tests/integration/api/dms.test.ts`: 1 Suite rot vor Testausführung; 15/15 Tests übersprungen wegen fehlender Test-MySQL-Anmeldung.

## Offene Punkte / Folgeaufgaben

- Isolierte Filter-, Kombinations- und Lasttests mit erreichbarer Test-MySQL erneut ausführen.
- Browsernachweis für geteilte URL, Reload sowie Vor-/Zurück-Navigation nachholen.
- TASK-502 bleibt daher im Projekt Manager auf `Aktiv`; der nächste unabhängige Schritt ist TASK-503.
