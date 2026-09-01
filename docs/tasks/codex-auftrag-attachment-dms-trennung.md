# Codex-Auftrag: Parent-Anhänge und Dokumentenmanagement trennen

## Ziel

Globale DMS-Dokumente, exklusive Anhänge eines Domänenobjekts und lokale Windows-Ordner werden als drei getrennte Dateiquellen behandelt. Parent-Ordner dürfen keine DMS-Sammlungen anlegen. Ein bestehendes DMS-Dokument kann bewusst und ohne Dateikopie mit einem Parent verknüpft werden.

## Kontext

Die bisherige Implementierung verwendete dieselben Attachment-Datensätze, Junctions und globalen Sammlungen sowohl für das Dokumentenmanagement als auch für Parent-Anhänge. Beim Lösen der letzten Owner-Verknüpfung wurde ein verborgener Anhang automatisch in die Dokumentenbibliothek überführt. Dadurch waren Lebenszyklus, Berechtigungen und Ordnersemantik beider Anwendungsfälle gekoppelt.

Das Dokumentenmanagement über den globalen Navigationspunkt bleibt mit Sammlungen und DMS-Tags vollständig erhalten. Die Trennung richtet sich ausschließlich gegen die Verwendung dieser Sammlungen als Parent-Unterordner.

## Aufgabe

1. Persistierte Attachment-Arten `document` und `parent_attachment` einführen.
2. Bestehende sichtbare Dokument-Owner-Bezüge in eigene versionierte Dokumentlink-Tabellen migrieren.
3. Für Projekt, Meilenstein, Aufgabe, Feature, Wiki-Seite und Ticket eigene hierarchische Parent-Ordner anlegen.
4. Parent-Anhänge genau einem Parent zuordnen und nur innerhalb dessen Ordnern einsortieren.
5. DMS-Dokumente explizit suchen, verknüpfen, parentlokal einsortieren und verlustfrei entknüpfen können.
6. DMS-Routen und Navigation über die eigene Permission-Ressource `documents` schützen.
7. Upload-Auswahl und automatische DMS-Veröffentlichung aus Parent-Workflows entfernen.
8. Lokale Windows-Ordner als unveränderte, separate Quelle beibehalten.
9. MCP-Verträge auf dieselbe Trennung umstellen.

## Regeln & Einschränkungen

- Globale DMS-Sammlungen gehören ausschließlich zu `document`-Datensätzen.
- Ein `parent_attachment` besitzt genau eine Owner-Zuordnung und niemals einen DMS-Dokumentlink.
- Parent-Ordner sind ownerlokal; Ordner-IDs eines anderen Owners werden abgewiesen.
- Das Lösen eines Dokumentlinks löscht weder den Dokumentdatensatz noch die physische Datei, Sammlung oder Tags.
- Das Löschen eines Parent-Anhangs entfernt Datensatz und physische Upload-Datei.
- Update- und Delete-Operationen bleiben versionsgeschützt.
- Listenpfade laden Relationen gebündelt und erzeugen kein N+1.
- Die Migration ist wiederanlaufsicher und stoppt bei mehrdeutigen Legacy-Anhängen vor irreversiblen Schritten.
- Mehrfach-Statement-DDL prüft `information_schema` vor jeder nicht idempotenten Änderung.

## Randfälle & Fehlerpfade

- Ownerlose oder mehrfach verknüpfte Legacy-Kandidaten für Parent-Anhänge blockieren die Migration.
- Ein Legacy-Parent-Anhang in einer DMS-Sammlung blockiert die Migration und muss vorab fachlich zugeordnet werden.
- Doppelte Dokumentlinks liefern `CONFLICT`.
- Fremde Ordner, Links und Attachments liefern `NOT_FOUND`, um Owner-Grenzen nicht offenzulegen.
- Leere oder doppelte Geschwisterordner, Zyklen und das Löschen nicht leerer Ordner werden abgewiesen.
- Veraltete `expectedVersion`-Werte liefern `CONFLICT`.
- Fehlende `attachments`- oder `documents`-Permissions liefern `FORBIDDEN`; fehlende Sessions `UNAUTHORIZED`.
- Das Lösen einer lokalen Ordnerquelle verändert keine Datei auf dem Windows-System.

