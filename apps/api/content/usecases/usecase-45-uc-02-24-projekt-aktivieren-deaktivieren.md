<h1>UC 02/24: Projekt aktivieren / deaktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Ein Projekt als aktiv oder inaktiv kennzeichnen, ohne es zu löschen. Inaktive Projekte werden in der Standardliste nicht angezeigt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).</li><li>Das Projekt besitzt ein Versionsmerkmal.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet das Projekt.<br>2. Der Akteur ändert den Aktiv-Status (Toggle <code>is_active</code>).<br>3. Das System ändert <code>is_active</code> via PATCH und prüft das Versionsmerkmal.<br>4. Das System persistiert die Änderung und erhöht die Version.<br>5. Das System aktualisiert die Projektliste: Inaktive Projekte erscheinen nur bei explizitem Filter <code>filter=inactive</code> oder <code>filter=all</code>.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Änderungsrechte → HTTP 403.</li><li>Versionskonflikt → HTTP 409 VERSION_CONFLICT.</li><li>Technischer Fehler → HTTP 500.</li></ul>
<h2>Ergebnis</h2>
<p>Der <code>is_active</code>-Wert ist geändert. Inaktive Projekte sind in der Standard-Projektliste nicht sichtbar. Termine und Notizen des Projekts bleiben unverändert.</p>