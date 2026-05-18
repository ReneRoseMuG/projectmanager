<h1>UC 01/17: Notiz an Termin anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen neuen Termin mit einer oder mehreren Notizen dokumentieren, um Informationen, Absprachen oder spezielle Hinweise festzuhalten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Projekt zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet einen bestehenden Termin im Terminformular.<br>2. Der Akteur navigiert zum Bereich „Notizen&quot;.<br>3. Der Akteur klickt auf „+ Notiz hinzufügen&quot;.<br>4. Das System öffnet ein Eingabeformular oder Dialog für eine neue Notiz.<br>5. Der Akteur gibt einen Titel und einen Inhalt ein (beide Felder sind Pflicht).<br>6. Der Akteur speichert die Notiz.<br>7. Das System prüft, dass Titel und Inhalt vorhanden sind.<br>8. Das System speichert die Notiz und verknüpft sie mit dem Termin.<br>9. Das System aktualisiert die Notizenliste im Terminformular und zeigt die neue Notiz an.</p>
<h2>Alternativen</h2>
<ul><li>Titel oder Inhalt fehlt: Das System blockiert das Speichern und zeigt eine Validierungsmeldung.</li><li>Abbruch: Der Akteur bricht die Eingabe ab. Es wird keine Notiz erstellt.</li></ul>
<h2>Ergebnis</h2>
<p>Die Notiz ist dem Termin zugeordnet und in der Notizenliste sichtbar. Die Notiz bleibt beim Termin bestehen, auch wenn der Termin später bearbeitet wird.</p>