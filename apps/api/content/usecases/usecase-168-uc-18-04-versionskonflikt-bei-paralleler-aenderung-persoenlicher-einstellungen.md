<h1>UC 18/04: Versionskonflikt bei paralleler Änderung persönlicher Einstellungen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-18-user-preferences.md">FT (18): User Preferences</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser, Admin</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass parallele Änderungen persönlicher Einstellungen desselben Akteurs nicht zu stillen Überschreibungen führen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Für den Akteur existieren gespeicherte persönliche Einstellungen.</li><li>Die Einstellungen besitzen eine gültige Versionskennung.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet in Browser A den Bereich für persönliche Einstellungen.<br>2. Das System übermittelt die aktuelle Versionskennung der Einstellungen.<br>3. Der Akteur öffnet in Browser B ebenfalls den Bereich für persönliche Einstellungen.<br>4. Browser A speichert eine Änderung der Einstellungen.<br>5. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.<br>6. Browser B speichert eine Änderung auf Basis der veralteten Versionskennung.<br>7. Das System erkennt die veraltete Versionskennung.<br>8. Das System blockiert die Speicherung mit einem Konfliktstatus.<br>9. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.</li><li>Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Es entstehen keine Lost Updates. Die persönlichen Einstellungen entsprechen stets dem zuletzt erfolgreich gespeicherten Zustand des Akteurs.</p>