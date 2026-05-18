<h1>UC 01/09: Mitarbeiter von einem Termin entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen einem Termin zugeordneten Mitarbeiter wieder entfernen, sodass der Mitarbeiter im Termin nicht mehr als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in den relevanten Sichten dieses Mitarbeiters nicht mehr auftaucht.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Dem Termin ist mindestens ein Mitarbeiter zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur entfernt im Bereich „Zugeordnete Mitarbeiter“ einen konkreten Mitarbeiter, zum Beispiel über eine Entfernen-Aktion am Listeneintrag.<br>3. Das System entfernt den Mitarbeiter aus der Mitarbeiterliste des Termins.<br>4. Das System speichert den Termin.<br>5. Das System aktualisiert die Darstellung in allen relevanten Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.</li><li>Mitarbeiter nicht (mehr) zugeordnet: Wenn der Mitarbeiter zum Zeitpunkt des Speicherns nicht mehr zugeordnet ist, muss das System sicherstellen, dass kein Fehler durch inkonsistente Zwischenzustände entsteht, und der Termin bleibt konsistent gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Mitarbeiter ist dem Termin nicht mehr zugeordnet und erscheint im Termin nicht mehr in der Liste der zugeordneten Mitarbeiter. Die entsprechende Zuordnung ist in der Join-Tabelle Termin–Mitarbeiter entfernt.</p>
<p>Der Termin ist für diesen Mitarbeiter nicht mehr in der Mitarbeiter-Terminliste sichtbar. Für andere weiterhin zugeordnete Mitarbeiter bleibt der Termin sichtbar. Der Termin bleibt in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.</p>