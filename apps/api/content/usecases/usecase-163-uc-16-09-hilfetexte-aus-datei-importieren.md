<h1>UC 16/09: Hilfetexte aus Datei importieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Mehrere Hilfetext-Items aus einer Datei in das System übernehmen, um Hilfetexte zentral zu pflegen und außerhalb der Anwendung versionierbar bearbeiten zu können.</p>
<h2>Vorbedingungen</h2>
<p>Der Akteur ist authentifiziert und besitzt Admin-Rechte. Zusätzlich liegt eine Importdatei vor, die eine Menge von Hilfetext-Items enthält, wobei jedes Item mindestens einen eindeutigen <code>help_key</code> sowie einen Inhalt in dem im System definierten Format enthält.</p>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung und startet die Funktion „Hilfetexte importieren“.<br>2. Das System öffnet einen Dialog zur Dateiauswahl und der Akteur wählt die Importdatei aus.<br>3. Das System liest die Datei ein und validiert, dass die Datei syntaktisch korrekt ist und dass jedes Item einen <code>help_key</code> besitzt.<br>4. Das System prüft, dass die <code>help_key</code>Werte innerhalb der Datei eindeutig sind, da pro <code>help_key</code> genau ein Hilfetext existieren darf.<br>5. Das System vergleicht jedes importierte Item anhand des <code>help_key</code> mit dem bestehenden Datensatz im System.<br>6. Wenn ein Datensatz bereits existiert und dessen Inhalt leer ist, überschreibt das System den Datensatz ohne weitere Rückfrage mit dem importierten Inhalt.<br>7. Wenn ein Datensatz bereits existiert und dessen Inhalt nicht leer ist, fordert das System den Akteur für dieses Item zur Entscheidung auf und ermöglicht mindestens „Überschreiben“ oder „Überspringen“.<br>8. Wenn zu einem <code>help_key</code> noch kein Datensatz existiert, legt das System einen neuen Hilfetext an.<br>9. Der Akteur bestätigt den Importlauf und das System übernimmt die Änderungen persistent.</p>
<h2>Alternativen</h2>
<p>Wenn die Datei ungültig ist, ein Pflichtfeld fehlt oder doppelte <code>help_key</code>-Werte in der Datei vorkommen, bricht das System den Import ab und zeigt einen Validierungsfehler an. Wenn der Akteur den Vorgang abbricht, werden keine Änderungen gespeichert.</p>
<h2>Ergebnis</h2>
<p>Die Hilfetexte sind gemäß Regeln importiert. Vorhandene leere Inhalte sind still ersetzt. Bestehende befüllte Inhalte sind nur nach expliziter Entscheidung überschrieben oder übersprungen.</p>