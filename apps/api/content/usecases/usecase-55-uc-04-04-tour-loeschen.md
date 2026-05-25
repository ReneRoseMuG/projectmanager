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
<ol><li>Der Akteur öffnet die Tourenverwaltung.</li><li>Der Akteur wählt eine Tour.</li><li>Der Akteur löst die Löschung aus.</li><li>Das System prüft erneut, ob Termine auf die Tour verweisen.</li><li>Das System löscht die Tour.</li><li>Das System löscht kaskadierend alle Tour-KW-Mitarbeiterzuordnungen.</li><li>Das System aktualisiert die betroffenen Sichten.</li></ol>
<h2>Alternativen</h2>
<ul><li>Die Tour enthält Termine: Das System blockiert die Löschung, die Tour bleibt erhalten.</li><li>Abbruch durch den Akteur: Es wird nichts gelöscht.</li></ul>
<h2>Ergebnis</h2>
<p>Die Tour existiert nicht mehr. Es gibt keine verwaisten Referenzen und die Sichten zeigen die Tour nicht mehr an.</p>