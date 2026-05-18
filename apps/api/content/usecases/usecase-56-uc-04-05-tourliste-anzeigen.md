<h1>UC 04/05: Tourliste anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator, Monteur</p>
<h2>Ziel</h2>
<p>Alle Touren rollenabhängig anzeigen.</p>
<h2>Beschreibung</h2>
<p>Die Tourübersicht zeigt alle Touren. Mutationsfunktionen sind rollenabhängig sichtbar und serverseitig abzusichern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist angemeldet.</li><li>Touren können vorhanden sein oder die Liste kann leer sein.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Tourenübersicht.<br>2. Das System ermittelt alle Touren.<br>3. Das System zeigt je Tour Name und Farbe.<br>4. Das System rendert die Bedienung rollenabhängig:</p>
<ul><li>Disponent und Administrator sehen Aktionen zum Anlegen, Bearbeiten und Löschen.</li><li>Monteure sehen die Übersicht im Lesemodus.</li></ul>
<p>5. Das System stellt sicher, dass Mutationsaktionen für Monteure nicht gerendert und serverseitig blockiert werden.</p>
<h2>Alternativen</h2>
<ul><li>Keine Touren vorhanden: Das System zeigt eine leere Übersicht mit Hinweis.</li><li>Direkter Zugriff auf eine Mutationsfunktion ohne Berechtigung: Das System blockiert serverseitig.</li></ul>
<h2>Ergebnis</h2>
<p>Die Tourübersicht ist vollständig sichtbar und entspricht der Rolle des Akteurs. Unzulässige Aktionen können nicht ausgeführt werden.</p>