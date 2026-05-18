<h1>UC 19/10: Attachment-Duplikat entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Ein Attachment, das durch mehrfachen Upload aus unterschiedlichen Kontexten als Duplikat entstanden ist, gezielt entfernen, ohne andere Attachments oder das Parent-Objekt zu beeinträchtigen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Mindestens zwei Attachments mit identischem oder ähnlichem Inhalt sind demselben Parent-Objekt zugeordnet.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte für das Parent-Objekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht des Parent-Objekts und sichtet die Attachmentliste.<br>2. Der Akteur identifiziert das zu entfernende Duplikat anhand von Dateiname, Dateigröße und Erstellungszeitpunkt.<br>3. Der Akteur klickt den Action-Button am betreffenden Attachment-Badge.<br>4. Das System zeigt den Bestätigungsdialog gemäß UC 19/06 mit der Sicherheitsfrage: „Soll nur die Verknüpfung zum [Parent-Typ] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)“<br>5. Der Akteur wählt die gewünschte Löschstufe (Entkopplung oder physische Löschung) oder bricht ab.<br>6. Das System führt die gewählte Operation gemäß UC 19/06 aus.<br>7. Das System aktualisiert die Attachmentliste in der UI.</p>
<p><strong>Hinweis zur Entscheidung</strong></p>
<p>Entkopplung ist empfohlen, wenn nicht sicher ist, ob die physische Datei noch anderweitig benötigt wird. Physische Löschung nur dann, wenn sicher ist, dass es sich nicht um ein Auftragsdokument handelt und keine weitere Referenz besteht.</p>
<h2>Alternativen</h2>
<ul><li>Akteur bricht den Dialog ab → keine Aktion, alle Attachments bleiben unverändert.</li><li>Attachment existiert nicht → System antwortet mit 404.</li><li>Parent-Objekt existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Änderungsrechte → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500, keine Teillöschung.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Das Duplikat ist entfernt (Datensatz, oder Datensatz und Datei, je nach gewählter Stufe).</li><li>Die verbleibenden Attachments des Parent-Objekts sind unverändert und konsistent.</li><li>Die Attachmentliste zeigt den bereinigten Stand an.</li></ul>