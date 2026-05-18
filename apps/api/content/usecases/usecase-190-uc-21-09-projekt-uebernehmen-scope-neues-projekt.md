<h1>UC 21/09: Projekt übernehmen – Scope Neues Projekt</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Extrahierte Projektinformationen im Kontext „Neues Projekt“ übernehmen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsvorschlag mit Projektdaten liegt vor.</li><li>Das Formular „Neues Projekt“ ist geöffnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur prüft Projekttitel, Auftragsnummer, Betrag, Auftragsinhalt und Warnungen im Doc-Extract-Dialog.<br>2. Der Akteur entscheidet optional, ob der extrahierte Dokumenttext in die Anmerkungen übernommen wird.<br>3. Der Akteur entscheidet optional, ob das Dokument als Reklamation behandelt wird. Die Notizfrage und der optionale Notizeditor laufen direkt im Dialog.<br>4. Der Akteur wählt die Übernahme der Projektdaten.<br>5. Das System setzt die bestätigten Projektdaten im Projektformular.<br>6. Wenn Formularfelder bereits befüllt sind, dürfen sie nur nach sichtbarer Bestätigung ersetzt oder ergänzt werden.<br>7. Das eingelesene PDF bleibt als Draft-Dokument am Projektformular, bis der Projekt-Speichern-Flow abgeschlossen oder verworfen wird.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur lehnt das Überschreiben ab → Bestehende Inhalte bleiben unverändert.</li><li>Eine Artikelliste fehlt → Das System zeigt einen Hinweis, übernimmt aber die übrigen verwertbaren Projektdaten.</li><li>Eine Auftragsnummer existiert bereits → Die spätere Projektübernahme muss als Duplikatkonflikt behandelt werden.</li></ul>
<h2>Ergebnis</h2>
<p>Das Projektformular enthält die übernommenen Projektdaten gemäß Bestätigung des Akteurs. Persistenz, Projekttitel-Entscheidung, PDF-Duplikatentscheidung und weitere projektbezogene Speicherfragen laufen anschließend über den Projekt-Speichern-Flow.</p>