## Seiteneffekte

- DMS-Datei-, Vorschau-, Thumbnail-, Open- und Delete-URLs wechseln auf `/api/documents/:id/*`.
- Parent-Datei-URLs bleiben unter `/api/attachments/:id/*`.
- Bestehende benutzerdefinierte `attachments`-Permissions werden während der Migration zusätzlich als `documents`-Permissions angelegt, damit etablierte Rollen nicht überraschend den DMS-Zugriff verlieren.
- Realtime-Invalidierung erhält einen eigenen `documents`-Scope.
- Dashboard- und Zählabfragen müssen Parent-Anhänge und Dokumentlinks fachlich getrennt zählen.

## Testhinweise

Frameworks und Hilfsmittel: Vitest, Supertest, React Testing Library, Playwright, echte zufällig benannte MySQL-Testdatenbanken, echte Fastify-Routen und isolierte Temp-Verzeichnisse unter `tests/.runtime` beziehungsweise dem Betriebssystem-Temp-Root. In Integrationstests werden keine Datenbank-, Repository-, Service- oder Dateisystem-Mocks eingesetzt. Nur native OS-Integrationen wie der File-Opener dürfen als kontrollierter Collaborator injiziert werden.

Neue Testdateien beginnen mit einem Kommentarblock aus `Test Scope`, `Test-Ebene`, `Realitätsgrad`, `Mock-Entscheidung`, `Isolation`, `Abgedeckte Regeln`, `Fehlerfälle` und `Ziel`.

### Integrationstests

1. Legacy-Migration: `is_in_document_library` wird korrekt in beide Arten überführt.
2. Legacy-Migration: sichtbare Owner-Dokumente landen genau einmal in der passenden Link-Tabelle.
3. Legacy-Migration: Parent-Anhänge bleiben in genau einer Parent-Junction.
4. Legacy-Migration: benutzerdefinierte Attachment-Permissions werden für Dokumente nachgeführt.
5. Legacy-Migration: ein zweiter Lauf verändert oder dupliziert nichts.
6. Upload: jeder der sechs Parent-Typen erzeugt `parent_attachment` und erscheint nicht im DMS.
7. Parent-Ordner: Root und Unterordner sind nur am richtigen Owner sichtbar.
8. Parent-Ordner: gleichnamige Ordner verschiedener Owner sind erlaubt.
9. Parent-Ordner: fremde Zielordner, Zyklen, Duplikate und nicht leere Deletes scheitern.
10. Parent-Anhang: Move inkrementiert die Version; stale Version scheitert.
11. Parent-Anhang: Delete entfernt Datensatz und echte Temp-Datei.
12. Dokumentlink: DMS-Dokument wird ohne Kopie verknüpft und in der Parent-Ansicht sichtbar.
13. Dokumentlink: derselbe Link kann nicht doppelt angelegt werden.
14. Dokumentlink: Move ist versioniert und parentlokal.
15. Dokumentlink: Unlink entfernt nur die Relation; DMS-Dokument und Datei bleiben abrufbar.
16. Berechtigungen: `attachments:read` erlaubt keine Dokumentroute.
17. Berechtigungen: `documents:read` erlaubt keine Parent-Attachment-Dateiroute.
18. Berechtigungen: Dokumentlink-Write benötigt Dokument- und Parent-Schreibrecht.
19. Berechtigungen: Reader und anonyme Nutzer werden auf Schreib- beziehungsweise Lesewegen abgewiesen.
20. Lokale Ordner: Navigation, Download und Lösen verändern die Ursprungsdateien nicht.

