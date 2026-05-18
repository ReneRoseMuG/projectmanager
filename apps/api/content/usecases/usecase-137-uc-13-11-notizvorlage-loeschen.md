<h1>UC 13/11: Notizvorlage löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine bestehende Notizvorlage endgültig aus dem System entfernen, ohne bereits erstellte Notizen zu verändern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Vorlage existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.</li><li>Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Vorlagenverwaltung.<br>2. Der Akteur wählt eine bestehende Vorlage aus.<br>3. Der Akteur wählt die Funktion „Löschen&quot;.<br>4. Das System zeigt eine Sicherheitsabfrage an.<br>5. Der Akteur bestätigt das Löschen.<br>6. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des Versionsmerkmals.</li></ul>
<p>7. Stimmen die Versionsinformationen überein, löscht das System die Vorlage endgültig aus der Persistenz.<br>8. Das System aktualisiert die Vorlagenliste.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht die Sicherheitsabfrage ab → Die Vorlage bleibt unverändert bestehen.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Löschung, Neuladen erforderlich.</li><li>Technischer Fehler → HTTP 500, keine Löschung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Vorlage ist im Erfolgsfall vollständig aus dem System entfernt.</li><li>Gelöschte Vorlagen erscheinen nicht mehr in der Vorlagenverwaltung und nicht in der Auswahlliste bei der Notizerstellung.</li><li>Bereits erstellte Notizen bleiben unverändert bestehen.</li><li>Es entstehen keine verwaisten Referenzen oder Seiteneffekte in bestehenden Notizen.</li></ul>