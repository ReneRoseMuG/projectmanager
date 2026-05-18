<h1>UC 21/18: Dokumentextraktion im Formular „Neuer Kunde“ starten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Innerhalb des Formulars „Neuer Kunde“ ein Dokument mittels Parsing analysieren und einen Kundendatenvorschlag erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Formular „Neuer Kunde“ ist geöffnet.</li><li>Der Akteur besitzt die Berechtigung zur Kundenanlage.</li><li>Ein PDF-Dokument ist verfügbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Kundenformulars.<br>2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.<br>3. Das System zeigt einen Kundendaten-Dialog mit erkannten Feldern, fehlenden Feldern und Warnungen an.<br>4. Das System löst die erkannte Kundennummer automatisch auf.<br>5. Falls genau ein Bestandskunde gefunden wird, zeigt das System an, dass dieser Kunde geladen wird.<br>6. Falls kein Bestandskunde gefunden wird, zeigt das System an, dass die Daten als neuer Kunde übernommen werden.<br>7. Der Akteur bestätigt die Übernahme oder bricht ab.</p>
<h2>Alternativen</h2>
<ul><li>Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Kundenformular bleibt unverändert.</li><li>Das Dokument enthält nur teilweise verwertbare Kundendaten → Das System zeigt die verwertbaren Felder und markiert fehlende oder auffällige Felder als Hinweis oder Warnung.</li><li>Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.</li><li>Der Akteur bricht ab → Keine Kundenanlage und keine Formularänderung.</li></ul>
<h2>Ergebnis</h2>
<p>Das Kundenformular enthält die bestätigten Kundendaten oder lädt den erkannten Bestandskunden. Es wurden keine Projekt- oder Termindaten erzeugt.</p>