<h1>UC 01/11: Denormalisierte Terminanzeige aktualisieren (Quersicht-Vertrag)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Sichten, die Termin-Informationen denormalisiert anzeigen, nach Änderungen an Kunden- oder Projektdaten stets die aktuellen Werte ausliefern. Es darf nicht vorkommen, dass ein Termin in einer Kalender- oder Listenansicht noch veraltete Kunden- oder Projektnamen anzeigt, obwohl die Stammdaten bereits geändert wurden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Mindestens ein Termin existiert.</li><li>Der Termin ist einem Kunden direkt zugeordnet (customer_id NOT NULL).</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Es existiert mindestens eine Sicht, die Kunden- oder Projektnamen denormalisiert ausliefert, zum Beispiel eine Kalender- oder Terminlisten-Projektion.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ändert Stammdaten, die in Terminprojektionen angezeigt werden, zum Beispiel den Namen eines Projekts oder den Namen eines Kunden.<br>2. Das System speichert die Stammdatenänderung.<br>3. Das System stellt sicher, dass alle Sichten, die Termine denormalisiert ausliefern, bei der nächsten Abfrage die aktualisierten Namen liefern.<br>4. Das System zeigt in diesen Sichten keine veralteten Namen mehr an.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht die Stammdatenänderung ab. Es werden keine Änderungen gespeichert, und es darf keine Sicht einen veränderten Namen anzeigen.</li><li>Fehler beim Speichern: Falls das Speichern der Stammdaten fehlschlägt, dürfen nachfolgende Terminprojektionen keine teilweise aktualisierten oder inkonsistenten Namen ausliefern.</li></ul>
<h2>Ergebnis</h2>
<p>Alle Terminprojektionen und Terminlisten, die Kunden- oder Projektnamen anzeigen, liefern die aktuellen Namen konsistent aus. Ein Termin zeigt in Kalender- und Listenansichten die aktuellen Kunden- und Projektinformationen. Der Kundenbezug ergibt sich direkt aus appointment.customer_id; der Projektbezug (sofern vorhanden) aus appointment.project_id.</p>