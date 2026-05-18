<h1>UC 02/09: Projektänderung wird in Terminansichten konsistent dargestellt</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Änderungen an Projektdaten in allen Terminansichten korrekt angezeigt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).</li><li>Dem Projekt sind mindestens ein oder mehrere Termine zugeordnet.</li><li>Eine Terminansicht (Kalender oder Tabelle) ist geöffnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur ändert Projektdaten (z. B. Titel, Kunde oder Beschreibung) gemäß UC 02/02.<br>2. System speichert die Änderung.<br>3. System invalidiert betroffene Ansichten.<br>4. Offene Terminansichten aktualisieren die referenzierten Projektdaten beim nächsten Laden.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Änderungsrechte → HTTP 403.</li><li>Keine Terminansicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.</li><li>Projekt ohne Termine → Keine Terminansicht betroffen.</li></ul>
<h2>Ergebnis</h2>
<p>Alle Terminansichten zeigen konsistente und aktuelle Projektdaten.</p>
<p>Es existieren keine veralteten Projektreferenzen in Termin-Karten.</p>