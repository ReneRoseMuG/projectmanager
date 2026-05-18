<h1>UC 32/04: Session-Ende – Verbindung schließen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-32-aktive-aenderungsbenachrichtigung.md">FT (32): Aktive Änderungsbenachrichtigung</a></li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer aller Rollen</p>
<h2>Ziel</h2>
<p>Beim Logout oder Schließen des Browsers die SSE-Verbindung sauber beenden und serverseitige Ressourcen freigeben.</p>
<h2>Vorbedingungen</h2>
<ul><li>Eine aktive SSE-Verbindung für die Session besteht.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer meldet sich ab oder schließt den Browser-Tab.<br>2. Der Server erkennt das Ende der Verbindung.<br>3. Der Server entfernt die Session aus der Liste aktiver Empfänger.</p>
<h2>Alternativen</h2>
<p>Keine.</p>
<h2>Ergebnis</h2>
<p>Es werden keine Ereignisse mehr an diese Session gesendet. Serverseitige Ressourcen sind freigegeben.</p>