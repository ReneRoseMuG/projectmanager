<h3>Akteur</h3>
<p>Administrator</p>

<h3>Ziel</h3>
<p>Den aktuellen Systemzustand lokal sichern und optional auf den SFTP-Server übertragen.</p>

<h3>Vorbedingungen</h3>
<ul>
  <li>Administrator ist angemeldet.</li>
  <li>SFTP-Verbindung ist konfiguriert (optional, nur für Remote-Upload erforderlich).</li>
</ul>

<h3>Ablauf</h3>
<ol>
  <li>Administrator löst im Bereich „Backup &amp; Synchronisation" die Vollsicherung aus.</li>
  <li>Das System emittiert Fortschrittsevents über den Realtime-Bus: Datenbankexport gestartet → Dateien werden archiviert → ZIP wird gespeichert → Remote-Upload läuft (falls konfiguriert).</li>
  <li>Der Client zeigt den Fortschritt in Echtzeit an (Phase und Schrittnummer).</li>
  <li>Nach Abschluss zeigt das System Dateigröße, Zeitstempel und — falls SFTP konfiguriert — Bestätigung des Remote-Uploads an.</li>
</ol>

<h3>Alternativen / Sonderfälle</h3>
<ul>
  <li>SFTP nicht konfiguriert: Lokale Sicherung wird dennoch erstellt; Remote-Upload wird übersprungen und als „nicht versucht" gemeldet.</li>
  <li>SFTP-Verbindung schlägt fehl: Lokale Datei bleibt erhalten; Fehler wird als Warnung angezeigt.</li>
  <li>Bereits ein Backup-Vorgang aktiv: Neuer Aufruf wird mit erklärendem Hinweis abgelehnt.</li>
</ul>

<h3>Ergebnis</h3>
<p>Eine valide ZIP-Sicherungsdatei liegt lokal vor. Bei konfiguriertem SFTP zusätzlich remote. Der Benutzer sieht den abgeschlossenen Status mit Dateigröße und Zeitstempel.</p>