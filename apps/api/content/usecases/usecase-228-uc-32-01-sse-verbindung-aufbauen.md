<h1>UC 32/01: SSE-Verbindung aufbauen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-32-aktive-aenderungsbenachrichtigung.md">FT (32): Aktive Änderungsbenachrichtigung</a></li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer aller Rollen</p>
<h2>Ziel</h2>
<p>Beim Laden der Anwendung eine persistente Server-Push-Verbindung aufbauen, über die der Client Änderungsereignisse empfangen kann.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Client baut nach erfolgreichem Login eine SSE-Verbindung zum Server auf.<br>2. Der Server registriert die Session als aktiven Empfänger.<br>3. Die Verbindung bleibt für die Dauer der Session offen.</p>
<h2>Alternativen</h2>
<p>Keine.</p>
<h2>Ergebnis</h2>
<p>Die Session ist als Empfänger registriert und empfängt ab sofort Änderungsereignisse anderer Benutzer.</p>