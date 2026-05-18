<h1>UC 14/05: Rollenabhängige UI-Reduktion</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Leser</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ein Leser keine schreibenden UI-Elemente sieht.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist authentifiziert.</li><li>Der Benutzer besitzt die Rolle Leser.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet eine fachliche Ansicht.<br>2. Das System rendert die UI rollenabhängig.<br>3. Das System blendet schreibende Elemente aus.<br>4. Der Akteur kann ausschließlich lesende Aktionen durchführen.</p>
<h2>Alternativen</h2>
<ul><li>Deep-Link auf Bearbeitungsroute → Serverseitige Prüfung blockiert.</li></ul>
<h2>Ergebnis</h2>
<p>Die UI ist funktionsreduziert, ohne Datenmodelländerung.</p>