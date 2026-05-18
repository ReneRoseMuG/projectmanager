<h1>UC 32/03: Verbindung nach Unterbrechung wiederherstellen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-32-aktive-aenderungsbenachrichtigung.md">FT (32): Aktive Änderungsbenachrichtigung</a></li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer aller Rollen</p>
<h2>Ziel</h2>
<p>Nach einem Verbindungsabbruch sicherstellen, dass keine Änderungsereignisse verloren gehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die SSE-Verbindung wurde unterbrochen.</li><li>Der Benutzer ist noch angemeldet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Client erkennt den Verbindungsabbruch.<br>2. Der Client baut die SSE-Verbindung automatisch neu auf.<br>3. Der Client übermittelt dabei die ID des zuletzt empfangenen Ereignisses.<br>4. Der Server liefert alle <code>change_log</code>-Einträge nach, die seit diesem Zeitpunkt entstanden sind.<br>5. Der normale Ereignisstrom wird fortgesetzt.</p>
<h2>Alternativen</h2>
<p>Keine.</p>
<h2>Ergebnis</h2>
<p>Der Client ist nach dem Reconnect auf dem aktuellen Stand. Keine Änderungen wurden während der Unterbrechung lautlos übergangen.</p>