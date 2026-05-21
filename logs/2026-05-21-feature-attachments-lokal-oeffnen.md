# Log: Attachments lokal öffnen

**Datum:** 21.05.26  
**Schritt:** Feature — Attachments lokal öffnen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Attachments können jetzt über `POST /api/attachments/:id/open` lokal in der nativen Anwendung geöffnet werden. Der Endpunkt lädt das Attachment aus der Datenbank, löst den Upload-Pfad absolut und sicher unterhalb von `UPLOAD_DIR` auf, prüft die Datei-Existenz und nutzt einen injizierbaren File-Opener statt eines neuen npm-Pakets. Für diesen POST-Endpunkt wurde bewusst `attachments:read` als Berechtigung konfiguriert, weil die Aktion keine Daten verändert. Im Frontend gibt es pro Attachment eine getrennte Aktion „Lokal öffnen“, während Download, Preview, Upload und Delete unverändert bleiben. Fehler beim Öffnen werden im bestehenden Toast-System angezeigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/file-opener.service.ts` | neu | Plattformabhängiges Öffnen per Node `child_process` gekapselt |
| `apps/api/src/services/attachments.service.ts` | geändert | `openAttachment` mit sicherer Pfadauflösung, Existenzprüfung und Opener-Aufruf ergänzt |
| `apps/api/src/routes/attachments.ts` | geändert | `POST /api/attachments/:id/open` mit `attachments:read`-Override ergänzt |
| `apps/api/src/plugins/auth.ts` | geändert | Route-spezifischen Auth-Override im globalen Guard berücksichtigt |
| `apps/api/src/app.ts` / `apps/api/src/types.ts` | geändert | File-Opener in Fastify-App dekoriert und typisiert |
| `apps/web/src/api/attachments.ts` / `apps/web/src/hooks/useAttachments.ts` | geändert | Web-API und Mutation für lokales Öffnen ergänzt |
| `apps/web/src/components/attachments/AttachmentList.tsx` / `AttachmentPreview.tsx` | geändert | Lokale Öffnen-Aktion, Pending-Zustand und Toast-Fehlerbehandlung ergänzt |
| `apps/web/src/components/*/*Form.tsx` / `tickets/TicketDetail.tsx` | geändert | Open-Aktion in Projekt-, Aufgaben-, Meilenstein-, Feature- und Ticket-Dateitab durchgereicht |
| `tests/integration/api/attachments.test.ts` | geändert | Open-Erfolg, 404/500-Fehler und Auth/Permission-Fälle ergänzt |
| `tests/unit/web/components/attachments/AttachmentPreview.test.tsx` | neu | UI-Aktion, Pending-Zustand und Fehler-Toast getestet |
| `tests/browser/web/freshness.spec.ts` | geändert | E2E-Flow mit abgefangenem Open-Request und 404-Toast ergänzt |

## Probleme und Abweichungen

Keine. Die geplante Abweichung wurde umgesetzt: Es wurde kein neues `open`-Paket installiert, sondern eine testbare Node-basierte Opener-Abstraktion verwendet.

## Offene Punkte / Folgeaufgaben

Keine.
