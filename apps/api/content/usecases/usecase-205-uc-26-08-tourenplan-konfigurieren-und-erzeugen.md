<h1>UC 26/08: Tourenplan konfigurieren und erzeugen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-26-auswertungen-und-reports.md">FT (26): Auswertungen und Reports</a></li><li>Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254</li><li>Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert</li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer.</p>
<h2>Ziel</h2>
<p>Der Benutzer ruft den Tourenplan auf, wählt Tour und Zeitraum und erzeugt die Kartenansicht.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li><li>Der Navigationspunkt Reports ist verfügbar.</li><li>Es existieren Touren oder die Option Ohne Tour ist fachlich nutzbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer öffnet Reports und wählt Tourenplan.<br>2. Das System zeigt das Konfigurationspanel.<br>3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.<br>4. Der Benutzer wählt eine Tour oder Ohne Tour.<br>5. Der Benutzer passt optional Zeitraum, Shortcode-Schalter, Druckmodus oder Vorschauoptionen an.<br>6. Der Benutzer klickt auf Report erzeugen.<br>7. Das System ermittelt die Termine der gewählten Tour im konfigurierten Zeitraum.<br>8. Das System gruppiert Karten nach Kalenderwoche und wendet die Tag-Priorität für die Darstellung an.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.</li><li>Keine passenden Termine: Das System zeigt einen leeren Report-Zustand.</li><li>Der Benutzer wendet ein Preset an: Das System setzt Tour, Zeitraum, Optionen, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.</li></ul>
<h2>Ergebnis</h2>
<p>Der Tourenplan ist sichtbar. Tour-Auswahl, Zeitraum, Druckmodus und Vorschauoptionen wurden nicht automatisch als Setting gespeichert. Wenn der Benutzer die Konfiguration dauerhaft sichern möchte, speichert er sie ausdrücklich als Preset.</p>