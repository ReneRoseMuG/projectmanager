<h1>UC 05/01: Mitarbeiter anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Einen neuen Mitarbeiter als aktive Stammdatenressource im System anlegen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator oder Disponent.</li><li>Die erforderlichen Pflichtfelder sind bekannt und im Formular sichtbar.</li><li>Es besteht keine System-Sperre (z. B. Wartungsmodus).</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Mitarbeiterverwaltung.<br>2. Akteur wählt die Funktion „Mitarbeiter anlegen“.<br>3. System öffnet ein leeres Mitarbeiterformular im Modus „Neu“.<br>4. Akteur erfasst die erforderlichen Stammdaten.<br>5. Akteur speichert den neuen Mitarbeiter.<br>6. System validiert alle Pflichtfelder.<br>7. System legt den Mitarbeiter mit <code>is_active = true</code> an.<br>8. System persistiert den Datensatz.<br>9. System aktualisiert alle abhängigen Listen- und Auswahlansichten.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfeld fehlt oder ist ungültig →</li></ul>
<p>System speichert nicht und liefert Validierungsfehler (HTTP 400 bei API-Aufruf).</p>
<ul><li>Akteur ohne Berechtigung →</li></ul>
<p>System blockiert den Zugriff (HTTP 403).</p>
<ul><li>Technischer Persistenzfehler →</li></ul>
<p>System liefert Fehlerstatus (HTTP 500) und speichert keinen Datensatz.</p>
<ul><li>Zwei Akteure legen gleichzeitig Mitarbeiter mit identischen Stammdaten an →</li></ul>
<p>Beide Datensätze werden unabhängig voneinander gespeichert, da keine Eindeutigkeitsregel existiert.</p>
<h2>Ergebnis</h2>
<ul><li>Ein neuer Mitarbeiterdatensatz existiert persistent in der Datenbank.</li><li>Der Mitarbeiter besitzt standardmäßig <code>is_active = true</code>.</li><li>Der Mitarbeiter erscheint:</li><li>in der Mitarbeiterlistenansicht (Board und Tabelle),</li><li>in Dialoglisten zur Mitarbeiterzuweisung,</li><li>in Terminformularen zur Auswahl,</li><li>in Filtern, sofern aktive Mitarbeiter abgefragt werden.</li><li>Es existieren keine impliziten Beziehungen zu Terminen, Touren oder Teams.</li><li>Die Terminübersicht des Mitarbeiters ist initial leer.</li><li>Es wurden keine bestehenden Termine oder Projekte verändert.</li></ul>