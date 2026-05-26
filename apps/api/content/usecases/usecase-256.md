<h3>Akteur</h3>
<p>Administrator</p>

<h3>Ziel</h3>
<p>Eine Systeminstanz aus einer Remote-Sicherungsdatei vollständig wiederherstellen — nach Prüfung und expliziter Bestätigung.</p>

<h3>Vorbedingungen</h3>
<ul>
  <li>SFTP konfiguriert und Remote-Verzeichnis enthält mindestens eine Sicherungsdatei.</li>
  <li>Die gewählte Sicherungsdatei wurde noch nicht importiert.</li>
</ul>

<h3>Ablauf</h3>
<ol>
  <li>Administrator öffnet die Import-Vorschau für eine Remote-Sicherungsdatei (neueste oder gezielt ausgewählte).</li>
  <li>Das System zeigt: erwartete Tabellen mit Zeilenzahl und Prüfsumme, enthaltene Dateiinhalte mit Gesamtgröße, Schema-Versionsabgleich, eventuelle Warnungen oder Blockiergründe.</li>
  <li>Wenn keine Blockiergründe vorliegen: Administrator gibt die systemgenerierte Bestätigungsphrase ein.</li>
  <li>Das System sichert den aktuellen Zustand automatisch als Rollback-Backup.</li>
  <li>Datenbanktabellen werden geleert und aus der Sicherungsdatei neu befüllt. Dateien werden in einem Staging-Verzeichnis bereitgestellt und dann atomar ausgetauscht.</li>
  <li>Nach dem Import verifiziert das System Prüfsummen aller Tabellen und Dateiinhalte.</li>
  <li>Ergebnis: Import-Status, Anzahl wiederhergestellter Tabellen und Dateiinhalte werden angezeigt.</li>
</ol>

<h3>Alternativen / Sonderfälle</h3>
<ul>
  <li>Schema-Version weicht ab: Import wird blockiert; Fehlermeldung erklärt die Abweichung.</li>
  <li>Bestätigungsphrase falsch: Import wird nicht gestartet.</li>
  <li>Datei wurde bereits importiert: Import wird blockiert mit Hinweis auf den ersten Import-Zeitstempel.</li>
  <li>Prüfsummenfehler nach Import: Rollback auf gesicherten Zustand; Fehlermeldung mit betroffenen Tabellen/Dateien.</li>
</ul>

<h3>Ergebnis</h3>
<p>System wurde auf den Stand der Sicherungsdatei zurückgesetzt. Der vorherige Zustand ist als Rollback-Backup erhalten. Die Remote-Datei ist in der Importhistorie vermerkt.</p>