<h1>UC 02/15: Projekt-Join-Konsistenz (Projekt ↔ Tags)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass die Beziehung zwischen Projekt und projektbezogenen Tags jederzeit konsistent, eindeutig und frei von verwaisten Relationen ist.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.</li><li>Mindestens ein projektbezogener Tag ist im System definiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur fügt einem Projekt einen oder mehrere Tags hinzu oder entfernt bestehende Tags gemäß UC 02/04.<br>2. System prüft vor dem Speichern, ob der Tag existiert und für Projekte zulässig ist.<br>3. System verhindert die Mehrfachzuweisung desselben Tags zum selben Projekt.<br>4. System speichert die Join-Änderung atomar.<br>5. Bei Projektlöschung entfernt das System alle zugehörigen Tag-Zuordnungen (Cascade).</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Änderungsrechte → HTTP 403.</li><li>Tag existiert nicht → HTTP 404.</li><li>Tag ist geschützter System-Tag (<code>isDefault = true</code>) → HTTP 409 WORKFLOW_TAG_PROTECTED.</li><li>Parallele Änderung der Tag-Zuordnungen → HTTP 409 VERSION_CONFLICT.</li></ul>
<h2>Ergebnis</h2>
<p>Die Beziehung zwischen Projekt und Tags ist eindeutig und konsistent gespeichert.</p>
<p>Es existieren keine doppelten oder verwaisten Join-Einträge.</p>
<p>Die Integrität bleibt auch bei Projektlöschung gewahrt.</p>