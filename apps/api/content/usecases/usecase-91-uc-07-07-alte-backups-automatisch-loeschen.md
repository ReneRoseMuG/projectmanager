<h1>UC 07/07: Alte Backups automatisch löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System (Scheduler)</p>
<h2>Ziel</h2>
<p>Speicherbereinigung gemäß Retention-Regel.</p>
<h2>Vorbedingungen</h2>
<ul><li>Scheduler-Lauf wird ausgeführt.</li></ul>
<h2>Ablauf</h2>
<ul><li>System prüft gespeicherte Backup-Dateien, manuelle Dump-Dateien und Dump-Transfer-Tagesverzeichnisse.</li><li>Dateien beziehungsweise Tagesverzeichnisse älter als 30 Tage werden gelöscht.</li><li>Löschvorgang wird protokolliert.</li></ul>
<h2>Alternativen</h2>
<ul><li>Datei nicht auffindbar → Fehler protokollieren.</li></ul>
<h2>Ergebnis</h2>
<p>Speicher bleibt kontrolliert, Log bleibt erhalten.</p>