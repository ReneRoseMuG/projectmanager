<h1>UC 06/04: Termin auf Parkplatz setzen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-06-automatische-regeln.md">FT (06): Automatische Regeln</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen Termin auf die Systemtour „Parkplatz“ setzen, den Zustand „Geparkt“ setzen und Mitarbeiter entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin liegt noch nicht auf dem Parkplatz.</li><li>Der Termin ist nicht storniert.</li><li>Der Akteur besitzt Schreibrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur löst die Aktion „Parken“ aus.<br>2. Das System fordert eine Bestätigung an.<br>3. Der Akteur bestätigt die Aktion.<br>4. Das System ordnet den Termin der Tour „Parkplatz“ zu.<br>5. Das System setzt den Zustand „Geparkt“.<br>6. Das System entfernt vorhandene Mitarbeiterzuweisungen.<br>7. Das System aktualisiert die betroffenen Ansichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Der Termin bleibt unverändert.</li><li>Der Termin liegt bereits auf dem Parkplatz: Die Aktion ist nicht verfügbar.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist der Tour „Parkplatz“ zugeordnet, trägt den Zustand „Geparkt“ und besitzt keine Mitarbeiterzuweisungen.</p>