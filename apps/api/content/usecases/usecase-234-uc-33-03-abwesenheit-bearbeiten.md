<h1>UC 33/03: Abwesenheit bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-33-abwesenheiten-ueber-interne-personalplanung.md">FT (33): Abwesenheiten über interne Personalplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Art, Zeitraum oder Notiz einer bestehenden Abwesenheit ändern</p>
<h2>Vorbedingungen</h2>
<p>Abwesenheit ist vorhanden. Akteur besitzt Disponent- oder Administratorrechte.</p>
<h2>Ablauf</h2>
<p>1. Akteur öffnet eine bestehende Abwesenheit im Tab <strong>Abwesenheiten</strong><br>2. Akteur ändert Art, Zeitraum oder Notiz<br>3. System aktualisiert den zugrunde liegenden Termin<br>4. System entfernt den bisherigen Abwesenheits-Tag und setzt den neuen<br>5. System prüft Version und Überschneidungen<br>6. System speichert die Änderung</p>
<h2>Alternativen</h2>
<ul><li>Versionskonflikt → System meldet Konflikt, Akteur lädt neu.</li><li>Kollidierende reguläre Termine entstehen durch die Änderung → System fordert eine ausdrückliche Bestätigung zur Entfernung des Mitarbeiters aus diesen Terminen an.</li><li>Akteur bestätigt die Entfernung → System entfernt nur den betroffenen Mitarbeiter aus den bestätigten regulären Terminen und speichert danach die geänderte Abwesenheit. Die Termine bleiben in ihrer bisherigen Tour.</li><li>Betroffene Tour-KW-Planungen entstehen durch die Änderung → System fordert eine ausdrückliche Bestätigung zur Entfernung des Mitarbeiters aus diesen KW-Planungen an.</li><li>Akteur bestätigt die KW-Entfernung → System entfernt nur die betroffenen Tour-KW-Mitarbeiterzuordnungen und speichert danach die geänderte Abwesenheit.</li><li>Zeitraum beginnt vor dem aktuellen Tag, läuft aber am aktuellen Tag noch oder reicht in die Zukunft → Disponent darf die Abwesenheit bearbeiten.</li><li>Zeitraum liegt vollständig in der Vergangenheit → System blockiert die Bearbeitung für Disponenten und verändert keine regulären Termine.</li><li>Akteur bricht ab → Abwesenheit, reguläre Termine und Tour-KW-Planungen bleiben unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Abwesenheit ist mit den geänderten Werten gespeichert. Falls reguläre Termine oder Tour-KW-Planungen bestätigt betroffen waren, ist der entfernte Mitarbeiter als Folgeeffekt bewusst und nachvollziehbar.</p>