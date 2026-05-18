<h1>UC 06/00: Termin stornieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-06-automatische-regeln.md">FT (06): Automatische Regeln</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen Termin unwiderruflich als storniert markieren, den Projektbetrag auf 0 setzen und den Termin aus Reports ausschließen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist noch nicht storniert.</li><li>Der Akteur besitzt Schreibrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur löst die Aktion „Stornieren“ aus.<br>2. Das System fordert eine Bestätigung an.<br>3. Der Akteur bestätigt die Stornierung.<br>4. Das System markiert den Termin als storniert.<br>5. Das System entfernt Mitarbeiterzuweisungen.<br>6. Das System setzt den Projektbetrag auf 0.<br>7. Das System aktualisiert die betroffenen Ansichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Der Termin bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist storniert, befindet sich im Systemzustand „Storniert“, ist nur eingeschränkt bearbeitbar und wird in Reports nicht mehr berücksichtigt.</p>