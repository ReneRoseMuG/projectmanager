<h1>UC 21/05: Dokumentextraktion im Formular „Neues Projekt“ starten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Innerhalb des Formulars „Neues Projekt“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Formular „Neues Projekt“ ist geöffnet.</li><li>Der Akteur besitzt die Berechtigung zur Projektanlage.</li><li>Ein PDF-Dokument ist verfügbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Formulars.<br>2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.<br>3. Das System zeigt einen mehrstufigen Ergebnisdialog mit Kundendaten, Projektdaten, Warnungen und Abschluss an.<br>4. Das System löst erkannte Kundendaten automatisch auf und zeigt an, ob ein Kunde verknüpft, neu angelegt oder durch fehlende bzw. mehrdeutige Kundennummer blockiert wird.<br>5. Das System zeigt erkannte Projektdaten und bietet optional an, den extrahierten Dokumenttext in die Anmerkungen zu übernehmen.<br>6. Der Akteur kann das Dokument im Dialog als Reklamation markieren. In diesem Fall wird die Notizfrage direkt im Dialog gestellt und bei Zustimmung der Notizeditor eingeblendet.</p>
<h2>Alternativen</h2>
<ul><li>Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Projektformular bleibt unverändert.</li><li>Das Dokument enthält nur teilweise verwertbare Daten → Das System zeigt die verwertbaren Bereiche und markiert fehlende oder auffällige Felder als Hinweis oder Warnung.</li></ul>
<h2>Ergebnis</h2>
<p>Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neues Projekt“ zur Verfügung. Es wurden keine Projektdaten gespeichert. Nach Übernahme liegen Projekt-, Kunden-, Reklamations- und PDF-Draft-Daten im Formularzustand bereit; endgültige projektbezogene Entscheidungen erfolgen beim Speichern.</p>