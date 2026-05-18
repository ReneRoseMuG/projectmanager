<h1>UC 08/04: Fachliche Änderung erzeugt Journal-Eintrag</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-08-journal-aenderungshistorie.md">FT (08): Journal / Änderungshistorie</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Eine erfolgreiche Mutation automatisch dokumentieren.</p>
<h2>Vorbedingungen</h2>
<ul><li>Eine mutierende Operation auf einer journalisierten Entität wurde erfolgreich abgeschlossen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur speichert eine fachliche Änderung.<br>2. Das System schreibt einen Journal-Eintrag mit Beschreibung, Akteur und Zeit.<br>3. Das System ergänzt die relevanten Kontextbezüge.<br>4. Das System stellt den Eintrag global und in betroffenen Detailansichten bereit.</p>
<h2>Alternativen</h2>
<p>Keine.</p>
<h2>Ergebnis</h2>
<p>Die fachliche Änderung ist historisch nachvollziehbar.</p>