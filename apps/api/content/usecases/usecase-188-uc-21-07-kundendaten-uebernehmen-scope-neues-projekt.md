<h1>UC 21/07: Kundendaten übernehmen – Scope Neues Projekt</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Extrahierte Kundendaten im Kontext „Neues Projekt&quot; übernehmen und einen Kunden korrekt anlegen, verknüpfen oder kontrolliert ergänzen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsvorschlag mit Kundendaten liegt vor.</li><li>Das Formular „Neues Projekt&quot; ist geöffnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System löst die erkannte Kundennummer automatisch auf.<br>2. Falls genau ein Bestandskunde gefunden wird:</p>
<ul><li>Das System zeigt an, dass dieser Kunde mit dem Projekt verknüpft wird.</li><li>Das System bietet eine standardmäßig aktive Checkbox an, um ausschließlich bisher leere Stammdatenfelder aus dem Dokument zu ergänzen.</li><li>Vorhandene Werte am Bestandskunden bleiben immer unverändert.</li></ul>
<p>3. Falls kein Bestandskunde gefunden wird:</p>
<ul><li>Das System zeigt an, dass beim Übernehmen ein neuer Kunde mit der erkannten Kundennummer angelegt wird.</li><li>Das System legt den neuen Kunden erst bei Bestätigung der Übernahme an.</li><li>Das System verknüpft den neu angelegten Kunden mit dem Projektentwurf.</li></ul>
<p>4. Das System aktualisiert das Projektformular, um die Kundenverknüpfung widerzuspiegeln.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht ab → Es erfolgt keine Kundenanlage und keine Änderung der Projektzuordnung.</li><li>Kunde existiert bereits und alle Felder sind bereits befüllt → Das System verknüpft den bestehenden Kunden mit dem Projekt, ohne Aktualisierungen vorzunehmen.</li><li>Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.</li><li>Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Projektentwurf ist mit einem Kunden verknüpft. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden nur nach sichtbarer Nutzerentscheidung ergänzt. Alle Referenzen sind konsistent.</p>