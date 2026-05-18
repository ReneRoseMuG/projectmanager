<h1>UC 19/09: Attachment an Termin verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine Datei einem bestehenden Termin als Attachment hinzufügen, die Anhangsliste anzeigen und Attachments herunterladen. Termin-Attachments folgen denselben technischen Regeln wie Attachments anderer Domänen, haben aber eine termineigene Besonderheit: Sie bleiben am Termin erhalten, unabhängig von Änderungen an Mitarbeiterliste, Tourzuordnung oder Datum.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Für Upload: Der Akteur besitzt die Rolle Disponent oder Administrator.</li><li>Für Anzeige/Download: Der Akteur besitzt mindestens Leserechte.</li></ul>
<h2>Ablauf</h2>
<h3>Ablauf — Upload</h3>
<p>1. Der Akteur öffnet die Detailansicht eines Termins.<br>2. Der Akteur wählt die Funktion „Attachment hinzufügen&quot;.<br>3. Das System prüft serverseitig Authentifizierung, Berechtigung (Disponent oder Administrator) und Existenz des Termins.<br>4. Das System führt den Upload-Prozess gemäß UC 19/01 und UC 19/05 durch.<br>5. Das System legt einen Attachment-Datensatz mit Referenz auf den Termin an.<br>6. Das System aktualisiert die Attachmentliste in der Termindetailansicht.</p>
<h3>Ablauf — Anzeige und Download</h3>
<p>1. Der Akteur öffnet die Termindetailansicht.<br>2. Das System lädt alle dem Termin zugeordneten Attachments.<br>3. Der Akteur öffnet oder lädt ein Attachment gemäß UC 19/03 und UC 19/04.</p>
<h3>Besonderheit Termin-Attachments</h3>
<ul><li>Termin-Attachments bleiben beim Termin, wenn Mitarbeiter zugewiesen oder entfernt werden.</li><li>Termin-Attachments bleiben beim Termin, wenn die Tourzuordnung geändert oder entfernt wird.</li><li>Termin-Attachments bleiben beim Termin, wenn das Datum verschoben wird.</li><li>Termin-Attachments werden erst entfernt, wenn der Termin selbst gelöscht wird (CASCADE).</li><li>Historische Termine sind read-only — Uploads auf historische Termine werden serverseitig blockiert (403).</li></ul>
<h2>Alternativen</h2>
<ul><li>Termin existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Berechtigung → System blockiert mit 403.</li><li>Termin ist historisch (Startdatum in der Vergangenheit) → Upload wird blockiert, Anzeige und Download bleiben erlaubt.</li><li>Datei ungültig oder zu groß → System antwortet mit 400, speichert nichts.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Das Attachment ist persistent gespeichert und eindeutig dem Termin zugeordnet.</li><li>Die Attachmentliste des Termins ist konsistent.</li><li>Termin-Attachments überleben alle Änderungen am Termin außer der Terminlöschung selbst.</li><li>Historische Termine können nicht mit neuen Attachments versehen werden.</li></ul>