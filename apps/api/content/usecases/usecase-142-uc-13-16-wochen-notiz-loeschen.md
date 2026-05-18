<h1>UC 13/16: Wochen-Notiz löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine bestehende Wochen-Notiz vollständig und konsistent entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Notiz existiert und ist einer Kalenderwoche zugeordnet.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte für Notizen (keine Leser-Rolle).</li><li>Die Notiz verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Notizliste im Kalenderwochen-Kontext.<br>2. Der Akteur wählt eine bestehende Notiz aus.<br>3. Der Akteur wählt die Funktion „Notiz löschen&quot;.<br>4. Das System zeigt eine Sicherheitsabfrage an.<br>5. Der Akteur bestätigt das Löschen.<br>6. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.</li></ul>
<p>7. Stimmen die Versionsinformationen überein, löscht das System die Notiz sowie den zugehörigen Eintrag in <code>calendar_week_note</code> endgültig.<br>8. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht die Sicherheitsabfrage ab → Die Notiz bleibt unverändert bestehen.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.</li><li>Der Akteur besitzt Leser-Rolle → HTTP 403, keine Löschung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Löschung, Neuladen erforderlich.</li><li>Technischer Fehler → HTTP 500, keine Löschung erfolgt.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Notiz ist im Erfolgsfall vollständig aus dem System entfernt.</li><li>Die Notiz erscheint in keiner Notizliste mehr.</li><li>Parallele Aktionen führen nicht zu inkonsistenten Zuständen.</li><li>Die Konsistenz der <code>calendar_week_note</code>-Relation bleibt gewahrt.</li></ul>