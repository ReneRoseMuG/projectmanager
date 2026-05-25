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
<ol><li>Der Akteur öffnet die Tourenübersicht.</li><li>Das System ermittelt alle Touren.</li><li>Das System zeigt je Tour Name und Farbe.</li><li>Das System rendert die Bedienung rollenabhängig:<ul><li>Disponent und Administrator sehen Aktionen zum Anlegen, Bearbeiten und Löschen.</li><li>Monteure sehen die Übersicht im Lesemodus.</li></ul></li><li>Das System stellt sicher, dass Mutationsaktionen für Monteure nicht gerendert und serverseitig blockiert werden.</li></ol>
<h2>Alternativen</h2>
<ul><li>Keine Touren vorhanden: Das System zeigt eine leere Übersicht mit Hinweis.</li><li>Direkter Zugriff auf eine Mutationsfunktion ohne Berechtigung: Das System blockiert serverseitig.</li></ul>
<h2>Ergebnis</h2>
<p>Die Tourübersicht ist vollständig sichtbar und entspricht der Rolle des Akteurs. Unzulässige Aktionen können nicht ausgeführt werden.</p>