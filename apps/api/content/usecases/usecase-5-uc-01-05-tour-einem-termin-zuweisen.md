<h1>UC 01/05: Tour einem Termin zuweisen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen bestehenden Termin einer Tour zuweisen, sodass der Termin mit der Tour verknüpft wird und die Tourfarbe für die Darstellung genutzt werden kann.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Die Tour existiert.</li><li>Optional: Der Termin hat bereits manuell zugeordnete Mitarbeiter oder bereits eine Tourzuordnung.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur weist dem Termin eine Tour zu oder ändert eine bereits verknüpfte Tour.<br>3. Das System verknüpft den Termin mit der ausgewählten Tour. Wenn für die Kalenderwoche des Terminstartdatums in der Tour eine Wochenplanung hinterlegt ist, zeigt das System sofort einen Vorschau-Dialog mit den geplanten Mitarbeitern und möglichen Konflikten. Nach Bestätigung werden die ausgewählten Mitarbeiter in die Mitarbeiterliste übernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverändert.<br>4. Das System speichert den Termin.<br>5. Das System aktualisiert die Darstellung in den relevanten Sichten.<br>1. Der Termin wird im Kalender mit der Tourfarbe dargestellt.<br>2. Der Termin ist in der Tour-Sicht auffindbar, sofern diese eine Terminliste anbietet.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist mit der Tour verknüpft. Wenn eine Wochenplanung für die betreffende KW vorhanden war, wurden die bestätigten Mitarbeiter hinzugefügt. Andernfalls bleibt die Mitarbeiterliste unverändert. Der Termin ist im Kalender sichtbar und wird mit der Tourfarbe dargestellt. Der Termin ist in der Tour-Terminliste sichtbar, sofern eine Tour-Terminliste existiert.</p>