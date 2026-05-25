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
<ol><li>Akteur öffnet die Mitarbeiterverwaltung.</li><li>Akteur wählt die Funktion „Mitarbeiter anlegen“.</li><li>System öffnet ein leeres Mitarbeiterformular im Modus „Neu“.</li><li>Akteur erfasst die erforderlichen Stammdaten.</li><li>Akteur speichert den neuen Mitarbeiter.</li><li>System validiert alle Pflichtfelder.</li><li>System legt den Mitarbeiter mit <code>is_active = true</code> an.</li><li>System persistiert den Datensatz.</li><li>System aktualisiert alle abhängigen Listen- und Auswahlansichten.</li></ol>
<h2>Alternativen</h2>
<ul><li>Pflichtfeld fehlt oder ist ungültig → System speichert nicht und liefert Validierungsfehler (HTTP 400 bei API-Aufruf).</li><li>Akteur ohne Berechtigung → System blockiert den Zugriff (HTTP 403).</li><li>Technischer Persistenzfehler → System liefert Fehlerstatus (HTTP 500) und speichert keinen Datensatz.</li><li>Zwei Akteure legen gleichzeitig Mitarbeiter mit identischen Stammdaten an → Beide Datensätze werden unabhängig voneinander gespeichert, da keine Eindeutigkeitsregel existiert.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Ein neuer Mitarbeiterdatensatz existiert persistent in der Datenbank.</li><li>Der Mitarbeiter besitzt standardmäßig <code>is_active = true</code>.</li><li>Der Mitarbeiter erscheint:<ul><li>in der Mitarbeiterlistenansicht (Board und Tabelle),</li><li>in Dialoglisten zur Mitarbeiterzuweisung,</li><li>in Terminformularen zur Auswahl,</li><li>in Filtern, sofern aktive Mitarbeiter abgefragt werden.</li></ul></li><li>Es existieren keine impliziten Beziehungen zu Terminen, Touren oder Teams.</li><li>Die Terminübersicht des Mitarbeiters ist initial leer.</li><li>Es wurden keine bestehenden Termine oder Projekte verändert.</li></ul>