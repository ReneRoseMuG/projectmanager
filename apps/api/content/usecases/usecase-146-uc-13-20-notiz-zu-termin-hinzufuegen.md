<h1>UC 13/20: Notiz zu Termin hinzufügen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Notiz erstellen und eindeutig einem bestehenden Termin zuordnen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Der Termin ist nicht historisch (Startdatum liegt nicht in der Vergangenheit).</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte für Notizen (Disponent oder Administrator).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular.<br>2. Der Akteur navigiert zum Bereich „Notizen&quot; und wählt „Notiz hinzufügen&quot;.<br>3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.<br>4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.<br>5. Optional wählt der Akteur eine Vorlage.<br>6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.<br>7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (<code>color</code>), übernimmt das System diese einmalig in die neue Notiz.<br>8. Der Akteur erfasst oder ändert Titel und Beschreibung der Notiz.<br>9. Der Akteur bestätigt die Eingabe.<br>10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.<br>11. Das System prüft, dass der Termin nicht historisch ist.<br>12. Das System erstellt die Notiz mit folgenden Initialwerten:</p>
<ul><li>Referenz ausschließlich auf den Termin</li><li><code>is_pinned = false</code></li><li>Setzen von <code>created_at</code> und <code>updated_at</code></li></ul>
<p>13. Das System speichert die Notiz persistent.<br>14. Das System aktualisiert die Notizliste im Terminformular und in allen Terminkontexten gemäß Sortierlogik.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.</li><li>Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.</li><li>Der Akteur besitzt keine ausreichende Rolle (Leser) → HTTP 403, keine Speicherung.</li><li>Der Termin ist historisch → Das System blockiert die Aktion; Notizen an historischen Terminen können nicht angelegt werden.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler bei Speicherung → HTTP 500, keine persistente Notiz entsteht.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Eine neue Notiz existiert persistent.</li><li>Die Notiz ist ausschließlich dem Termin zugeordnet.</li><li>Die Notiz erscheint in der Notizliste im Terminformular und in allen Terminkontexten (Kalenderansichten, Terminkarten, Previews).</li><li>Es entstehen keine zusätzlichen Referenzen oder Seiteneffekte in anderen Domänen.</li></ul>