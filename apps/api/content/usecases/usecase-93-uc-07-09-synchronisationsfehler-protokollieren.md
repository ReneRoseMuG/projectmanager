<h1>UC 07/09: Synchronisationsfehler protokollieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Nachvollziehbarkeit von Synchronisationsproblemen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Fehler bei API-Kommunikation.</li></ul>
<h2>Ablauf</h2>
<ul><li>System speichert Fehlermeldung.</li><li>Termin bleibt intern unverändert.</li><li>Optional Retry bei nächstem Lauf.</li></ul>
<h2>Alternativen</h2>
<p>Keine.</p>
<h2>Ergebnis</h2>
<p>Synchronisationsprobleme sind nachvollziehbar, Fachlogik bleibt stabil.</p>