<h1>UC 05/12: Rollenverletzung bei API-Direktzugriff</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Nicht berechtigter Benutzer (z. B. Leser)</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass unberechtigte Rollen keine schreibenden Aktionen auf Mitarbeiter ausführen können.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Mitarbeiter existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt keine Änderungs- oder Adminrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur sendet direkt einen API-Request:</p>
<ul><li>POST <code>/employees</code></li><li>PATCH <code>/employees/:id</code></li><li>DELETE <code>/employees/:id</code></li><li>PATCH <code>/employees/:id/active</code></li></ul>
<p>2. System prüft Rollenberechtigung.<br>3. System erkennt fehlende Berechtigung.<br>4. System blockiert die Operation.</p>
<h2>Alternativen</h2>
<ul><li>Akteur ist nicht authentifiziert →</li></ul>
<p>HTTP 401 Unauthorized.</p>
<ul><li>Technischer Fehler →</li></ul>
<p>HTTP 500.</p>
<h2>Ergebnis</h2>
<ul><li>Keine Datenänderung erfolgt.</li><li>System antwortet mit HTTP 403 Forbidden.</li><li>Der Mitarbeiterbestand bleibt unverändert.</li><li>Es entstehen keine inkonsistenten Zustände.</li></ul>