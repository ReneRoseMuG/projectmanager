<h1>UC 02/23: Notiz anpinnen / lospinnen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Eine Notiz als wichtig markieren (anpinnen) oder diese Markierung aufheben, sodass sie in der Notizliste priorisiert oder normal einsortiert wird.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte (Disponent oder Administrator).</li><li>Dem Projekt ist mindestens eine Notiz zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Notizen&quot;.<br>2. Der Akteur betätigt den Pin-Toggle an einer Notiz.<br>3. Das System toggelt <code>is_pinned</code> via PATCH <code>api.notes.togglePin</code>.<br>4. Das System aktualisiert die Notizliste: angepinnte Notizen erscheinen oben, nicht angepinnte darunter, jeweils nach <code>updated_at</code> absteigend.</p>
<h2>Alternativen</h2>
<ul><li>Notiz nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Schreibrechte → HTTP 403.</li><li>Technischer Fehler → HTTP 500, <code>is_pinned</code> bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Der <code>is_pinned</code>-Wert der Notiz ist geändert. Die Notizliste ist gemäß Sortierlogik aktualisiert. Vollständige Pinning-Regeln gemäß FT (13).</p>