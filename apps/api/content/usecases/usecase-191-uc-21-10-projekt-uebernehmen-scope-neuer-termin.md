<h1>UC 21/10: Projekt übernehmen – Scope Neuer Termin</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Extrahierte Projektinformationen im Kontext „Neuer Termin“ übernehmen und ein neues Projekt erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsvorschlag mit Projektdaten liegt vor.</li><li>Kein Projekt ist im Terminformular ausgewählt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur prüft Projekttitel, Auftragsnummer, Betrag, Auftragsinhalt und Warnungen im Doc-Extract-Dialog.<br>2. Der Akteur entscheidet optional, ob der extrahierte Dokumenttext in die Projektanmerkungen übernommen wird.<br>3. Der Akteur entscheidet optional, ob das Dokument als Reklamation behandelt wird. Die Notizfrage und der optionale Notizeditor laufen direkt im Dialog.<br>4. Der Akteur wählt die Übernahme der Projektdaten.<br>5. Das System öffnet den Projektentwurf im Termin-Kontext und übernimmt die bestätigten Daten.<br>6. Der Akteur speichert das Projekt.<br>7. Nach erfolgreichem Projektspeichern verknüpft das System das neue Projekt mit dem Terminformular.<br>8. Der Termin selbst wird erst durch den Termin-Speichern-Flow persistiert.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht vor Bestätigung ab → Kein Projekt wird angelegt; das Terminformular bleibt unverändert.</li><li>Während der Projektanlage tritt ein Validierungs- oder Versionskonflikt auf → Das System bricht ab; es werden keine Teilzustände gespeichert.</li><li>Eine Artikelliste fehlt → Das System zeigt einen Hinweis, übernimmt aber die übrigen verwertbaren Projektdaten.</li><li>Eine Auftragsnummer existiert bereits → Die Projektanlage muss als Duplikatkonflikt behandelt werden.</li></ul>
<h2>Ergebnis</h2>
<p>Ein neues Projekt ist persistent angelegt und im Terminformular korrekt auswählbar. Alle Referenzen sind konsistent. Das extrahierte PDF wird im Projekt-Attachment-Flow behandelt (siehe UC 21/17).</p>