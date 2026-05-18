<h1>UC 07/13: DB-Dump herunterladen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen vorhandenen DB-Dump herunterladen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Administrator ist angemeldet.</li><li>Dump-Datei existiert serverseitig.</li></ul>
<h2>Ablauf</h2>
<ul><li>Administrator öffnet die Dump- oder Backup-Ansicht.</li><li>System listet vorhandene Dumps.</li><li>Administrator lädt einen Dump herunter.</li><li>System liefert das ZIP-Archiv aus.</li></ul>
<h2>Alternativen</h2>
<ul><li>Nicht-Admin ruft den Endpunkt auf → Zugriff wird serverseitig verweigert.</li><li>Datei existiert nicht → System liefert einen fachlichen Fehler.</li></ul>
<h2>Ergebnis</h2>
<p>Der Administrator erhält das Dump-ZIP. Es kann sensible Auth-Daten wie Passwort-Hashes und 2FA-Felder enthalten und muss entsprechend geschützt behandelt werden.</p>