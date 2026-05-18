<h1>UC 02/13: Denormalisierte Projektanzeige aktualisieren (Quersicht-Vertrag)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Änderungen an Projektdaten in allen abhängigen Sichten ohne Inkonsistenz sichtbar werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Projektdaten werden in mindestens einer abhängigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabelle).</li><li>Der Akteur besitzt Änderungsrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur ändert Projektdaten (z. B. Titel, Kunde, Tags oder Beschreibung).<br>2. System speichert die Änderung am Projekt.<br>3. System erkennt betroffene abhängige Sichten.<br>4. System invalidiert veraltete Projektrepräsentationen in diesen Sichten.<br>5. Abhängige Sichten laden die aktualisierten Projektdaten neu.</p>
<h2>Alternativen</h2>
<ul><li>Keine abhängige Sicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.</li><li>Änderung wird verworfen oder schlägt fehl → Keine Sicht wird aktualisiert.</li></ul>
<h2>Ergebnis</h2>
<p>Alle abhängigen Sichten zeigen konsistente und aktuelle Projektdaten.</p>
<p>Es existieren keine veralteten oder widersprüchlichen Projektinformationen im System.</p>