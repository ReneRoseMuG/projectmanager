<h1>UC 13/17: Wochen-Notizen in Druckausgabe der Kalenderwoche ausgeben</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator, Leser</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass alle einer Kalenderwoche zugeordneten Notizen in der Druckausgabe dieser Woche erscheinen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt mindestens Leserechte.</li><li>Die Druckausgabe für die Kalenderwoche wird ausgelöst.</li><li>Die Woche ist durch <code>year_number</code> und <code>week_number</code> eindeutig adressiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur löst die Druckausgabe für die gewünschte Kalenderwoche aus.<br>2. Das System lädt alle Druckdaten dieser Woche einschließlich der Wochen-Notizen über <code>calendar_week_note</code>.<br>3. Das System sortiert die Wochen-Notizen deterministisch:</p>
<ul><li>Angepinnte Notizen zuerst,</li><li>danach Sortierung nach <code>updated_at</code> absteigend.</li></ul>
<p>4. Das System bettet die Wochen-Notizen an einer konsistenten Position in die Druckausgabe ein, orientiert am vorhandenen Aufbau der Wochendruckansicht.<br>5. Jede Notiz wird in der Druckausgabe mit Titel und Beschreibung dargestellt.<br>6. Das System erzeugt die Druckausgabe und stellt sie dem Akteur bereit.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Druckausgabe.</li><li>Der Akteur besitzt keine Leserechte → HTTP 403, keine Druckausgabe.</li><li>Es existieren keine Wochen-Notizen → Der Notizbereich in der Druckausgabe bleibt leer oder wird ausgeblendet; kein Fehler.</li><li>Technischer Fehler → HTTP 500, keine Druckausgabe.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Wochen-Notizen sind Bestandteil der Druckausgabe der Kalenderwoche.</li><li>Die Darstellung ist konsistent mit den übrigen Wocheninformationen in der Druckansicht.</li><li>Es entsteht kein neues, paralleles Drucksystem.</li><li>Die Druckausgabe verändert keine persistierten Daten.</li></ul>