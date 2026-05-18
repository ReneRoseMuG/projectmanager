<h1>UC 13/06: Notizen eines Kunden anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator, Leser</p>
<h2>Ziel</h2>
<p>Alle einem Kunden eindeutig zugeordneten Notizen vollständig und konsistent einsehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt mindestens Leserechte für den Kunden.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.<br>2. Das System prüft serverseitig die Leseberechtigung.<br>3. Das System lädt ausschließlich die Notizen, die eindeutig diesem Kunden zugeordnet sind.<br>4. Das System sortiert die Notizen deterministisch:</p>
<ul><li>Angepinnte Notizen (<code>is_pinned = true</code>) erscheinen zuerst.</li><li>Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach <code>updated_at</code> absteigend.</li></ul>
<p>5. Das System rendert die Notizen als vertikale Kärtchenliste.<br>6. Jede Notiz zeigt mindestens:</p>
<ul><li>Titel,</li><li>Beschreibung (Richtext formatiert),</li><li>visuelle Kennzeichnung bei gesetzter <code>color</code>,</li><li>ggf. Pin-Symbol.</li></ul>
<p>7. Enthält der Akteur ausschließlich Leserechte, werden keine Bearbeitungs- oder Löschfunktionen angezeigt.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.</li><li>Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.</li><li>Es existieren keine Notizen → Das System zeigt eine leere Liste ohne Fehler an.</li><li>Technischer Fehler → HTTP 500, keine Anzeige.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Alle kundenspezifischen Notizen sind konsistent sichtbar.</li><li>Es werden ausschließlich Notizen dieses Kunden angezeigt.</li><li>Die Sortierung ist deterministisch und reproduzierbar.</li><li>Die Anzeige verändert keine persistierten Daten und hat keine Seiteneffekte auf Projektnotizen.</li></ul>