### Unit- und Komponententests

1. Attachment-Uploader zeigt keine DMS-Sichtbarkeitsauswahl und ruft `onUpload(file)` auf.
2. Pending-Dateien tragen keine Bibliotheksauswahl und werden als exklusive Parent-Anhänge bezeichnet.
3. `useAttachments` nutzt getrennte Query-Keys und invalidiert Attachments, Parent-Ordner und Dokumentlinks.
4. Parent-Dateiansicht filtert Anhänge und Dokumentlinks nach demselben Parent-Ordner.
5. DMS-Picker blendet bereits verknüpfte Dokumente aus beziehungsweise deaktiviert sie.
6. Unlink-Dialog eines DMS-Links erklärt den Relationserhalt.
7. Parent-Anhang-Delete erklärt, dass das DMS unverändert bleibt.
8. Sidebar und Route-Gating verwenden `documents:read`.
9. Realtime-Scope `documents` invalidiert DMS- und Parent-Link-Queries.
10. MCP-Schemas lehnen `libraryVisibility` ab und verwenden getrennte Link-Werkzeuge.

### Browser-/E2E-Tests

1. Parent-Anhang hochladen: erscheint sofort in der Parent-Dateiansicht, nicht im globalen DMS.
2. Parent-Root und Unterordner anlegen: Ansicht filtert korrekt; globale Sammlungsliste bleibt unverändert.
3. DMS-Dokument verknüpfen: erscheint mit DMS-Kennzeichen und ohne Seitenreload.
4. DMS-Link in Parent-Unterordner verschieben: erscheint nur im gewählten Parent-Ordner.
5. DMS-Link lösen: verschwindet beim Parent, bleibt im globalen DMS abrufbar.
6. Lokalen Windows-Ordner einbinden: reale Unterordner sind navigierbar und beim Lösen unverändert.
7. Rolle ohne `documents:read`: DMS-Navigation und Picker fehlen, Parent-Anhänge bleiben gemäß Attachment-Recht nutzbar.

Alle aufgeführten Tests müssen vor der Abnahme grün sein. `test.skip`, `it.skip` und leere Testkörper sind unzulässig.

## Abnahmekriterien

- [ ] Globale DMS-Sammlungen werden nur im globalen Dokumentenmanagement angelegt und verwendet.
- [ ] Parent-Ordner sind ownerlokal und haben keinen Seiteneffekt auf das DMS.
- [ ] Parent-Uploads erzeugen immer exklusive Parent-Anhänge ohne Sichtbarkeitsauswahl.
- [ ] DMS-Dokumente werden ausschließlich explizit und ohne Kopie verknüpft.
- [ ] Link-Lösen erhält DMS-Dokument, Datei, Sammlung und Tags.
- [ ] Lokale Windows-Ordner bleiben eine separate, nicht kopierende Quelle.
- [ ] `attachments` und `documents` sind in API und UI getrennte Permission-Ressourcen.
- [ ] Migration und vollständige Testmatrix sind grün.
- [ ] API-, Web-, MCP- und Shared-Type-Builds sind grün.

## Implementierungsreihenfolge

1. Produktive Bestandsdaten read-only auditieren und Mehrdeutigkeiten ausschließen.
2. Shared Types, Schema und wiederanlaufsichere Migration erstellen und real ausführen.
3. Repositories und Services für Parent-Ordner und Dokumentlinks ergänzen.
4. API-Routen, Datei-Routen, Permissions und Realtime trennen.
5. Web-API, Query-Keys, Invalidierung, Uploads und Parent-Dateiansicht umstellen.
6. MCP-Verträge und Design-/Architekturdokumentation nachführen.
7. Unit-, Integrations- und Browsertests ergänzen und bestehende Tests aktualisieren.
8. Typechecks, Builds, Lint und vollständigen Testlauf seriell ausführen.
