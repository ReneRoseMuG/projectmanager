<h1>UC 04/04: Tour löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine Tour entfernen, wenn ihr keine Termine zugeordnet sind.</p>
<h2>Beschreibung</h2>
<p>Das Löschen einer Tour ist nur zulässig, wenn keine Termine auf diese Tour verweisen. Mitarbeiterzuordnungen der Tour-Kalenderwochen werden zusammen mit der Tour entfernt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Akteur ist berechtigt.</li><li>Der Tour sind keine Termine zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Tourenverwaltung.<br>2. Der Akteur wählt eine Tour.<br>3. Der Akteur löst die Löschung aus.<br>4. Das System prüft erneut, ob Termine auf die Tour verweisen.<br>5. Das System löscht die Tour.<br>6. Das System löscht kaskadierend alle Tour-KW-Mitarbeiterzuordnungen.<br>7. Das System aktualisiert die betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Die Tour enthält Termine: Das System blockiert die Löschung, die Tour bleibt erhalten.</li><li>Abbruch durch den Akteur: Es wird nichts gelöscht.</li></ul>
<h2>Ergebnis</h2>
<p>Die Tour existiert nicht mehr. Es gibt keine verwaisten Referenzen und die Sichten zeigen die Tour nicht mehr an.</p>