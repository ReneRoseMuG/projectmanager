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
<p>1. Akteur öffnet die Mitarbeiterverwaltung.<br>2. Akteur wählt einen bestehenden Mitarbeiter.<br>3. Akteur löst die Löschaktion aus.<br>4. System prüft, ob Terminreferenzen existieren.<br>5. System erkennt mindestens eine bestehende Zuordnung.<br>6. System blockiert den Löschvorgang.</p>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter besitzt keine Terminreferenzen →</li></ul>
<p>System erlaubt die Löschung.</p>
<ul><li>Mitarbeiter existiert nicht →</li></ul>
<p>System antwortet mit 404.</p>
<ul><li>Akteur ohne Administratorrolle →</li></ul>
<p>System blockiert mit 403.</p>
<ul><li>Technischer Fehler →</li></ul>
<p>System antwortet mit 500.</p>
<h2>Ergebnis</h2>
<ul><li>Mitarbeiter bleibt im System erhalten.</li><li>Es entstehen keine verwaisten Terminreferenzen.</li><li>System antwortet mit HTTP 409 Conflict bei bestehender Referenz.</li><li>Die Datenbank bleibt konsistent.</li></ul>