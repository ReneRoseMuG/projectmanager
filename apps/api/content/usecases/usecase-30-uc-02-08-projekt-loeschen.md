<h1>UC 02/08: Projekt löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Ein Projekt dauerhaft aus dem System entfernen, ohne fachliche Inkonsistenzen oder verwaiste Referenzen zu hinterlassen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte (Disponent oder Administrator).</li><li>Dem Projekt sind <strong>keine Termine zugeordnet</strong> (zwingende Vorbedingung).</li><li>Das Projekt besitzt ein Versionsmerkmal.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet das Projekt und wählt „Projekt löschen&quot;.<br>2. Das System prüft die Berechtigung des Akteurs.<br>3. Das System prüft, ob dem Projekt Termine zugeordnet sind.<br>1. Falls <strong>JA:</strong> Das System blockiert die Löschung mit HTTP 409 BUSINESS_CONFLICT. Das Projekt bleibt vollständig erhalten.<br>2. Falls <strong>NEIN:</strong> Fortfahren mit Schritt 4.<br>4. Das System setzt eine atomare Versionsverriegelung (write-lock) auf dem Projekt-Datensatz mit dem erwarteten Versionsmerkmal.<br>5. Das System führt innerhalb einer Transaktion durch:<br>1. Alle projektbezogenen Tag-Zuordnungen werden entfernt.<br>2. Alle projektbezogenen Notizen und deren Relationen werden physisch gelöscht (Cascade).<br>3. Alle Anhang-Datensätze des Projekts werden entfernt (physische Dateien verbleiben im Upload-Verzeichnis).<br>4. Alle Auftragspositionen (<code>project_order_items</code>) werden gelöscht.<br>5. Der Projekt-Datensatz wird gelöscht.<br>6. Das System bestätigt die erfolgreiche Löschung und aktualisiert alle Projektlisten.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Löschrechte → HTTP 403.</li><li>Projekt besitzt Termine → HTTP 409 BUSINESS_CONFLICT, kein Teilzustand entsteht.</li><li>Versionskonflikt (Optimistic Locking) → HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.</li><li>Race Condition (Termin wird parallel angelegt) → atomare Prüfung erkennt neue Referenz → HTTP 409, Löschung wird abgebrochen.</li><li>Technischer Fehler → HTTP 500, das Projekt bleibt vollständig erhalten, keine Teillöschung.</li></ul>
<h2>Ergebnis</h2>
<p>Das Projekt und alle zugeordneten Notizen sowie Auftragspositionen sind physisch gelöscht. Anhang-Datensätze sind entfernt; physische Dateien verbleiben im Upload-Verzeichnis. Es existieren keine verwaisten Referenzen. Alle Projektlisten sind aktualisiert.</p>