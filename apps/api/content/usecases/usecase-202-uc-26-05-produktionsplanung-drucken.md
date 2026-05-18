<h1>UC 26/05: Produktionsplanung drucken</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-26-auswertungen-und-reports.md">FT (26): Auswertungen und Reports</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Aus einem generierten Report eine Druckausgabe im Querformat DIN A4 mit Summenreport, Vorlaufliste und Projektzeilen erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Produktionsplanungs-Report wurde erzeugt.</li><li>Das Report-Overlay ist geöffnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur klickt auf „Produktionsplanung drucken“.<br>2. Das System erzeugt die Druckausgabe anhand der aktuellen Parameter für Zeitraum, Kategorie-Layout und Shortcodes.<br>3. Das System rendert den Summenreport.<br>4. Das System rendert die Vorlaufliste mit einer Zeile pro Projekt, Index, ohne Kundendaten, Tourname und Shortcodes, sofern diese aktiv sind.<br>5. Das System rendert Projektzeilen für Sondermaß, Anmerkungen und Gespiegelt als Karten mit Header, Beschreibung und Footer.<br>6. Das System öffnet den Browser-Druckdialog.</p>
<h2>Alternativen</h2>
<ul><li>Für einen Bereich gibt es keine passenden Daten: Das System zeigt dort einen Leerhinweis und rendert die übrigen Bereiche weiter.</li></ul>
<h2>Ergebnis</h2>
<p>Die Produktionsplanung kann gedruckt oder als PDF gespeichert werden. Stornierungen und Reklamationen sind ausgeschlossen.</p>