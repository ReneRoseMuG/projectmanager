<h1>UC 09/09: Statuskonflikt bei parallelem Bearbeiten und Deaktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass eine Kundenbearbeitung nicht erfolgreich gespeichert werden kann, wenn der Kunde zwischenzeitlich deaktiviert wurde.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Kunde existiert und ist aktiv (<code>is_active = true</code>).</li><li>Zwei Akteure sind gleichzeitig authentifiziert.</li><li>Akteur A besitzt Bearbeitungsrechte (Disponent oder Administrator).</li><li>Akteur B besitzt Administratorrechte.</li><li>Beide Akteure laden denselben Kunden mit identischer Versionskennung.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur A öffnet die Kundendetailansicht und beginnt mit der Bearbeitung.<br>2. Akteur B öffnet denselben Kunden.<br>3. Akteur B löst „Deaktivieren“ aus.<br>4. Das System prüft Berechtigung und Versionskennung.<br>5. Das System setzt <code>is_active = false</code>, persistiert die Änderung und erhöht die Versionskennung.<br>6. Akteur A speichert nun seine Änderungen mit veralteter Versionskennung.<br>7. Das System prüft:</p>
<ul><li>Versionskennung,</li><li>aktuellen Status (<code>is_active</code>).</li></ul>
<p>8. Das System erkennt den Konflikt.<br>9. Das System blockiert den Speichervorgang mit 409.<br>10. Das System fordert Akteur A zum Neuladen auf.</p>
<h2>Alternativen</h2>
<ul><li>Akteur A lädt vor dem Speichern neu → das System zeigt den Kunden als deaktiviert an; Bearbeitung ist nur eingeschränkt möglich oder blockiert.</li><li>Akteur B bricht die Deaktivierung ab → kein Konflikt.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Ein deaktivierter Kunde kann nicht unbemerkt durch parallele Bearbeitung wieder verändert werden.</li><li>Es entstehen keine inkonsistenten Zustände zwischen Aktiv-Status und Stammdaten.</li><li>Optimistic Locking wird auch bei Statusänderungen konsequent durchgesetzt.</li></ul>