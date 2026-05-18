<h1>UC 09/01: Kunde anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Ein neuer Kunde wird mit vollständigen Stammdaten angelegt und steht anschließend für Projektzuordnungen zur Verfügung.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Berechtigung zur Anlage von Kunden.</li><li>Pflichtfelder sind im System definiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur startet die Funktion „Kunde anlegen“.<br>2. Das System zeigt ein Formular zur Erfassung der Kundendaten an.<br>3. Optional startet der Akteur die Dokumentextraktion im Kundenformular. Das System zeigt erkannte Kundendaten, fehlende Felder und Warnungen als Vorschlag an.<br>4. Der Akteur erfasst oder bestätigt mindestens:</p>
<ul><li>Kundenname bzw. Firma,</li><li>Telefonnummer,</li><li>Kundennummer,</li><li>Adresse (sofern für Planung oder Druck erforderlich).</li></ul>
<p>5. Der Akteur bestätigt die Eingabe.<br>6. Das System validiert:</p>
<ul><li>Pflichtfelder,</li><li>formale Korrektheit der Daten,</li><li>optionale Dublettenprüfung anhand Name/Adresse/Kundennummer.</li></ul>
<p>7. Bei erfolgreicher Validierung speichert das System den Kunden mit <code>is_active = true</code>.<br>8. Das System erzeugt eine Versionskennung (z. B. <code>version</code> oder <code>updated_at</code>).<br>9. Das System zeigt die Kundendetailansicht des neu angelegten Kunden an.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfeld fehlt → System antwortet mit Validierungsfehler, kein Persistieren.</li><li>Formale Validierung schlägt fehl → System lehnt ab und markiert Feld.</li><li>Dublettenprüfung schlägt an → System warnt oder blockiert gemäß Regel.</li><li>Dokumentextraktion erkennt eine bestehende Kundennummer → System lädt den Bestandskunden statt einen zweiten Datensatz anzulegen.</li><li>Technischer Fehler → System antwortet mit 500, kein Kunde wird angelegt.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Ein neuer Kundendatensatz existiert persistent.</li><li><code>is_active = true</code>.</li><li>Der Kunde erscheint:</li><li>in Kundenlisten,</li><li>in Projektauswahldialogen (nur für aktive Kunden),</li><li>in Filterkomponenten für aktive Kunden.</li><li>Es existieren noch keine Projekte, Termine oder Notizen für diesen Kunden.</li></ul>