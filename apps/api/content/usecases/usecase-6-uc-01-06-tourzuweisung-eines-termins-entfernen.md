<h1>UC 01/06: Tourzuweisung eines Termins entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine bestehende Tourzuweisung von einem Termin entfernen, sodass der Termin anschließend keiner Tour mehr zugeordnet ist. Beim Entfernen der Tourzuweisung bleiben die bereits am Termin zugeordneten Mitarbeiter unverändert bestehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Der Termin ist aktuell einer Tour zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur entfernt die Tourzuweisung.<br>3. Das System löst die Tourverknüpfung des Termins.<br>4. Das System verändert die Mitarbeiterliste des Termins nicht. Alle aktuell zugeordneten Mitarbeiter bleiben weiterhin dem Termin zugeordnet.<br>5. Das System speichert den Termin.<br>6. Das System aktualisiert die Darstellung in allen relevanten Sichten, insbesondere Kalender- und Listenansichten sowie Tour- und Mitarbeiter-Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.</li><li>Konflikt beim Speichern: Falls das Speichern fehlschlägt, muss das System sicherstellen, dass weder die Tourverknüpfung noch andere Daten teilweise gespeichert wurden, und eine eindeutige Fehlermeldung anzeigen.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist keiner Tour mehr zugeordnet und wird im Kalender nach den Regeln für Termine ohne Tour dargestellt, insbesondere nicht mehr mit Tourfarbe.</p>
<p>Die Mitarbeiterzuordnungen des Termins bleiben unverändert und sind weiterhin konsistent als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar. Der Termin ist in der Tour-Terminliste nicht mehr sichtbar. In Mitarbeiter-Terminlisten bleibt der Termin für alle zugeordneten Mitarbeiter sichtbar.</p>