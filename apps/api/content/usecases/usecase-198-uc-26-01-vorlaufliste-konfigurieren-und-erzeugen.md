<h1>UC 26/01: Vorlaufliste konfigurieren und erzeugen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-26-auswertungen-und-reports.md">FT (26): Auswertungen und Reports</a></li><li>Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254</li><li>Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert</li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer.</p>
<h2>Ziel</h2>
<p>Der Benutzer ruft die Vorlaufliste auf, konfiguriert Zeitraum und Spalten und erzeugt die tabellarische Ausgabe.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li><li>Der Navigationspunkt Reports ist verfügbar.</li><li>Es existieren Termine mit Projektzuordnung oder der Report kann einen leeren Zustand anzeigen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer öffnet Reports und wählt Vorlaufliste.<br>2. Das System zeigt das Konfigurationspanel mit den Tabs Datum, Kalenderwoche und Spalten.<br>3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.<br>4. Der Benutzer passt optional Zeitraum, aktiven Tab, Spaltenauswahl, Spaltenreihenfolge, Spaltenbreiten oder Shortcode-Optionen an.<br>5. Der Benutzer klickt auf Report erzeugen.<br>6. Das System ermittelt Termine mit Projektzuordnung im konfigurierten Zeitraum.<br>7. Das System zeigt die Vorlaufliste aufsteigend nach vorgeplantem Termin.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.</li><li>Keine passenden Einträge: Das System zeigt einen leeren Report-Zustand.</li><li>Der Benutzer wendet ein Preset an: Das System setzt die gespeicherte Konfiguration, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.</li></ul>
<h2>Ergebnis</h2>
<p>Die Vorlaufliste ist sichtbar. Änderungen an Zeitraum, Tabs oder Spalten wurden nicht automatisch als Setting gespeichert. Wenn der Benutzer die Konfiguration dauerhaft sichern möchte, speichert er sie ausdrücklich als Preset.</p>