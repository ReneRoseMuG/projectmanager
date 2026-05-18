<h1>UC 07/03: PDF „Anstehende Termine“ erzeugen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Ein aktuelles, gut lesbares PDF-Dokument aller anstehenden Termine erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Termin wurde neu angelegt oder geändert.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System ermittelt alle Termine ab dem heutigen Tag, heute eingeschlossen.<br>2. Das System sortiert die Termine nach Datum und Uhrzeit.<br>3. Termine ohne Uhrzeit stehen innerhalb eines Datums zuerst.<br>4. Das System rendert für jeden Termin einen visuell abgegrenzten horizontalen Abschnitt.<br>5. Die Kopfzeile enthält Uhrzeit, sofern erfasst, Datum, Kundennummer, vollständigen Kundennamen und Auftragsnummer.<br>6. Ist eine Auftragsnummer vorhanden, rendert das System einen eingerückten Detailbereich mit Artikelliste des Projekts und Anmerkungen aus der Projektbeschreibung.<br>7. Das System speichert das PDF serverseitig.<br>8. Das System protokolliert den Vorgang im Backup-Log.</p>
<h2>Alternativen</h2>
<ul><li>Fehler bei der PDF-Erstellung: Das System protokolliert den Status „error“. Die Termin-Speicherung bleibt unberührt.</li></ul>
<h2>Ergebnis</h2>
<p>Das aktuelle PDF „Anstehende Termine“ ist persistent gespeichert und über die Backup-Historie abrufbar.</p>