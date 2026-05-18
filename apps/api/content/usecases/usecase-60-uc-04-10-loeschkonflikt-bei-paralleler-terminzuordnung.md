<h1>UC 04/10: Löschkonflikt bei paralleler Terminzuordnung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine Tour nicht löschen, wenn ihr parallel ein Termin zugeordnet wird.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Tour sind zunächst keine Termine zugeordnet.</li><li>Zwei berechtigte Akteure arbeiten parallel.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur A initiiert die Löschung der Tour.<br>2. Akteur B ordnet der Tour parallel einen Termin zu.<br>3. Das System prüft beim Löschen erneut, ob Termine vorhanden sind.<br>4. Das System erkennt die neue Terminzuordnung.<br>5. Das System blockiert die Löschung.</p>
<h2>Alternativen</h2>
<ul><li>Die Löschung ist bereits abgeschlossen, bevor Akteur B speichert: Die Terminzuordnung schlägt fehl.</li><li>Akteur A bricht die Löschung ab: Die Tour bleibt erhalten.</li></ul>
<h2>Ergebnis</h2>
<p>Eine Tour mit Terminreferenz wird nicht gelöscht. Verwaiste Terminreferenzen entstehen nicht.</p>