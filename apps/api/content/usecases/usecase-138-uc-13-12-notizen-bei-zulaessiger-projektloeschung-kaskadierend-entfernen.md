<h1>UC 13/12: Notizen bei zulässiger Projektlöschung kaskadierend entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass bei einer fachlich zulässigen Löschung eines Projekts alle eindeutig zugeordneten Projektnotizen konsistent und automatisch entfernt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Dem Projekt sind eine oder mehrere Notizen eindeutig zugeordnet.</li><li>Mit dem Projekt ist <strong>kein Termin verbunden</strong>.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte für Projekte.</li><li>Das Projekt verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht eines bestehenden Projekts.<br>2. Der Akteur wählt die Funktion „Löschen&quot;.<br>3. Das System prüft vor Anzeige der Sicherheitsabfrage, ob mit dem Projekt Termine verknüpft sind.<br>4. Sind keine Termine verknüpft, zeigt das System eine Sicherheitsabfrage an.<br>5. Der Akteur bestätigt die Löschung.<br>6. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des Versionsmerkmals des Projekts,</li><li>weiterhin das Nichtvorhandensein verknüpfter Termine.</li></ul>
<p>7. Stimmen alle Prüfungen, löscht das System das Projekt.<br>8. Das System entfernt automatisch alle Notizen, die eindeutig diesem Projekt zugeordnet sind.<br>9. Das System stellt sicher, dass keine verwaisten Projektnotizen verbleiben.<br>10. Das System bestätigt den erfolgreichen Löschvorgang.</p>
<h2>Alternativen</h2>
<ul><li>Mit dem Projekt sind Termine verknüpft → HTTP 409 Conflict, keine Löschung.</li><li>Der Akteur bricht die Sicherheitsabfrage ab → Keine Löschung.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Löschung.</li><li>Technischer Fehler → HTTP 500, keine Löschung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Das Projekt ist im Erfolgsfall vollständig gelöscht.</li><li>Alle zugeordneten Projektnotizen sind vollständig entfernt.</li><li>Kundennotizen bleiben unverändert bestehen.</li><li>Es existieren keine verwaisten Notizen.</li><li>Die referenzielle Integrität bleibt gewahrt.</li></ul>