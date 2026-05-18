<h1>UC 09/07: Kundenanhänge verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Dokumente werden einem Kunden zugeordnet, angezeigt und heruntergeladen, ohne die fachliche Integrität des Kunden oder referenzierender Projekte zu beeinträchtigen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Leserechte; für Upload zusätzlich Änderungsrechte.</li><li>Die hochzuladende Datei entspricht erlaubten Formaten und Größenbeschränkungen.</li></ul>
<h2>Ablauf</h2>
<p>---</p>
<h3>Ablauf – Anhang hochladen</h3>
<p>1. Der Akteur öffnet die Kundendetailansicht.<br>2. Der Akteur startet die Funktion „Anhang hinzufügen“.<br>3. Der Akteur wählt eine Datei aus.<br>4. Das System prüft:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Dateiformat,</li><li>Dateigröße.</li></ul>
<p>5. Das System speichert die Datei serverseitig unter persistentem Speichername.<br>6. Das System legt einen Attachment-Datensatz mit Parent-Referenz auf den Kunden an.<br>7. Das System speichert Metadaten (Originalname, MIME-Typ, Größe, Zeitstempel).<br>8. Das System aktualisiert die Anhangsliste in der UI.</p>
<p>---</p>
<h3>Ablauf – Anhang anzeigen / herunterladen</h3>
<p>1. Der Akteur öffnet die Anhangsliste des Kunden.<br>2. Das System lädt alle dem Kunden zugeordneten Attachments.<br>3. Der Akteur wählt einen Anhang aus.<br>4. Das System liefert die Datei über einen gesicherten Download-Endpunkt aus.<br>5. Je nach Dateityp erfolgt Inline-Anzeige oder Download.</p>
<p>---</p>
<h3>Regeln und Einschränkungen</h3>
<ul><li>Ein Attachment kann nicht ohne Parent-Kunde existieren.</li><li>Attachments sind kundenbezogen und unabhängig von Projekten.</li><li>Eine physische Löschung von Attachments ist systemweit nicht vorgesehen.</li><li>Das Löschen eines Kunden entfernt referenzierte Notizen (CASCADE), jedoch keine physische Dateilöschung ist spezifiziert.</li><li>Mehrere Akteure können parallel Anhänge hochladen; jeder Upload erzeugt einen eigenständigen Attachment-Datensatz.</li></ul>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Berechtigung → System blockiert mit 403.</li><li>Datei ungültig → System lehnt Upload mit Validierungsfehler ab.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Der Anhang ist persistent gespeichert und eindeutig dem Kunden zugeordnet.</li><li>Die Anhangsliste zeigt alle vorhandenen Attachments konsistent an.</li><li>Es entstehen keine Auswirkungen auf Projekte oder Termine.</li><li>Es entstehen keine verwaisten Attachment-Referenzen.</li></ul>