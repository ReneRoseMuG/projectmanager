<h1>UC 13/08: Notizvorlage erstellen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Notizvorlage anlegen, die bei der Erstellung von Notizen ausgewählt werden kann.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Vorlagenverwaltung.<br>2. Der Akteur wählt die Funktion „Vorlage hinzufügen&quot;.<br>3. Das System öffnet einen Editor zur Erfassung der Vorlagendaten.<br>4. Der Akteur erfasst mindestens Titel und vordefinierten Inhalt.<br>5. Optional legt der Akteur eine Sortierreihenfolge fest.<br>6. Optional legt der Administrator eine Kennzeichnungsfarbe (<code>color</code>) fest. Disponenten können die Kennzeichnungsfarbe nicht setzen oder ändern.<br>7. Der Akteur bestätigt die Eingabe.<br>8. Das System prüft serverseitig:</p>
<ul><li>Authentifizierung,</li><li>Berechtigung,</li><li>Validierung der Pflichtfelder.</li></ul>
<p>9. Das System erstellt die Vorlage mit folgenden Initialwerten:</p>
<ul><li><code>is_active = true</code>,</li><li>Setzen von <code>created_at</code> und <code>updated_at</code>.</li></ul>
<p>10. Das System speichert die Vorlage persistent.<br>11. Das System aktualisiert die Vorlagenliste gemäß definierter Sortierlogik.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder fehlen → Validierungsfehler, keine Persistierung.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Persistierung.</li><li>Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Persistierung.</li><li>Technischer Fehler → HTTP 500, keine Persistierung.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Eine neue Notizvorlage existiert persistent.</li><li>Die Vorlage ist aktiv (<code>is_active = true</code>) und erscheint in der Auswahlliste bei der Notizerstellung.</li><li>Die Kennzeichnungsfarbe ist ausschließlich gesetzt, wenn sie durch einen Administrator definiert wurde.</li><li>Es entstehen keine Seiteneffekte auf bereits bestehende Notizen.</li></ul>