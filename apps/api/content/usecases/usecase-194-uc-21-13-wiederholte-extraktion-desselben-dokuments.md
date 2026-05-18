<h1>UC 21/13: Wiederholte Extraktion desselben Dokuments</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass die wiederholte Extraktion desselben Attachments keine inkonsistenten oder doppelten Stammdaten erzeugt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Attachment wurde bereits extrahiert.</li><li>Es wurden noch keine oder bereits bestätigte Daten aus diesem Dokument übernommen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur startet erneut die Funktion „Dokument extrahieren&quot; für dasselbe Attachment.<br>2. Das System führt die regelbasierte Parsing-Analyse erneut vollständig aus.<br>3. Das System prüft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.<br>4. Falls eine Auftragsnummer vorhanden ist, prüft das System, ob diese bereits in der Datenbank existiert.<br>5. Falls die Auftragsnummer bereits existiert, markiert das System den Konflikt für die Projektübernahme, zeigt aber weiterhin verwertbare Kundendaten und andere Hinweise.<br>6. Das System führt die Validierung durch und erzeugt einen neuen, unabhängigen Extraktionsvorschlag.<br>7. Der Akteur bestätigt oder verwirft den neuen Vorschlag.<br>8. Bei Bestätigung führt das System reguläre Duplikats- und Validierungsprüfungen durch und übernimmt die Daten gemäß den bestehenden Formular- und Speicherregeln.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur verwirft den neuen Vorschlag → Keine Änderung an bestehenden Daten.</li><li>Auftragsnummer existiert bereits (Wiederholung desselben Dokuments) → Das System zeigt einen Konflikt für die Projektübernahme. Der Akteur kann den vorhandenen Projektpfad nutzen oder die bestehenden Daten manuell aktualisieren.</li><li>Duplikatsprüfung verhindert eine doppelte Kunden- oder Projektanlage → Das System verweist auf bestehende Datensätze. Leere Kundenstammdaten werden nur nach sichtbarer Nutzerentscheidung ergänzt.</li></ul>
<h2>Ergebnis</h2>
<p>Es entstehen keine automatischen Dubletten. Auftragsnummer-Konflikte sind sichtbar. Jede Persistierung erfolgt ausschließlich nach expliziter Bestätigung des Akteurs und unter Anwendung der bestehenden Domänenregeln.</p>