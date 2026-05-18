<h1>UC 09/16: Statusänderung des Kunden während Notiz- oder Attachment-Operation</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass parallele Statusänderungen eines Kunden (Deaktivieren / Löschen) keine inkonsistenten Zustände bei Notiz- oder Attachment-Operationen erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Kunde existiert.</li><li>Mindestens zwei Akteure sind gleichzeitig authentifiziert.</li><li>Einer der Akteure besitzt Administratorrechte.</li><li>Der Kunde ist initial aktiv (<code>is_active = true</code>).</li></ul>
<h2>Ablauf</h2>
<p>---</p>
<h3>Ablauf – Beispiel 1: Notiz hinzufügen während Deaktivierung</h3>
<p>1. Akteur A (Disponent) öffnet die Kundendetailansicht und beginnt, eine Notiz zu erstellen.<br>2. Akteur B (Administrator) deaktiviert den Kunden.<br>3. Das System persistiert <code>is_active = false</code> und erhöht die Versionskennung.<br>4. Akteur A speichert die Notiz.<br>5. Das System prüft:</p>
<ul><li>Existenz des Kunden,</li><li>aktuellen Status,</li><li>Versionskonsistenz des Parent-Objekts.</li></ul>
<p>6. Das System erlaubt die Notizspeicherung, da Deaktivierung keine fachliche Sperre für bestehende Stammdatenoperationen darstellt.</p>
<p>---</p>
<h3>Ablauf – Beispiel 2: Notiz hinzufügen während Löschung</h3>
<p>1. Akteur A beginnt mit dem Erstellen einer Notiz.<br>2. Akteur B löscht den Kunden gemäß UC 13.<br>3. Das System entfernt den Kundendatensatz.<br>4. Akteur A speichert die Notiz.<br>5. Das System prüft die Parent-Existenz.<br>6. Das System erkennt, dass der Kunde nicht mehr existiert.<br>7. Das System blockiert mit 404 oder 409.</p>
<p>---</p>
<h3>Ablauf – Beispiel 3: Attachment-Upload während Deaktivierung</h3>
<p>1. Akteur A startet einen Upload.<br>2. Akteur B deaktiviert den Kunden.<br>3. Das System persistiert <code>is_active = false</code>.<br>4. Der Upload wird abgeschlossen.<br>5. Das System erlaubt die Persistierung des Attachment-Datensatzes, da Deaktivierung keine Parent-Löschung darstellt.</p>
<p>---</p>
<h3>Ablauf – Beispiel 4: Attachment-Upload während Löschung</h3>
<p>1. Akteur A startet Upload.<br>2. Akteur B löscht den Kunden.<br>3. Das System entfernt den Kundendatensatz.<br>4. Der Upload versucht, den Attachment-Datensatz zu persistieren.<br>5. Das System prüft die Parent-Existenz.<br>6. Das System blockiert mit 404 oder 409.</p>
<p>---</p>
<h3>Konsistenzregeln</h3>
<ul><li>Notiz- und Attachment-Operationen sind nur zulässig, wenn der Parent-Kunde existiert.</li><li>Deaktivierung verhindert keine fachlich zulässigen Operationen auf bestehende Kunden.</li><li>Löschung eines Kunden verhindert jede weitere Operation auf diesem Parent.</li><li>Es dürfen keine verwaisten Notizen oder Attachments entstehen.</li><li>Referenzielle Integrität ist serverseitig garantiert.</li></ul>
<h2>Alternativen</h2>
<ul><li>Versionskonflikt → System blockiert mit 409.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Es entstehen keine verwaisten Datensätze.</li><li>Deaktivierung und Löschung sind sauber voneinander abgegrenzt.</li><li>Parent-Integrität bleibt auch bei parallelen Operationen gewahrt.</li></ul>