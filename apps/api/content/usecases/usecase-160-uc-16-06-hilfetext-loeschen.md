<h1>UC 16/06: Hilfetext löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Einen bestehenden Hilfetext dauerhaft aus dem System entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Hilfetext existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Admin-Rechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung.<br>2. Der Akteur wählt einen bestehenden Hilfetext aus.<br>3. Der Akteur löst die Löschaktion aus.<br>4. Das System prüft die Berechtigung des Akteurs.<br>5. Das System löscht den Hilfetext persistent.<br>6. Das System aktualisiert die Hilfetextliste.</p>
<h2>Alternativen</h2>
<ul><li>Der Hilfetext existiert nicht → Das System antwortet mit einem Fehlerstatus.</li><li>Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.</li><li>Technischer Fehler → Das System löscht nicht und liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Der Hilfetext ist nicht mehr im System vorhanden und kann über seinen help_key nicht mehr abgerufen werden.</p>