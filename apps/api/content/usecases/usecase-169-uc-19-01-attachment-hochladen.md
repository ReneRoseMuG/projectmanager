<h1>UC 19/01: Attachment hochladen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Eine Datei einem bestehenden Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) hinzufügen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Parent-Objekt existiert persistent.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte für das Parent-Objekt.</li><li>Die Detailansicht des Parent-Objekts ist geöffnet.</li><li>Die maximal zulässige Dateigröße ist systemseitig definiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur wählt in der Detailansicht des Parent-Objekts die Funktion „Attachment hinzufügen“.<br>2. Das System öffnet einen Dateiauswahldialog.<br>3. Der Akteur wählt eine lokale Datei aus.<br>4. Das System überträgt die Datei per Multipart-Request an den Server.<br>5. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung des Akteurs,</li><li>Existenz des Parent-Objekts,</li><li>Dateigröße,</li><li>grundlegende Dateieigenschaften.</li></ul>
<p>6. Das System generiert einen eindeutigen persistenten Speichername.<br>7. Das System speichert die Datei im definierten Upload-Verzeichnis.<br>8. Das System legt einen Attachment-Datensatz mit Parent-Referenz an.<br>9. Das System speichert Metadaten (Originaldateiname, persistenter Speichername, MIME-Typ, Dateigröße, Erstellungszeitpunkt).<br>10. Das System aktualisiert die Attachmentliste in der UI.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht den Upload vor Bestätigung ab → Es wird kein Attachment gespeichert.</li><li>Das Parent-Objekt existiert nicht → System antwortet mit 404.</li><li>Der Akteur besitzt keine Änderungsrechte → System blockiert mit 403.</li><li>Die Datei überschreitet das Größenlimit oder ist ungültig → System antwortet mit 400, speichert nichts.</li><li>Technischer Fehler bei Speicherung → System antwortet mit 500, speichert nichts.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Die Datei ist persistent gespeichert.</li><li>Ein Attachment-Datensatz mit korrekter Parent-Referenz existiert.</li><li>Die Attachmentliste zeigt das neue Attachment konsistent an.</li></ul>