<h1>UC 13/15: Wochen-Notiz bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine bestehende Wochen-Notiz ändern, ohne parallele Änderungen anderer Akteure still zu überschreiben.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Notiz existiert und ist einer Kalenderwoche zugeordnet.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte für Notizen (keine Leser-Rolle).</li><li>Die Notiz verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Notiz aus der Notizliste im Kalenderwochen-Kontext.<br>2. Das System lädt die vollständigen Notizdaten einschließlich des aktuellen Versionsmerkmals.<br>3. Der Akteur ändert Titel und/oder Beschreibung.<br>4. Änderungen an der Kennzeichnungsfarbe (<code>color</code>) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.<br>5. Der Akteur bestätigt die Änderungen.<br>6. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.</li></ul>
<p>7. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.<br>8. Das System erhöht das Versionsmerkmal und setzt <code>updated_at</code> auf den aktuellen Zeitstempel.<br>9. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder ungültig → Das System verweigert die Speicherung und zeigt Validierungsfehler an.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.</li><li>Der Akteur besitzt Leser-Rolle → HTTP 403, keine Speicherung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler → HTTP 500, keine Änderung wird gespeichert.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.</li><li>Parallele Änderungen führen nicht zu stillen Überschreibungen.</li><li>Die Notiz bleibt konsistent der ursprünglichen Kalenderwoche zugeordnet.</li><li>Es entstehen keine inkonsistenten Zwischenzustände oder Lost Updates.</li></ul>