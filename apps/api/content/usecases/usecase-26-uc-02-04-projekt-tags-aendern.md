<h1>UC 02/04: Projekt-Tags ändern</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Projektbezogene Tags über das universelle Tagging-System anpassen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).</li><li>Die gewünschten Tags existieren gemäß FT (28).</li><li>Die gewünschten Tags sind frei verwendbare Tags und keine geschützten System-Tags.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet ein Projekt.<br>2. Der Akteur fügt einen frei verwendbaren projektbezogenen Tag hinzu oder entfernt einen vorhandenen frei verwendbaren Tag.<br>3. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung und Rolle (Disponent oder Administrator),</li><li>Existenz des Projekts,</li><li>Existenz des Tags,</li><li>ob der Tag ein System-Tag ist (<code>isDefault = true</code>) — diese sind geschützt und können weder hinzugefügt noch entfernt werden.</li></ul>
<p>4. Das System prüft das Versionsmerkmal der Tag-Relation (bei Entfernen).<br>5. Das System speichert die Änderung der Tag-Zuordnung atomar.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Änderungsrechte (Leser) → HTTP 403.</li><li>Tag existiert nicht → HTTP 404.</li><li>Tag ist ein geschützter System-Tag (<code>isDefault = true</code>) → HTTP 409 WORKFLOW_TAG_PROTECTED.</li><li><strong>Reklamation</strong> ist ein geschützter System-Tag und wird nicht über diesen Use Case geändert. Dafür gilt UC 06/02.</li><li>Doppelte Tag-Zuweisung → System verhindert Mehrfacheintrag.</li><li>Versionskonflikt bei paralleler Tag-Änderung → HTTP 409 VERSION_CONFLICT.</li><li>Technischer Fehler → HTTP 500.</li></ul>
<h2>Ergebnis</h2>
<p>Die frei verwendbaren projektbezogenen Tags sind aktualisiert. System-Tags bleiben von manuellen Änderungen unberührt. Die Tag-Änderung folgt den Regeln aus FT (28); Reklamationen folgen dem Workflow aus FT (06).</p>