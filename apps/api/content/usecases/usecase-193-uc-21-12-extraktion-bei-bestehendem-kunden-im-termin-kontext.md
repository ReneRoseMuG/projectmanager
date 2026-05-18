<h1>UC 21/12: Extraktion bei bestehendem Kunden im Termin-Kontext</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass extrahierte Kundendaten im Kontext „Neuer Termin&quot; korrekt mit einem bereits gesetzten Kunden abgestimmt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Formular „Neuer Termin&quot; ist geöffnet.</li><li>Ein Kunde ist bereits im Terminformular ausgewählt.</li><li>Ein Extraktionsvorschlag mit Kundendaten liegt vor.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System löst die extrahierte Kundennummer automatisch auf.<br>2. Falls die extrahierten Kundendaten zu dem bereits gesetzten Kunden passen:</p>
<ul><li>Das System zeigt an, dass der bereits gesetzte Kunde weiterverwendet wird.</li><li>Das System bietet eine standardmäßig aktive Checkbox an, um ausschließlich bisher leere Stammdatenfelder aus dem Dokument zu ergänzen.</li><li>Vorhandene Werte am Kunden bleiben unverändert.</li></ul>
<p>3. Falls die extrahierten Kundendaten nicht zu dem bereits gesetzten Kunden passen:</p>
<ul><li>Das System zeigt die Abweichung im Dialog an.</li><li>Wenn genau ein anderer existierender Kunde gefunden wird, kann dieser nach sichtbarer Bestätigung verwendet werden.</li><li>Wenn kein Kunde gefunden wird, zeigt das System an, dass ein neuer Kunde mit der extrahierten Kundennummer angelegt werden kann.</li></ul>
<p>4. Der Akteur bestätigt die Übernahme oder bricht ab.<br>5. Das System aktualisiert das Terminformular beziehungsweise den Projektentwurf im Termin-Kontext.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht ab → Die bestehende Kundenreferenz bleibt unverändert, keine neuen Kunden werden angelegt.</li><li>Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.</li><li>Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert und die bestehende Kundenreferenz bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Die Kundenreferenz im Terminformular ist eindeutig definiert und konsistent. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden nur nach sichtbarer Nutzerentscheidung ergänzt. Es existieren keine unerwarteten Überschreibungen.</p>