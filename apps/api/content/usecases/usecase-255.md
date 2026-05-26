<h3>Akteur</h3>
<p>Administrator</p>

<h3>Ziel</h3>
<p>Nur Änderungen seit dem letzten Abgleich auf den SFTP-Server übertragen — effizient, innerhalb einer einzigen SFTP-Sitzung, mit Echtzeit-Fortschritt.</p>

<h3>Vorbedingungen</h3>
<ul>
  <li>SFTP vollständig konfiguriert und Remote-Verzeichnis als geschützt bestätigt.</li>
  <li>Kein anderer Backup-Vorgang läuft gerade.</li>
</ul>

<h3>Ablauf</h3>
<ol>
  <li>Administrator startet den inkrementellen Sync.</li>
  <li>Das System öffnet eine einzige SFTP-Verbindung und hält diese für die gesamte Dauer offen.</li>
  <li>Das System lädt das Remote-Manifest herunter und vergleicht Datei-Hashes und Tabellen-Hashes mit dem aktuellen lokalen Zustand.</li>
  <li>Über den Realtime-Bus werden laufend Events gesendet: Vergleich abgeschlossen (N Dateien zu übertragen, M zu löschen) → Datei X von N hochgeladen → Sync abgeschlossen.</li>
  <li>Geänderte Dateien werden sequenziell hochgeladen; gelöschte Dateien werden entfernt. Bei Datenbankänderungen wird data.json übertragen.</li>
  <li>Das Manifest auf dem Server wird als letzter Schritt aktualisiert.</li>
  <li>Die SFTP-Verbindung wird nach Abschluss aller Operationen geschlossen.</li>
</ol>

<h3>Alternativen / Sonderfälle</h3>
<ul>
  <li>Kein Remote-Manifest vorhanden (erster Sync): alle Dateien werden als „neu" behandelt und vollständig übertragen.</li>
  <li>Einzelne Datei kann nicht gelöscht werden: Warnung wird protokolliert, Sync läuft weiter.</li>
  <li>Verbindungsfehler mitten im Sync: Fehler wird angezeigt; bereits übertragene Dateien bleiben auf dem Server, Manifest wird nicht aktualisiert.</li>
  <li>Keine Änderungen seit letztem Sync: System meldet „keine Änderungen", überträgt nichts.</li>
</ul>

<h3>Ergebnis</h3>
<p>Remote-Server enthält den aktuellen Zustand des Systems. Manifest ist aktualisiert. Der Benutzer hat während des gesamten Vorgangs Rückmeldung erhalten und sieht ein Abschluss-Ergebnis mit Anzahl hochgeladener und gelöschter Dateien.</p>