<h1>UC 05/10: Löschversuch bei bestehenden Terminreferenzen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ein Mitarbeiter nicht gelöscht werden kann, wenn noch Terminreferenzen bestehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Mitarbeiter existiert.</li><li>Mindestens ein Termin enthält den Mitarbeiter in seiner gespeicherten Mitarbeiterliste.</li><li>Der Akteur besitzt Administratorrechte.</li></ul>
<h2>Ablauf</h2>
<ol><li>Akteur öffnet die Mitarbeiterverwaltung.</li><li>Akteur wählt einen bestehenden Mitarbeiter.</li><li>Akteur löst die Löschaktion aus.</li><li>System prüft, ob Terminreferenzen existieren.</li><li>System erkennt mindestens eine bestehende Zuordnung.</li><li>System blockiert den Löschvorgang.</li></ol>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter besitzt keine Terminreferenzen → System erlaubt die Löschung.</li><li>Mitarbeiter existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Administratorrolle → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Mitarbeiter bleibt im System erhalten.</li><li>Es entstehen keine verwaisten Terminreferenzen.</li><li>System antwortet mit HTTP 409 Conflict bei bestehender Referenz.</li><li>Die Datenbank bleibt konsistent.</li></ul>