<h1>UC 26/03: Produktionsplanung konfigurieren und erzeugen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-26-auswertungen-und-reports.md">FT (26): Auswertungen und Reports</a></li><li>Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254</li><li>Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert</li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer. Das Bearbeiten der globalen Layout-Konfiguration ist Admins vorbehalten.</p>
<h2>Ziel</h2>
<p>Der Benutzer ruft die Produktionsplanung auf, konfiguriert Zeitraum und Optionen und erzeugt die Summenbereiche sowie die Sondermaß-Kacheln.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li><li>Der Navigationspunkt Reports ist verfügbar.</li><li>Die globale Produktionsplanungs-Layout-Konfiguration ist entweder vorhanden oder das System nutzt das Standardlayout.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer öffnet Reports und wählt Produktionsplanung.<br>2. Das System zeigt das Konfigurationspanel.<br>3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.<br>4. Der Benutzer passt optional Zeitraum und Shortcode-Schalter an.<br>5. Optional öffnet ein Admin den Kategorie-Layout-Editor und ändert die globale Layout-Konfiguration.<br>6. Der Benutzer klickt auf Report erzeugen.<br>7. Das System ermittelt Projekte mit Terminen im konfigurierten Zeitraum.<br>8. Das System schließt Projekte und Termine mit Reklamation-Tag oder Storniert-Tag vollständig aus.<br>9. Das System aggregiert Produkt- und Komponentenmengen entsprechend Layout und Shortcode-Konfiguration.<br>10. Das System zeigt unten nur Einzelkacheln für Projekte bzw. Termine, die das System-Tag Sondermaß tragen.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.</li><li>Keine passenden Einträge: Das System zeigt leere Summenbereiche und keinen Kachelbereich.</li><li>Ein Nicht-Admin versucht, die globale Layout-Konfiguration zu ändern: Das System verweigert die Änderung serverseitig.</li><li>Der Benutzer wendet ein Preset an: Das System setzt die gespeicherte Konfiguration, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.</li></ul>
<h2>Ergebnis</h2>
<p>Die Produktionsplanung ist sichtbar. Die Summenbereiche folgen der aktuellen Konfiguration. Der untere Kachelbereich enthält ausschließlich Sondermaß-Kacheln. Anmerkungen oder Gespiegelt allein erzeugen keine Kachel.</p>