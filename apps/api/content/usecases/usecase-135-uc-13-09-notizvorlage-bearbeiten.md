<h1>UC 13/09: Notizvorlage bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine bestehende Notizvorlage ändern, ohne bereits erstellte Notizen rückwirkend zu beeinflussen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Vorlage existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.</li><li>Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Vorlagenverwaltung.<br>2. Der Akteur wählt eine bestehende Vorlage aus.<br>3. Das System lädt die Vorlagendaten einschließlich Versionsmerkmal.<br>4. Der Akteur ändert Titel, vordefinierten Inhalt und optional die Sortierreihenfolge.<br>5. Optional ändert der Administrator die Kennzeichnungsfarbe (<code>color</code>). Disponenten dürfen die Kennzeichnungsfarbe nicht setzen oder ändern.<br>6. Der Akteur bestätigt die Änderungen.<br>7. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Validierung der Pflichtfelder,</li><li>Übereinstimmung des Versionsmerkmals.</li></ul>
<p>8. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.<br>9. Das System erhöht das Versionsmerkmal und aktualisiert <code>updated_at</code>.<br>10. Das System aktualisiert die Vorlagenliste gemäß Sortierlogik.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder ungültig → Validierungsfehler, keine Persistierung.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler → HTTP 500, keine Änderung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Vorlage ist im Erfolgsfall aktualisiert.</li><li>Bereits erstellte Notizen bleiben unverändert, einschließlich ihrer übernommenen Kennzeichnungsfarbe.</li><li>Parallele Änderungen führen nicht zu stillen Überschreibungen.</li><li>Die Vorlage steht weiterhin gemäß <code>is_active</code> Status in Auswahllisten zur Verfügung.</li></ul>