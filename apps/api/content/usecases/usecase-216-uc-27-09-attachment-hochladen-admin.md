<h1>UC 27/09: Attachment an Produkt oder Komponente hochladen (Admin)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-27-produktverwaltung-und-auftragspositionen.md">FT (27): Produktverwaltung und Auftragspositionen</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Ein Dokument (z. B. technische Zeichnung, Montageanleitung) an ein Produkt oder eine Komponente anhängen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist angemeldet und besitzt die Rolle Administrator.</li><li>Das Produkt oder die Komponente existiert.</li><li>Der Nutzer befindet sich auf der Detailseite des Eintrags.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator klickt auf „Datei hochladen&quot;.<br>2. Der Administrator wählt eine Datei aus.<br>3. Das System validiert Dateigröße und Typ gemäß FT-19-Regeln.<br>4. Das System speichert die Datei und legt den Attachment-Datensatz an.<br>5. Die Attachmentliste auf der Detailseite aktualisiert sich.</p>
<h2>Alternativen</h2>
<ul><li>Datei überschreitet die Größenbegrenzung → Validierungsfehler, keine Speicherung.</li><li>Ungültiger Dateityp → Validierungsfehler, keine Speicherung.</li></ul>
<h2>Ergebnis</h2>
<p>Das Attachment ist gespeichert und in der Liste des Produkts oder der Komponente sichtbar.</p>