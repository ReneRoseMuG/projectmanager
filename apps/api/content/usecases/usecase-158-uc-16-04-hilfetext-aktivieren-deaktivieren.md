<h1>UC 16/04: Hilfetext aktivieren/deaktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Einen bestehenden Hilfetext aktivieren oder deaktivieren, um seine Sichtbarkeit in der UI zu steuern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Hilfetext existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Admin-Rechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung.<br>2. Der Akteur wählt einen bestehenden Hilfetext aus.<br>3. Der Akteur ändert den Status auf „aktiv“ oder „inaktiv“.<br>4. Der Akteur speichert die Änderung.<br>5. Das System persistiert den neuen Status.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht den Vorgang ab → Der Status bleibt unverändert.</li><li>Der Hilfetext existiert nicht mehr → Das System antwortet mit einem Fehlerstatus.</li><li>Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.</li><li>Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Der Hilfetext ist entsprechend dem gesetzten Status in der UI abrufbar oder nicht abrufbar. Bestehende fachliche Daten bleiben unverändert.</p>