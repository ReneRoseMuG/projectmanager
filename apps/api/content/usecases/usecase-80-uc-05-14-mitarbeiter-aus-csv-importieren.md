<h1>UC 05/14: Mitarbeiter aus CSV importieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Der Administrator lädt eine CSV-Datei mit Mitarbeiterdaten hoch. Das System importiert die Mitarbeiter und weist auf Duplikate hin, die nicht übernommen werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Administrator ist angemeldet</li><li>Eine CSV-Datei mit Mitarbeiterdaten liegt vor (Spalten: Vorname, Nachname)</li><li>Der Administrator hat explizit entschieden: &quot;Mitarbeiter-Import&quot;</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet den Import-Bereich und wählt &quot;Mitarbeiter-Import aus CSV&quot;<br>2. Der Administrator lädt die CSV-Datei hoch<br>3. Das System liest die Datei ein und prüft das Format (Spalten: Vorname, Nachname vorhanden?)<br>4. Das System führt pro Zeile eine Duplikat-Prüfung durch: Existiert die Kombination Vorname+Nachname bereits?<br>5. Das System unterteilt die Zeilen in zwei Gruppen: &quot;übernehmbar&quot; und &quot;Duplikat erkannt&quot;<br>6. Das System importiert alle &quot;übernehmbar&quot;-Zeilen in die Mitarbeitertabelle<br>7. Das System erzeugt einen Import-Report mit:</p>
<ul><li>Summe: X Mitarbeiter importiert, Y Duplikate ausgelassen</li><li>Detail: Auflistung aller Zeilen mit Duplikat-Fehler (Vorname, Nachname, Grund: &quot;Bereits vorhanden&quot;)</li></ul>
<p>8. Das System zeigt den Report dem Administrator</p>
<h2>Alternativen</h2>
<ul><li>Die CSV ist nicht lesbar oder verletzt das Format (Spalten fehlen) → System bricht ab und zeigt Fehlermeldung, kein Import</li><li>Alle Zeilen sind Duplikate → System importiert nichts, Report zeigt: &quot;0 importiert, X Duplikate&quot;</li><li>Administrator bricht den Upload ab → Kein Import, kein Report</li></ul>
<h2>Ergebnis</h2>
<p>Neue Mitarbeiter sind in der Mitarbeitertabelle angelegt. Duplikate wurden nicht übernommen. Ein Import-Report ist verfügbar mit Summe und Fehlerdetails.</p>