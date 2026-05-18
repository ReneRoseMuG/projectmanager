<h1>UC 01/08: Mitarbeiter einem Termin zuweisen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einem bestehenden Termin einen einzelnen Mitarbeiter manuell zuweisen, sodass der Mitarbeiter im Termin als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in allen relevanten Sichten für diesen Mitarbeiter sichtbar ist, sofern keine Überschneidung entsteht.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Der Mitarbeiter existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur klickt im Bereich „Zugeordnete Mitarbeiter“ auf „+“ (Mitarbeiter hinzufügen) oder nutzt die entsprechende Auswahlfunktion.<br>3. Der Akteur wählt einen Mitarbeiter aus der Auswahlliste aus.<br>4. Das System fügt den Mitarbeiter der Mitarbeiterliste des Termins hinzu.<br>5. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.<br>1. Mitarbeiter dürfen keine überschneidenden Termine haben.<br>2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.<br>3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt, also auch durch das manuelle Hinzufügen.<br>6. Das System speichert den Termin.<br>7. Das System aktualisiert die Darstellung in allen relevanten Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Der Mitarbeiter wird nicht zugeordnet, es werden keine Änderungen gespeichert und es entstehen keine Teilzustände, insbesondere keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter.</li><li>Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.</li><li>Mitarbeiter bereits zugeordnet: Wenn der ausgewählte Mitarbeiter bereits dem Termin zugeordnet ist, darf das System keinen Duplikat-Eintrag erzeugen und muss entweder die Auswahl verhindern oder eine eindeutige Meldung anzeigen.</li></ul>
<h2>Ergebnis</h2>
<p>Der Mitarbeiter ist dem Termin zugeordnet und erscheint im Termin in der Liste der zugeordneten Mitarbeiter. Die Zuordnung ist als Eintrag in der Join-Tabelle Termin–Mitarbeiter abrufbar, ohne Duplikate.</p>
<p>Der Termin ist für diesen Mitarbeiter in der Mitarbeiter-Terminliste sichtbar. Der Termin ist außerdem weiterhin in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.</p>