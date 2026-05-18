<h1>UC 09/08: Versionskonflikt bei paralleler Kundenbearbeitung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass bei paralleler Bearbeitung desselben Kunden keine stillen Datenüberschreibungen (Lost Updates) entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Kunde existiert.</li><li>Zwei Akteure sind gleichzeitig authentifiziert.</li><li>Beide Akteure haben Bearbeitungsrechte.</li><li>Beide Akteure laden denselben Kunden mit identischer Versionskennung.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur A öffnet die Kundendetailansicht.<br>2. Akteur B öffnet dieselbe Kundendetailansicht.<br>3. Beide erhalten denselben Versionsstand (z. B. <code>version = 5</code>).<br>4. Akteur A ändert Kundendaten und speichert.<br>5. Das System prüft die Versionskennung.<br>6. Das System persistiert die Änderung.<br>7. Das System erhöht die Versionskennung auf <code>version = 6</code>.<br>8. Akteur B speichert nun seine Änderungen mit veralteter Versionskennung (<code>version = 5</code>).<br>9. Das System prüft die Versionskennung.<br>10. Das System erkennt die Abweichung.<br>11. Das System blockiert den Speichervorgang mit 409 (Konflikt).<br>12. Das System fordert Akteur B zum Neuladen auf.</p>
<h2>Alternativen</h2>
<ul><li>Akteur B lädt vor dem Speichern neu → kein Konflikt.</li><li>Akteur B bricht ab → keine Änderung.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Es kommt zu keinem stillen Überschreiben von Kundendaten.</li><li>Der zuletzt gespeicherte, valide Stand bleibt erhalten.</li><li>Das System garantiert Optimistic Locking für Kundenänderungen.</li></ul>