<h1>UC 13/10: Notizvorlage deaktivieren/aktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Den Aktivstatus einer bestehenden Notizvorlage ändern, ohne sie physisch zu löschen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Vorlage existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.</li><li>Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Vorlagenverwaltung.<br>2. Der Akteur wählt eine bestehende Vorlage aus.<br>3. Der Akteur wählt die Funktion „Deaktivieren&quot; oder „Aktivieren&quot;.<br>4. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des Versionsmerkmals.</li></ul>
<p>5. Bei erfolgreicher Prüfung setzt das System das Feld <code>is_active</code> entsprechend auf TRUE oder FALSE.<br>6. Das System erhöht das Versionsmerkmal und aktualisiert <code>updated_at</code>.<br>7. Das System speichert die Änderung persistent.<br>8. Das System aktualisiert die Vorlagenliste.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.</li><li>Technischer Fehler → HTTP 500, keine Änderung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Der Aktivstatus der Vorlage ist aktualisiert.</li><li>Nur Vorlagen mit <code>is_active = true</code> erscheinen in der Auswahlliste bei der Notizerstellung.</li><li>Bereits erstellte Notizen bleiben unverändert.</li><li>Es entsteht keine physische Löschung der Vorlage.</li></ul>