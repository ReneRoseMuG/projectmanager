<h1>UC 21/01: Dokumentextraktion starten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Ein geeignetes Dokument mittels regelbasierter Parsing-Prozesse analysieren und daraus strukturierte, editierbare Datenvorschläge erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein PDF-Dokument liegt als Upload im aktuellen Formularpfad vor oder ein bestehendes Attachment ist auswählbar.</li><li>Das Dokument ist technisch lesbar.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Berechtigung zur Dokumentextraktion.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur wählt ein vorhandenes Attachment aus oder lädt ein PDF im aktuellen Formularpfad hoch.<br>2. Der Akteur startet die Funktion „Dokument extrahieren&quot;.<br>3. Das System extrahiert den Text aus dem Dokument.<br>4. Das System analysiert den Text mithilfe deterministischer Parsing-Regeln.<br>5. Das System prüft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.<br>6. Wenn eine Auftragsnummer vorhanden ist, prüft das System, ob diese Auftragsnummer bereits in der Datenbank existiert.<br>7. Wenn die Auftragsnummer bereits existiert, wird dies als Konflikt für die spätere Projektübernahme markiert. Die Extraktion selbst darf weiterhin verwertbare Kundendaten und Projekthinweise anzeigen.<br>8. Das System identifiziert strukturierte Bereiche wie Kundendaten, Artikelliste und projektbezogene Informationen.<br>9. Das System validiert die extrahierten Daten gegen definierte Feld- und Formatregeln.<br>10. Auffällige, aber verwertbare Werte werden als Warnung markiert. Eine formal falsche Postleitzahl oder eine fehlende Artikelliste darf die übrige Extraktion nicht abbrechen.<br>11. Das System zeigt die extrahierten Daten als editierbaren Vorschlag in einem Dialog an.</p>
<h2>Alternativen</h2>
<ul><li>Dokument ist technisch nicht lesbar → Das System bricht ab und zeigt eine Fehlermeldung an.</li><li>Auftragsnummer existiert bereits → Das System zeigt einen eindeutigen Konflikthinweis für die Projektübernahme. Kundendaten und andere verwertbare Felder können weiterhin angezeigt werden.</li><li>Parsing-Regeln liefern keine verwertbaren Daten → Das System zeigt einen Hinweis und erzeugt keinen Vorschlag.</li><li>Validierung schlägt für ein einzelnes Feld fehl → Das System zeigt einen strukturierten Fehlerstatus oder eine Warnung am betroffenen Feld; verwertbare andere Felder bleiben nutzbar.</li></ul>
<h2>Ergebnis</h2>
<p>Ein strukturierter, validierter und editierbarer Datenvorschlag wird angezeigt. Es wurden keine fachlichen Projekt- oder Termindaten persistiert. Konflikte und Warnungen sind für die folgenden Dialogschritte sichtbar.</p>