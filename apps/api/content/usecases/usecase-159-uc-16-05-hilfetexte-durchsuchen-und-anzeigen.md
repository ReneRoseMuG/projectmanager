<h1>UC 16/05: Hilfetexte durchsuchen und anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Hilfetexte anhand von Suchkriterien auffinden und zur weiteren Bearbeitung anzeigen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Admin-Rechte.</li><li>Es existieren Hilfetexte im System.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung.<br>2. Das System lädt die Liste der Hilfetexte.<br>3. Der Akteur gibt ein Suchkriterium ein, beispielsweise help_key oder Titel.<br>4. Das System filtert die Hilfetexte serverseitig anhand des eingegebenen Suchkriteriums.<br>5. Das System zeigt die gefilterte Trefferliste an.<br>6. Der Akteur kann einen Hilfetext aus der Liste auswählen, um dessen Detailansicht zu öffnen.</p>
<h2>Alternativen</h2>
<ul><li>Keine Hilfetexte vorhanden → Das System zeigt eine leere Liste an.</li><li>Suchkriterium liefert keine Treffer → Das System zeigt eine leere Trefferliste an.</li><li>Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.</li><li>Technischer Fehler → Das System liefert einen Fehlerstatus zurück und zeigt keine oder eine unvollständige Liste an.</li></ul>
<h2>Ergebnis</h2>
<p>Der Akteur erhält eine gefilterte und konsistente Übersicht der Hilfetexte und kann einzelne Datensätze zur weiteren Bearbeitung auswählen.</p>