<h1>UC 07/12: DB-Dump automatisch erzeugen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Täglich einen vollständigen, importierbaren System-Dump erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Backup-Scheduler ist aktiv.</li><li>Zielpfad für Backups und Dumps ist konfiguriert.</li></ul>
<h2>Ablauf</h2>
<ul><li>System erzeugt ein ZIP-Archiv mit <code>data.json</code>, <code>manifest.json</code> und Anhängen.</li><li><code>data.json</code> enthält die Anwendungstabellen einschließlich <code>users</code>.</li><li>Benutzer werden mit <code>roleCode</code> exportiert; lokale Rollen-IDs werden nicht übertragen.</li><li><code>manifest.json</code> enthält Tabellen-Counts, Tabellen-Hashes und Upload-Summen.</li><li>System speichert den Dump serverseitig und protokolliert Fehler.</li></ul>
<h2>Alternativen</h2>
<ul><li>Dump-Erzeugung schlägt fehl → Fehler wird protokolliert, der normale Betrieb läuft weiter.</li></ul>
<h2>Ergebnis</h2>
<p>Ein vollständiges Dump-Archiv liegt für Download und späteren Import bereit.</p>