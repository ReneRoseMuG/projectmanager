<h1>UC 01/19: Notiz von Termin entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine Notiz vom Termin entfernen, ohne dass dies Auswirkungen auf andere Termin-Daten oder andere Notizen hat.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Dem Termin ist mindestens eine Notiz zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet einen bestehenden Termin im Terminformular.<br>2. Der Akteur navigiert zum Bereich „Notizen&quot;.<br>3. Der Akteur wählt eine Notiz und klickt auf „Entfernen&quot; oder eine Delete-Action.<br>4. Optional: Das System fordert eine Bestätigung an.<br>5. Der Akteur bestätigt das Löschen.<br>6. Das System entfernt die Zuordnung zwischen Termin und Notiz.<br>7. Das System aktualisiert die Notizenliste und die Notiz ist nicht mehr sichtbar.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht ab. Die Notiz bleibt dem Termin zugeordnet.</li></ul>
<h2>Ergebnis</h2>
<p>Die Notiz ist vom Termin entfernt. Die Notiz selbst bleibt in der Datenbank bestehen (sofern sie nicht anderswo zugeordnet ist). Der Termin und alle anderen Termine sind unverändert.</p>