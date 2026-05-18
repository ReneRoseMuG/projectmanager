<h1>UC 21/14: Extraktion bei zwischenzeitlich gelöschtem Parent-Objekt</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass eine laufende Extraktion nicht zu inkonsistenten Referenzen führt, wenn das aufrufende Objekt zwischenzeitlich gelöscht wurde.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsdialog ist geöffnet.</li><li>Das zugrunde liegende Projekt- oder Terminformular wurde in einem anderen Browser oder durch einen anderen Akteur gelöscht oder geschlossen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur bestätigt im Extraktionsdialog die Übernahme der Daten.<br>2. Das System prüft vor Persistierung die Existenz des referenzierten Parent-Objekts.<br>3. Das System erkennt, dass das Parent-Objekt nicht mehr existiert.<br>4. Das System bricht den Vorgang ab.<br>5. Das System informiert den Akteur über den Konflikt.</p>
<h2>Alternativen</h2>
<ul><li>Das Parent-Objekt existiert, aber wurde verändert → Das System prüft Versionsinformationen und behandelt einen Konflikt gemäß den jeweiligen Domänenregeln.</li></ul>
<h2>Ergebnis</h2>
<p>Es werden keine Daten mit ungültigen oder nicht existierenden Referenzen gespeichert. Die Systemkonsistenz bleibt gewahrt.</p>