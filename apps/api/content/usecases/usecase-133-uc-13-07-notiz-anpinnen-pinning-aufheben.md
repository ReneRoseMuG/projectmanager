<h1>UC 13/07: Notiz anpinnen / Pinning aufheben</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Die Position einer bestehenden Notiz innerhalb der Notizenliste deterministisch beeinflussen, indem sie angepinnt oder das Pinning aufgehoben wird.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Notiz existiert.</li><li>Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte für Notizen.</li><li>Die Notiz verfügt über ein Versionierungsmerkmal (z. B. <code>version</code> oder <code>updated_at</code>).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Notizenliste im jeweiligen Parent-Kontext.<br>2. Der Akteur wählt eine bestehende Notiz aus.<br>3. Der Akteur wählt die Funktion „Anpinnen&quot; oder „Pinning aufheben&quot;.<br>4. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Übereinstimmung des Versionsmerkmals.</li></ul>
<p>5. Bei erfolgreicher Prüfung setzt das System <code>is_pinned</code> entsprechend auf TRUE oder FALSE.<br>6. Das System erhöht das Versionsmerkmal und aktualisiert <code>updated_at</code>.<br>7. Das System sortiert die Notizenliste neu gemäß Sortierlogik:</p>
<ul><li>Gepinnte Notizen zuerst,</li><li>danach Sortierung nach <code>updated_at</code> absteigend.</li></ul>
<p>8. Das System rendert die aktualisierte Liste.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.</li><li>Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.</li><li>Technischer Fehler → HTTP 500, keine Änderung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Notiz ist im Erfolgsfall angepinnt oder nicht mehr angepinnt.</li><li>Die Sortierung der Notizenliste ist deterministisch und konsistent.</li><li>Parallele Änderungen führen nicht zu stillen Überschreibungen.</li><li>Es entstehen keine Duplikate oder inkonsistenten Sortierzustände.</li></ul>