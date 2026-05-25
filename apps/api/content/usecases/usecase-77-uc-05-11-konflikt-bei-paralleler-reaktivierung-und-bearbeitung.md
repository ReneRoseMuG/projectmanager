<h1>UC 05/11: Konflikt bei paralleler Reaktivierung und Bearbeitung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Verhindern, dass bei gleichzeitiger Reaktivierung und Bearbeitung widersprüchliche Zustände entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Mitarbeiter existiert und ist deaktiviert.</li><li>Zwei Akteure sind angemeldet.</li><li>Der Datensatz besitzt eine Versionskennung.</li></ul>
<h2>Ablauf</h2>
<ol><li>Akteur A öffnet den deaktivierten Mitarbeiter.</li><li>Akteur B öffnet denselben Mitarbeiter.</li><li>Akteur A reaktiviert den Mitarbeiter.</li><li>System setzt <code>is_active = true</code> und erhöht die Version.</li><li>Akteur B ändert Stammdaten auf Basis der alten Version.</li><li>Akteur B speichert.</li><li>System erkennt Versionsabweichung.</li><li>System blockiert den Speichervorgang.</li></ol>
<h2>Alternativen</h2>
<ul><li>Akteur B lädt neu → Kein Konflikt.</li><li>Reaktivierung erfolgt nach erfolgreicher Bearbeitung → Kein Konflikt.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Kein Zustand wird überschrieben.</li><li>HTTP 409 bei Versionskonflikt.</li><li>Der gültige Zustand bleibt erhalten.</li><li>Keine Terminzuweisungen werden verändert.</li></ul>