<h1>UC 18/01: Persönliche Einstellung ändern</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-18-user-preferences.md">FT (18): User Preferences</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser, Admin</p>
<h2>Ziel</h2>
<p>Eine persönliche Einstellung ändern, sodass diese ausschließlich für den jeweiligen Akteur wirksam ist.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Die persönliche Einstellung ist im System definiert.</li><li>Für den Akteur existiert ein gültiger Benutzerkontext.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Bereich für persönliche Einstellungen.<br>2. Das System lädt die aktuell gespeicherten Einstellungen des Akteurs.<br>3. Der Akteur ändert eine oder mehrere Einstellungen.<br>4. Der Akteur speichert die Änderungen.<br>5. Das System validiert Datentyp und Wertebereich der geänderten Einstellungen.<br>6. Das System speichert die Einstellungen persistent und ordnet sie eindeutig dem Akteur zu.<br>7. Das System bestätigt die erfolgreiche Speicherung.<br>8. Die geänderte Einstellung wird bei zukünftigen Aktionen des Akteurs angewendet.</p>
<h2>Alternativen</h2>
<ul><li>Ungültiger Wert → Das System lehnt die Speicherung mit Validierungsfehler ab.</li><li>Der Akteur bricht ab → Es erfolgt keine Änderung.</li><li>Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Die geänderte Einstellung ist persistent gespeichert und wirkt ausschließlich für den betreffenden Akteur. Andere Akteure sind nicht betroffen.</p>