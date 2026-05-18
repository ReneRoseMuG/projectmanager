<h1>UC 01/07: Mitarbeiter über Team zuweisen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Mehrere Mitarbeiter in einem Schritt einem Termin zuweisen, indem ein Team als Einfügehilfe verwendet wird. Das Team selbst wird dabei nicht am Termin gespeichert, sondern nur die daraus resultierende konkrete Mitarbeiterliste des Termins.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Das Team existiert und hat mindestens einen zugeordneten Mitarbeiter.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur wählt ein Team als Einfügehilfe aus.<br>3. Das System übernimmt die Mitarbeiter des Teams in die Mitarbeiterliste des Termins.<br>4. Das System speichert keine Teamzuordnung am Termin, sondern ausschließlich die konkrete Mitarbeiterliste.<br>5. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.<br>1. Mitarbeiter dürfen keine überschneidenden Termine haben.<br>2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.<br>3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt, also auch durch die Team-Übernahme.<br>6. Das System speichert den Termin.<br>7. Das System aktualisiert die Darstellung in allen relevanten Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Es werden keine Änderungen gespeichert und es entstehen keine Teilzustände, insbesondere keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter.</li><li>Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.</li><li>Team ohne Mitarbeiter: Falls das gewählte Team keine Mitarbeiter enthält, muss das System den Vorgang blockieren und eine eindeutige Fehlermeldung anzeigen.</li></ul>
<h2>Ergebnis</h2>
<p>Die Mitarbeiter des ausgewählten Teams sind dem Termin zugeordnet und als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar. Am Termin ist keine Teamzuordnung gespeichert, sondern ausschließlich die daraus resultierende Mitarbeiterliste.</p>
<p>Für alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Der Termin erscheint in den projektbezogenen Terminsichten und, sofern vorhanden, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.</p>