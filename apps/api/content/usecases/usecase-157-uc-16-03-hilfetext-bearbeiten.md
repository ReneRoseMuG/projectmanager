<h1>UC 16/03: Hilfetext bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Einen bestehenden Hilfetext inhaltlich aktualisieren.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Hilfetext existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Admin-Rechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung.<br>2. Der Akteur wählt einen bestehenden Hilfetext aus der Liste aus.<br>3. Das System lädt die aktuellen Daten des Hilfetextes.<br>4. Der Akteur ändert Titel und/oder Markdown-Inhalt.<br>5. Der Akteur speichert die Änderungen.<br>6. Das System validiert die Eingaben.<br>7. Das System speichert die aktualisierten Daten persistent.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht den Vorgang ab → Es erfolgt keine Änderung.</li><li>Der Hilfetext existiert nicht mehr → Das System antwortet mit einem Fehlerstatus.</li><li>Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.</li><li>Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Der Hilfetext ist aktualisiert. Bei zukünftigen Abrufen über den help_key wird die neue Version angezeigt.</p>