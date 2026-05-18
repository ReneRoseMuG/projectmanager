<h1>UC 06/01: Tag Anmerkungen bei Projektbeschreibung automatisch setzen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-06-automatische-regeln.md">FT (06): Automatische Regeln</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Projekte mit Beschreibung automatisch mit dem Tag „Anmerkungen“ kennzeichnen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Projekt wird gespeichert.</li><li>Das Projekt enthält eine Beschreibung.</li><li>Der Tag „Anmerkungen“ fehlt am Projekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur speichert ein Projekt.<br>2. Das System prüft, ob eine Projektbeschreibung vorhanden ist.<br>3. Das System prüft, ob der Tag „Anmerkungen“ bereits gesetzt ist.<br>4. Falls der Tag fehlt, setzt das System ihn automatisch.<br>5. Das System speichert das Projekt mit aktualisierter Tag-Zuordnung.</p>
<h2>Alternativen</h2>
<ul><li>Keine Beschreibung vorhanden: Das System setzt keinen Tag.</li><li>Der Tag ist bereits vorhanden: Das System nimmt keine zusätzliche Änderung vor.</li></ul>
<h2>Ergebnis</h2>
<p>Projekte mit Beschreibung tragen den Tag „Anmerkungen“, ohne dass eine separate Benachrichtigung oder Entscheidung erforderlich ist.</p>