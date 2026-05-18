<h1>UC 02/22: Notiz von Projekt entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Eine Notiz dauerhaft vom Projekt entfernen, ohne andere Projekt-Daten zu verändern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte (Disponent oder Administrator).</li><li>Dem Projekt ist mindestens eine Notiz zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Notizen&quot;.<br>2. Der Akteur wählt eine Notiz und betätigt die Löschaktion.<br>3. Das System zeigt eine Sicherheitsrückfrage.<br>4. Der Akteur bestätigt die Löschung.<br>5. Das System prüft Authentifizierung, Berechtigung und Existenz der Notiz-Projekt-Relation.<br>6. Das System löscht die Notiz und deren Relation zum Projekt physisch.<br>7. Das System aktualisiert die Notizliste gemäß Sortierlogik.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Schreibrechte → HTTP 403.</li><li>Notiz nicht vorhanden → HTTP 404.</li><li>Akteur bricht Rückfrage ab → keine Änderung, Notiz bleibt erhalten.</li><li>Technischer Fehler → HTTP 500, Notiz bleibt erhalten.</li></ul>
<h2>Ergebnis</h2>
<p>Die Notiz ist physisch gelöscht. Die Notizliste des Projekts ist aktualisiert. Alle anderen Projektdaten (Tags, Anhänge, Termine) bleiben unverändert.</p>