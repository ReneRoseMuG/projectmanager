# Codex-Auftrag: Attachments lokal öffnen via Node-Backend

## Ziel

Attachments können direkt in der nativen Windows-Anwendung geöffnet werden, ohne
sie erst herunterzuladen. Das Backend öffnet die Datei aus dem `uploads/`-Verzeichnis
über einen Shell-Befehl. Nach der Bearbeitung ist keine erneute Upload-Aktion nötig –
die Datei liegt bereits am richtigen Ort.

Das bisherige Upload-Verhalten (einmaliger Upload beim Anheften) bleibt unverändert.
Neu ist ausschließlich die „Öffnen"-Aktion.

---

## Kontext und Ist-Zustand

Attachments werden als statische Dateien im `uploads/`-Verzeichnis des Workspaces
gespeichert (im Backup enthalten). Aktuell kann ein Nutzer eine Datei nur herunterladen,
extern bearbeiten und dann erneut hochladen. Das führt zu Doppelablage und
Versionschaos.

Die App läuft ausschließlich lokal unter Windows. Node-Backend und Browser laufen
auf derselben Maschine. Das Backend hat daher vollen Filesystem-Zugriff und darf
Dateien via Shell öffnen – der Browser muss das nicht selbst tun.

---

## Umsetzung

### 1. Neuer API-Endpunkt im Backend

Einen neuen Route-Handler hinzufügen:

```
POST /api/attachments/:id/open
```

- Attachment anhand `:id` aus der Datenbank laden
- Absoluten Pfad zur Datei im `uploads/`-Verzeichnis auflösen
- Prüfen, ob die Datei existiert (sonst 404)
- Datei via Shell öffnen (npm-Paket `open` oder Node-eigenes `child_process`)
- Response: `204 No Content` bei Erfolg

Das npm-Paket `open` abstrahiert den plattformspezifischen Befehl
(`start` unter Windows, `xdg-open` unter Linux, `open` unter macOS) und ist
zu bevorzugen, falls bereits als Abhängigkeit vorhanden oder einfach installierbar.

### 2. Frontend: „Öffnen"-Button am Attachment

Am bestehenden Attachment-UI-Element (dort, wo aktuell „Herunterladen" liegt)
einen zusätzlichen Button oder eine Aktion „Öffnen" hinzufügen.

- Sendet `POST /api/attachments/:id/open`
- Kein Download, keine Navigation – die Datei öffnet sich nativ in Windows
- Bei Fehler (z. B. Datei nicht gefunden): Toast-Meldung mit dem Fehlertext

### 3. Keine Änderungen am Upload-Flow

Der einmalige Upload beim Anheften eines Attachments bleibt exakt wie bisher.
Nur die Folgeaktion „Öffnen" ist neu.

---

## Abnahmekriterien

- [ ] `POST /api/attachments/:id/open` existiert und ist erreichbar
- [ ] Die Datei öffnet sich korrekt in der zuständigen Windows-Anwendung
      (Word für `.docx`, Excel für `.xlsx`, Adobe/Edge für `.pdf` usw.)
- [ ] Bei nicht vorhandener Datei wird `404` zurückgegeben und im Frontend
      eine Toast-Fehlermeldung angezeigt
- [ ] Der bisherige Download-Button bleibt erhalten und funktioniert unverändert
- [ ] `vitest run` und `playwright test` vollständig grün

---

## Hinweise für Codex

- Die App läuft **ausschließlich lokal**. Es ist kein Mehrbenutzer-Szenario zu
  berücksichtigen. Der Shell-Befehl greift immer auf der Maschine des Nutzers.
- Der Pfad zur `uploads/`-Datei muss absolut aufgelöst werden (kein relativer Pfad
  an den Shell-Befehl übergeben).
- Der Endpunkt soll **keinen Dateiinhalt zurückgeben** – nur die Öffnen-Aktion auslösen.

---

## Referenz

- Bestehende Attachment-Routes: `apps/api/src/routes/attachments.ts` (oder ähnlich)
- Bestehende Attachment-UI-Komponente: `apps/web/src/components/` (Attachment-Bereich)
- `uploads/`-Verzeichnis: Workspace-Root
