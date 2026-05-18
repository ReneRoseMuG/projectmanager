<h1>UC 02/18: Race Condition bei Projektlöschung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass eine Projektlöschung nicht zu inkonsistenten Zuständen führt, wenn parallel ein Termin für dieses Projekt angelegt wird.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte gemäß seiner Rolle.</li><li>Dem Projekt sind zum Zeitpunkt der Löschprüfung keine Termine zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur initiiert die Löschung eines Projekts gemäß UC 02/08.<br>2. System prüft, ob dem Projekt Termine zugeordnet sind.<br>3. Zwischen Prüfung und tatsächlicher Löschung wird serverseitig eine atomare Konsistenzprüfung (write-lock) durchgeführt.<br>4. Falls währenddessen ein Termin für dieses Projekt angelegt wurde, erkennt das System die neue Referenz.<br>5. System bricht die Löschung ab und antwortet mit HTTP 409 BUSINESS_CONFLICT.<br>6. Nur wenn keine Terminreferenz existiert, löscht das System das Projekt vollständig.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Löschrechte → HTTP 403.</li><li>Projekt existiert nicht → HTTP 404.</li><li>Keine parallele Terminanlage → Löschung erfolgt regulär.</li></ul>
<h2>Ergebnis</h2>
<p>Es entsteht kein inkonsistenter Zustand zwischen Projekt- und Terminobjekten.</p>
<p>Ein Projekt mit Terminreferenz kann nicht gelöscht werden.</p>
<p>Die referenzielle Integrität bleibt jederzeit gewahrt.</p>