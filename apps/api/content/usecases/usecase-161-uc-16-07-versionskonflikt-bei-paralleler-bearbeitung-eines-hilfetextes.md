<h1>UC 16/07: Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass parallele Änderungen an einem Hilfetext nicht zu stillen Überschreibungen führen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Hilfetext existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Admin-Rechte.</li><li>Der Hilfetext besitzt eine gültige Versionskennung.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet einen bestehenden Hilfetext zur Bearbeitung.<br>2. Das System übermittelt die aktuelle Versionskennung des Hilfetextes.<br>3. Ein zweiter Akteur speichert zwischenzeitlich eine Änderung desselben Hilfetextes.<br>4. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.<br>5. Der erste Akteur speichert auf Basis der veralteten Versionskennung.<br>6. Das System erkennt die veraltete Versionskennung.<br>7. Das System blockiert die Speicherung mit einem Konfliktstatus.<br>8. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.</li><li>Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Es entstehen keine Lost Updates. Der Hilfetext bleibt konsistent und entspricht stets dem zuletzt erfolgreich gespeicherten Zustand.</p>