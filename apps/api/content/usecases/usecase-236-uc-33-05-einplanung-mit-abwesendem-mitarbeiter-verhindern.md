<h1>UC 33/05: Einplanung mit abwesendem Mitarbeiter verhindern</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-33-abwesenheiten-ueber-interne-personalplanung.md">FT (33): Abwesenheiten über interne Personalplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Verhindern, dass ein abwesender Mitarbeiter regulär eingeplant wird</p>
<h2>Vorbedingungen</h2>
<p>Für den Mitarbeiter existiert ein Abwesenheitstermin im betreffenden Zeitraum</p>
<h2>Ablauf</h2>
<p>1. Akteur weist einen Mitarbeiter einem regulären Termin zu<br>2. System prüft bestehende Termine des Mitarbeiters im Zeitraum<br>3. System erkennt einen kollidierenden Abwesenheitstermin<br>4. System blockiert die Zuweisung und meldet den Konflikt</p>
<h2>Alternativen</h2>
<ul><li>Keine Überschneidung → Zuweisung wird normal gespeichert.</li><li>Eine neue Abwesenheit kollidiert mit bereits bestehenden regulären Terminen → der dedizierte Abwesenheits-Flow kann nach ausdrücklicher Bestätigung den betroffenen Mitarbeiter aus diesen regulären Terminen entfernen; generische Terminzuweisungen dürfen den Abwesenheitskonflikt nicht still umgehen.</li></ul>
<h2>Ergebnis</h2>
<p>Der abwesende Mitarbeiter wurde nicht dem regulären Termin zugewiesen</p>