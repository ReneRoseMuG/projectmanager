<h1>UC 20/02: Rollenabhängige Navigation anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md">FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung</a></li></ul>
<h2>Akteur</h2>
<p>Admin, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Die Navigation zeigt ausschließlich die für die Rolle des Akteurs vorgesehenen Bereiche.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Dem Akteur ist genau eine Rolle zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Anwendung.<br>2. Das System ermittelt serverseitig die Rolle des Akteurs.<br>3. Das System rendert die Navigation gemäß der Rollendefinition.<br>4. Nicht zulässige Navigationspunkte werden nicht angezeigt.<br>5. Bei Direktaufruf eines nicht zulässigen Bereichs prüft das System serverseitig die Berechtigung.<br>6. Das System blockiert mit 403 bei fehlender Berechtigung.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur besitzt die höchste Rolle → Alle vorgesehenen Bereiche werden angezeigt.</li><li>Der Akteur besitzt ausschließlich Leserechte → Nur lesende Bereiche werden angezeigt.</li></ul>
<h2>Ergebnis</h2>
<p>Die Navigation entspricht der funktionalen Rolle.</p>
<p>Unzulässige Bereiche sind weder sichtbar noch serverseitig zugänglich.</p>