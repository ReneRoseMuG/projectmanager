<h1>UC 21/08: Kundendaten übernehmen – Scope Neuer Termin</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Extrahierte Kundendaten im Kontext „Neuer Termin&quot; übernehmen und korrekt mit Termin und ggf. Projekt verknüpfen, ohne bestehende Stammdaten still zu überschreiben.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsvorschlag mit Kundendaten liegt vor.</li><li>Das Formular „Neuer Termin&quot; ist geöffnet.</li><li>Kein Projekt ist im Terminformular ausgewählt.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System löst die erkannte Kundennummer automatisch auf.<br>2. Falls genau ein Bestandskunde gefunden wird:</p>
<ul><li>Das System zeigt an, dass dieser Kunde für den Termin- bzw. Projektpfad verwendet wird.</li><li>Das System bietet eine standardmäßig aktive Checkbox an, um ausschließlich bisher leere Stammdatenfelder aus dem Dokument zu ergänzen.</li><li>Vorhandene Werte am Bestandskunden bleiben immer unverändert.</li></ul>
<p>3. Falls kein Bestandskunde gefunden wird:</p>
<ul><li>Das System zeigt an, dass beim Übernehmen ein neuer Kunde mit der erkannten Kundennummer angelegt wird.</li><li>Das System legt den neuen Kunden erst bei Bestätigung der Übernahme an.</li><li>Das System setzt den neu angelegten Kunden im Termin- bzw. Projektentwurf.</li></ul>
<p>4. Das System aktualisiert das Terminformular, um die Kundenverknüpfung widerzuspiegeln.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht ab → Keine Kundenanlage, keine Formularänderung.</li><li>Kunde existiert bereits und alle Felder sind bereits befüllt → Das System setzt den bestehenden Kunden im Terminformular, ohne Aktualisierungen vorzunehmen.</li><li>Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.</li><li>Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Terminentwurf oder der im Termin-Kontext erzeugte Projektentwurf referenziert einen Kunden. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden nur nach sichtbarer Nutzerentscheidung ergänzt. Es existieren keine verwaisten Referenzen.</p>