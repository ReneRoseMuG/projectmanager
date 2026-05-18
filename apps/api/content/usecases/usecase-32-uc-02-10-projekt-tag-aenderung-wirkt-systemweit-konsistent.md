<h1>UC 02/10: Projekt-Tag-Änderung wirkt systemweit konsistent</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Tag-Änderungen eines Projekts in allen relevanten Sichten korrekt angezeigt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).</li><li>Mindestens ein projektbezogener Tag ist zugeordnet oder wird geändert.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur ändert die projektbezogenen Tags gemäß UC 02/04.<br>2. System speichert die Tag-Zuordnung.<br>3. System aktualisiert Projektübersichten und Filterergebnisse.<br>4. Terminansichten aktualisieren Tag-Anzeigen, sofern diese angezeigt werden.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Änderungsrechte → HTTP 403.</li><li>Tag wird entfernt → Darstellung aktualisiert sich entsprechend.</li><li>Tag wird hinzugefügt → Darstellung aktualisiert sich entsprechend.</li><li>Versionskonflikt → HTTP 409 VERSION_CONFLICT.</li></ul>
<h2>Ergebnis</h2>
<p>Projekt-Tags sind in allen Sichten identisch sichtbar.</p>
<p>Tagfilter liefern konsistente Ergebnisse.</p>