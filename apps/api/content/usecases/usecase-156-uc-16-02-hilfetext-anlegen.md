<h1>UC 16/02: Hilfetext anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen neuen Hilfetext erstellen, um einen UI-Kontext erklärbar zu machen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Admin-Rechte.</li><li>Der gewünschte help_key ist noch nicht vergeben.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung.<br>2. Der Akteur wählt die Funktion „Hilfetext anlegen“.<br>3. Der Akteur erfasst help_key, Titel und Markdown-Inhalt.<br>4. Der Akteur legt fest, ob der Hilfetext aktiv ist.<br>5. Der Akteur speichert den Datensatz.<br>6. Das System validiert Pflichtfelder und Datentypen.<br>7. Das System prüft serverseitig die Eindeutigkeit des help_key.<br>8. Bei erfolgreicher Validierung speichert das System den Hilfetext persistent.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfeld fehlt → Das System lehnt die Speicherung mit Validierungsfehler ab.</li><li>help_key existiert bereits → Das System blockiert die Speicherung und fordert zur Korrektur auf.</li><li>Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.</li><li>Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Ein neuer Hilfetext ist persistent gespeichert und über seinen help_key referenzierbar. Der Hilfetext ist je nach gesetztem Status in der UI abrufbar oder nicht abrufbar.</p>