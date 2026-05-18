<h1>UC 09/19: Notiz von Kunde entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine Notiz vom Kunden entfernen, ohne dass dies Auswirkungen auf andere Kunden-Daten oder andere Notizen hat.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Dem Kunden ist mindestens eine Notiz zugeordnet.</li><li>Der Akteur besitzt Änderungsrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet einen bestehenden Kunden im Kundenformular.<br>2. Der Akteur navigiert zum Bereich „Notizen&quot;.<br>3. Der Akteur wählt eine Notiz und klickt auf „Entfernen&quot; oder eine Delete-Action.<br>4. Optional: Das System fordert eine Bestätigung an.<br>5. Der Akteur bestätigt das Löschen.<br>6. Das System entfernt die Zuordnung zwischen Kunde und Notiz.<br>7. Das System aktualisiert die Notizenliste und die Notiz ist nicht mehr sichtbar.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht ab. Die Notiz bleibt dem Kunden zugeordnet.</li></ul>
<h2>Ergebnis</h2>
<p>Die Notiz ist vom Kunden entfernt. Die Notiz selbst bleibt in der Datenbank bestehen (sofern sie nicht anderswo zugeordnet ist). Der Kunde und alle anderen Kunden sind unverändert.</p>