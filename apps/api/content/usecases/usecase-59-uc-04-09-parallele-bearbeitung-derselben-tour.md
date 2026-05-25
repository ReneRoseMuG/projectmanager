<h1>UC 04/09: Parallele Bearbeitung derselben Tour</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Stille Überschreibungen bei paralleler Bearbeitung derselben Tour verhindern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Zwei berechtigte Akteure bearbeiten dieselbe Tour gleichzeitig.</li></ul>
<h2>Ablauf</h2>
<ol><li>Akteur A öffnet die Tour.</li><li>Akteur B öffnet dieselbe Tour.</li><li>Akteur A ändert die Farbe und speichert.</li><li>Das System speichert die Änderung und erhöht die Version.</li><li>Akteur B speichert auf Basis des alten Versionsstands.</li><li>Das System erkennt den Versionskonflikt und blockiert die Speicherung.</li></ol>
<h2>Alternativen</h2>
<ul><li>Akteur B speichert zuerst: Akteur A erhält bei späterem Speichern den Versionskonflikt.</li><li>Einer der Akteure bricht ab: Es wird nur die bestätigte Änderung gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Keine Änderung überschreibt still eine andere. Die Tour bleibt in einem konsistenten Zustand.</p>