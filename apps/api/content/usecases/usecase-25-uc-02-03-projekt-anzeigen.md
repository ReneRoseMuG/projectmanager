<h1>UC 02/03: Projekt anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Alle fachlichen Informationen eines Projekts einsehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt mindestens Leserechte gemäß seiner Rolle.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet ein Projekt.<br>2. Das System prüft serverseitig die Leseberechtigung.<br>3. Das System zeigt Projektdaten (Titel, Beschreibung, Auftragsnummer, Aktiv-Status) und den zugeordneten Kunden mit seinen Stammdaten an.<br>4. Das System zeigt alle dem Projekt zugeordneten Tags an.<br>5. Das System zeigt die Notizenliste an, sortiert nach: angepinnte Notizen (<code>is_pinned = true</code>) zuerst, innerhalb beider Gruppen nach <code>updated_at</code> absteigend. Jede Notiz zeigt Titel, Inhalt (Richtext) und ggf. Kennzeichnungsfarbe (<code>color</code>).<br>6. Das System zeigt die Anhangsliste mit Metadaten (Originaldateiname, Dateigröße, MIME-Typ, Erstellungszeitpunkt) an.<br>7. Das System zeigt alle zugehörigen Termine an.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Leserechte → HTTP 403.</li><li>Projekt besitzt keine Tags → Tagbereich bleibt leer.</li><li>Projekt besitzt keine Notizen → Notizliste ist leer.</li><li>Projekt besitzt keine Anhänge → Anhangsliste ist leer.</li><li>Projekt besitzt keine Termine → Terminliste ist leer.</li></ul>
<h2>Ergebnis</h2>
<p>Vollständiger Überblick über das Projekt. Alle projektbezogenen Informationen (Kunde, Tags, Notizen, Anhänge, Termine) werden konsistent angezeigt. Die Notizliste ist deterministisch sortiert. Es erfolgt keine fachliche Datenänderung.</p>