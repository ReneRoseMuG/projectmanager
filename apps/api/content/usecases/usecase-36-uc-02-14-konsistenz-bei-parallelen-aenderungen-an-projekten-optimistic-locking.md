<h1>UC 02/14: Konsistenz bei parallelen Änderungen an Projekten (Optimistic Locking)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass parallele Änderungen an einem Projekt keine inkonsistenten Zustände oder stillen Überschreibungen verursachen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Beide Akteure sind authentifiziert.</li><li>Projekt wird von mindestens zwei Akteuren parallel geöffnet.</li><li>Projekt besitzt ein Versionsmerkmal (<code>version</code>).</li><li>Beide Akteure besitzen Änderungsrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur A und Akteur B öffnen dasselbe Projekt.<br>2. Akteur A ändert Projektdaten und speichert.<br>3. System erhöht die Projektversion.<br>4. Akteur B ändert Projektdaten auf Basis der alten Version und speichert.<br>5. System erkennt die veraltete Versionsbasis.<br>6. System verweigert das Speichern mit HTTP 409 VERSION_CONFLICT.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Änderungsrechte → HTTP 403.</li><li>Keine parallele Änderung → Speichern erfolgt regulär.</li><li>Akteur B lädt das Projekt nach dem Konflikt neu → Aktuelle Version wird geladen und kann bearbeitet werden.</li></ul>
<h2>Ergebnis</h2>
<p>Es kommt zu keiner stillen Überschreibung von Projektdaten.</p>
<p>Das Projekt bleibt in einem konsistenten Zustand.</p>
<p>Abhängige Sichten zeigen ausschließlich den zuletzt erfolgreich gespeicherten Zustand.</p>