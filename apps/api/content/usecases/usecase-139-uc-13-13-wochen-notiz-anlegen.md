<h1>UC 13/13: Wochen-Notiz anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Notiz erstellen und einer Kalenderwoche eindeutig zuordnen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte für Notizen (keine Leser-Rolle).</li><li>Die Kalenderwoche ist durch <code>year_number</code> und <code>week_number</code> eindeutig adressierbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Kalenderwochen-Kontext der gewünschten Woche.<br>2. Der Akteur wählt die Funktion „Notiz hinzufügen&quot;.<br>3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.<br>4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.<br>5. Optional wählt der Akteur eine Vorlage.<br>6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.<br>7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (<code>color</code>), übernimmt das System diese einmalig in die neue Notiz.<br>8. Der Akteur erfasst oder ändert Titel und Beschreibung.<br>9. Der Akteur bestätigt die Eingabe.<br>10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.<br>11. Das System erstellt die Notiz mit folgenden Initialwerten:</p>
<ul><li>Referenz auf <code>year_number</code> und <code>week_number</code> der Zielwoche</li><li><code>is_pinned = false</code></li><li>Setzen von <code>created_at</code> und <code>updated_at</code></li></ul>
<p>12. Das System speichert die Notiz und den Eintrag in <code>calendar_week_note</code> persistent.<br>13. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext gemäß Sortierlogik.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.</li><li>Der Akteur besitzt Leser-Rolle → HTTP 403, keine Speicherung.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler → HTTP 500, keine persistente Notiz entsteht.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Eine neue Notiz existiert persistent.</li><li>Die Notiz ist über <code>calendar_week_note</code> eindeutig der Kalenderwoche zugeordnet.</li><li>Die Notiz erscheint in der Notizliste des Kalenderwochen-Kontexts.</li><li>Es entstehen keine Referenzen oder Seiteneffekte in anderen Domänen.</li></ul>