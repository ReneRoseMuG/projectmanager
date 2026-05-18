<h1>UC 26/06: Auftragsliste konfigurieren und erzeugen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-26-auswertungen-und-reports.md">FT (26): Auswertungen und Reports</a></li><li>Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254</li><li>Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert</li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer.</p>
<h2>Ziel</h2>
<p>Der Benutzer ruft die Auftragsliste auf, konfiguriert Zeitraum und Filter und erzeugt die Kachelausgabe.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li><li>Der Navigationspunkt Reports ist verfügbar.</li><li>Es existieren Projekte mit Terminen oder der Report kann einen leeren Zustand anzeigen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer öffnet Reports und wählt Auftragsliste.<br>2. Das System zeigt das Konfigurationspanel.<br>3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.<br>4. Der Benutzer passt optional Zeitraum, Kategorieauswahl, Tag-Filter, Sauna-Modell-Auswahl oder Shortcode-Schalter an.<br>Der Tag-Filter bietet Nicht-System-Tags sowie die Report-Tags Sondermaß und Anmerkungen an. Sperr- und Workflow-Tags wie Reklamation, Storniert oder Geparkt sind dort nicht wählbar.<br>5. Der Benutzer klickt auf Report erzeugen.<br>6. Das System ermittelt Projekte mit mindestens einem gültigen Termin im konfigurierten Zeitraum.<br>7. Das System schließt Projekte und Termine mit Reklamation-Tag oder Storniert-Tag vollständig aus.<br>8. Das System zeigt die Ergebnisse als Kachelraster, aufsteigend nach repräsentativem Termin.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.</li><li>Keine passenden Einträge: Das System zeigt einen leeren Report-Zustand.</li><li>Der Benutzer wendet ein Preset an: Das System setzt die gespeicherte Konfiguration, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.</li></ul>
<h2>Ergebnis</h2>
<p>Die Auftragsliste ist sichtbar. Die Filter- und Kategorieauswahl wurde nicht automatisch als Setting gespeichert. Wenn der Benutzer die Konfiguration dauerhaft sichern möchte, speichert er sie ausdrücklich als Preset.</p>