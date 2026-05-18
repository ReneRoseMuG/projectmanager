<h1>UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Zuordnungen zwischen Termin und Mitarbeitern deterministisch und konsistent bleiben. Insbesondere dürfen keine Duplikate in der Join-Tabelle Termin–Mitarbeiter entstehen, und wiederholte Eingaben oder mehrfache Anwendung von Einfügehilfen dürfen nicht zu instabilen oder inkonsistenten Mitarbeiterlisten führen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Projekt zugeordnet.</li><li>Es existieren Mitarbeiter.</li><li>Optional: Es existiert ein Team mit mindestens einem Mitarbeiter.</li><li>Optional: Es existiert eine Tour mit mindestens einem Mitarbeiter.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur führt eine oder mehrere Zuweisungsaktionen aus, zum Beispiel:<br>1. denselben Mitarbeiter mehrfach hinzufügen,<br>2. ein Team als Einfügehilfe mehrfach anwenden,<br>3. eine Tour zuweisen oder die Tour wechseln,<br>4. Mitarbeiter manuell hinzufügen und anschließend wieder entfernen.<br>3. Das System aktualisiert die Mitarbeiterliste des Termins gemäß den fachlichen Regeln.<br>4. Das System speichert den Termin.<br>5. Das System stellt sicher, dass die Persistenz konsistent ist, insbesondere in der Join-Tabelle Termin–Mitarbeiter.</p>
<h2>Alternativen</h2>
<ul><li>Wiederholte Auswahl desselben Mitarbeiters: Wenn der Akteur denselben Mitarbeiter erneut auswählt, muss das System entweder die Auswahl verhindern oder die Aktion als No-op behandeln. In keinem Fall darf ein Duplikat entstehen.</li><li>Mehrfaches Anwenden derselben Einfügehilfe: Wenn Team oder Tour wiederholt angewendet wird, muss das Ergebnis deterministisch bleiben, ohne doppelte Join-Einträge und ohne instabile Reihenfolgen, und die Mitarbeiterliste muss den definierten Regeln entsprechen.</li><li>Abbruch: Wenn der Akteur abbricht, werden keine Änderungen gespeichert und es entstehen keine Zwischenzustände in der Join-Tabelle.</li></ul>
<h2>Ergebnis</h2>
<p>Die Mitarbeiterzuordnungen eines Termins sind konsistent und duplikatfrei. Für jede Kombination aus Termin und Mitarbeiter existiert höchstens ein Join-Eintrag. Wiederholte Eingaben, Mehrfachklicks oder erneute Anwendung von Einfügehilfen erzeugen keine inkonsistenten Zustände. Die abhängigen Sichten zeigen denselben konsistenten Zustand, der in der Join-Tabelle persistiert ist.</p>