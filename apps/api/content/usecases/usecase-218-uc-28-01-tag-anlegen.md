<h1>UC 28/01: Tag anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-28-universelles-tagging-system.md">FT (28): Universelles Tagging-System</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen neuen Tag in der zentralen Tag-Verwaltung anlegen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist als Administrator angemeldet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet die Tag-Verwaltung.<br>2. Der Administrator klickt auf „Neuer Tag“.<br>3. Der Administrator gibt Name und Farbe ein.<br>4. Der Administrator speichert.<br>5. Das System legt den Tag mit <code>is_default = false</code> an.</p>
<h2>Alternativen</h2>
<ul><li>Der Name ist bereits vergeben: Das System zeigt einen Validierungsfehler und speichert nicht.</li></ul>
<h2>Ergebnis</h2>
<p>Der Tag ist in <code>tags</code> gespeichert und steht an allen Domänenobjekten zur Zuweisung bereit.</p>