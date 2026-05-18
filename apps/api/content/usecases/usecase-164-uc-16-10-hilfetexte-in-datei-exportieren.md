<h1>UC 16/10: Hilfetexte in Datei exportieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Alle Hilfetexte aus dem System in eine Datei exportieren, um sie außerhalb der Anwendung versionierbar abzulegen, zu prüfen und gezielt wieder importieren zu können.</p>
<h2>Vorbedingungen</h2>
<p>Der Akteur ist authentifiziert und besitzt Admin-Rechte. Im System können null bis beliebig viele Hilfetexte existieren.</p>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Hilfetext-Verwaltung und startet die Funktion „Hilfetexte exportieren“.<br>2. Das System lädt alle Hilfetexte aus der Datenhaltung, inklusive <code>help_key</code> und Inhalt sowie optionaler Metadaten, sofern vorhanden.<br>3. Das System schreibt die Datensätze in das definierte Exportformat, wobei pro <code>help_key</code> genau ein Eintrag enthalten ist.<br>4. Das System stellt die Exportdatei zum Download bereit.</p>
<h2>Alternativen</h2>
<p>Wenn keine Hilfetexte vorhanden sind, erzeugt das System eine gültige Exportdatei mit leerer Itemliste. Wenn ein technischer Fehler auftritt, liefert das System eine Fehlermeldung und erzeugt keine Datei.</p>
<h2>Ergebnis</h2>
<p>Eine Exportdatei liegt vor, die alle Hilfetexte vollständig und konsistent enthält und als Grundlage für spätere Änderungen und Re-Import geeignet ist.</p>