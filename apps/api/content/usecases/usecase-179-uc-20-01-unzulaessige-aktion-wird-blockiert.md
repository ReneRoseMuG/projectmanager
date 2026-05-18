<h1>UC 20/01: Unzulässige Aktion wird blockiert</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md">FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung</a></li></ul>
<h2>Akteur</h2>
<p>Admin, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Verhindern, dass ein Akteur eine fachliche Mutation ausführt, für die seine Rolle keine Berechtigung besitzt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Die angeforderte Aktion erfordert eine bestimmte Rolle.</li><li>Der Akteur besitzt diese Rolle nicht.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur startet eine fachliche Mutation (z. B. Anlegen, Bearbeiten oder Löschen eines Objekts).<br>2. Das System prüft serverseitig die Rolle des Akteurs.<br>3. Das System vergleicht die Rolle mit den für die Aktion definierten Berechtigungen.<br>4. Das System verweigert die Ausführung der Mutation.<br>5. Das System antwortet mit HTTP-Status 403.</p>
<h2>Alternativen</h2>
<ul><li>Die Aktion wird ausschließlich über die UI angeboten, aber serverseitig ebenfalls geprüft.</li><li>Der Akteur versucht einen Direktaufruf eines Endpunkts → Das System blockiert mit 403.</li></ul>
<h2>Ergebnis</h2>
<p>Die Mutation wird nicht durchgeführt.</p>
<p>Es erfolgt keine Datenänderung.</p>