<h1>UC 13/03: Notiz bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine bestehende Notiz ändern, ohne parallele Änderungen anderer Akteure still zu überschreiben.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Notiz existiert.</li><li>Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte für Notizen.</li><li>Die Notiz verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Notiz aus der Notizenliste des jeweiligen Parent-Kontexts.<br>2. Das System lädt die vollständigen Notizdaten einschließlich des aktuellen Versionsmerkmals.<br>3. Der Akteur ändert Titel und/oder Beschreibung der Notiz.<br>4. Änderungen an der Kennzeichnungsfarbe (<code>color</code>) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.<br>5. Der Akteur bestätigt die Änderungen.<br>6. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.</li></ul>
<p>7. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.<br>8. Das System erhöht das Versionsmerkmal und setzt <code>updated_at</code> auf den aktuellen Zeitstempel.<br>9. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder ungültig → Das System verweigert die Speicherung und zeigt Validierungsfehler an.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Speicherung.</li><li>Versionskonflikt (Notiz wurde zwischenzeitlich von einem anderen Akteur geändert oder gelöscht) → Das System antwortet mit HTTP 409 Conflict, speichert keine Änderungen und fordert den Akteur zum Neuladen des aktuellen Stands auf.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler → HTTP 500, keine Änderung wird gespeichert.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.</li><li>Parallele Änderungen führen nicht zu stillen Überschreibungen.</li><li>Die Notiz bleibt konsistent dem ursprünglichen Parent-Objekt zugeordnet.</li><li>Es entstehen keine inkonsistenten Zwischenzustände oder Lost Updates.</li></ul>