<h1>UC 01/10: Termin in abhängigen Sichten anzeigen (Quersicht-Vertrag)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass nach jeder terminrelevanten Aktion die abhängigen Sichten, die ihre Terminlisten über API-Endpunkte beziehen, konsistent sind. Ein Termin muss dort erscheinen oder verschwinden, wo es fachlich aus den Beziehungen folgt, damit Projekt-, Kunden-, Mitarbeiter- und Tour-Formulare stets den gleichen Datenstand wie der Kalender widerspiegeln.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Termin existiert oder wird gerade neu angelegt.</li><li>Der Termin ist einem Kunden direkt zugeordnet (customer_id NOT NULL).</li><li>Optional: Der Termin ist einem Projekt zugeordnet; in diesem Fall gilt appointment.customer_id == project.customer_id.</li><li>Optional: Dem Termin sind Mitarbeiter zugeordnet.</li><li>Optional: Dem Termin ist eine Tour zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur führt eine terminrelevante Aktion aus, zum Beispiel Termin anlegen, Termin bearbeiten, Termin verschieben, Mitarbeiter zuweisen oder entfernen, Team als Einfügehilfe verwenden, Tour zuweisen oder Tour entfernen.<br>2. Das System speichert die Änderung vollständig und atomar, sodass keine Teilzustände entstehen, insbesondere keine halbfertigen Join-Einträge Termin–Mitarbeiter.<br>3. Das System aktualisiert alle abhängigen Sichten, die Termine anzeigen.<br>4. Das System stellt sicher, dass die abhängigen Sichten denselben fachlichen Zustand ausliefern, der sich aus den Beziehungen ergibt.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht die Aktion ab. Es werden keine Änderungen gespeichert, und folglich dürfen sich auch keine abhängigen Sichten ändern.</li><li>Blockade durch Konflikt oder Regelverletzung: Wenn eine Aktion wegen Überschneidung oder anderer Regeln blockiert wird, wird nichts gespeichert, und keine abhängige Sicht darf einen veränderten Zustand anzeigen.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist in allen relevanten Sichten konsistent sichtbar oder nicht sichtbar, abhängig vom Ergebnis der Aktion.</p>
<p>Das bedeutet insbesondere: Das Mitarbeiterformular zeigt den Termin in der Mitarbeiter-Terminliste für alle dem Termin aktuell zugeordneten Mitarbeiter, und zeigt ihn nicht für Mitarbeiter, die nicht (mehr) zugeordnet sind. Das Projektformular zeigt den Termin in der Projekt-Terminliste des zugeordneten Projekts. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, dem der Termin direkt zugeordnet ist (appointment.customer_id). Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, ist der Termin in dieser Tour-Sicht nicht mehr sichtbar.</p>