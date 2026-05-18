<h1>UC 21/06: Dokumentextraktion im Formular „Neuer Termin“ starten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Innerhalb des Formulars „Neuer Termin“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Formular „Neuer Termin“ ist geöffnet.</li><li>Der Akteur besitzt die Berechtigung zur Terminanlage.</li><li>Ein PDF-Dokument ist verfügbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Terminformulars.<br>2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.<br>3. Das System zeigt denselben mehrstufigen Ergebnisdialog wie im Formular „Neues Projekt“ an.<br>4. Das System löst erkannte Kundendaten automatisch auf und zeigt an, ob ein Kunde verknüpft, neu angelegt oder durch fehlende bzw. mehrdeutige Kundennummer blockiert wird.<br>5. Das System zeigt erkannte Projektdaten und bietet optional an, den extrahierten Dokumenttext in die Projektanmerkungen zu übernehmen.<br>6. Der Akteur kann das importierte Dokument als Reklamation markieren. Die Notizfrage und der optionale Notizeditor laufen direkt im Dialog.<br>7. Nach Bestätigung wird der Projektentwurf im Termin-Kontext weitergeführt. Erst nach erfolgreichem Projektspeichern wird das Projekt dem Terminformular zugeordnet.</p>
<h2>Alternativen</h2>
<ul><li>Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Terminformular bleibt unverändert.</li><li>Das Dokument enthält nur teilweise verwertbare Daten → Das System zeigt die verwertbaren Bereiche und markiert fehlende oder auffällige Felder als Hinweis oder Warnung.</li></ul>
<h2>Ergebnis</h2>
<p>Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neuer Termin“ zur Verfügung. Es wurden keine Termin- oder Projektdaten gespeichert. Der spätere Termin-Speichern-Flow behandelt ausschließlich terminbezogene Entscheidungen.</p>