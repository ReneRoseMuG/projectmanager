<h1>UC 05/09: Konflikt bei paralleler Deaktivierung und Terminzuweisung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Verhindern, dass ein zwischenzeitlich deaktivierter Mitarbeiter einem Termin neu zugewiesen wird.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Mitarbeiter existiert und ist aktiv.</li><li>Ein Termin existiert.</li><li>Zwei Akteure sind gleichzeitig angemeldet.</li><li>Der Mitarbeiter ist im Terminformular auswählbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur A öffnet das Terminformular.<br>2. System lädt aktive Mitarbeiter zur Auswahl.<br>3. Akteur A wählt den Mitarbeiter aus.<br>4. Vor dem Speichern deaktiviert Akteur B denselben Mitarbeiter.<br>5. System setzt <code>is_active = false</code>.<br>6. Akteur A speichert den Termin.<br>7. System prüft beim Speichern:</p>
<ul><li>ob alle ausgewählten Mitarbeiter weiterhin aktiv sind.</li></ul>
<p>8. System erkennt, dass der Mitarbeiter deaktiviert wurde.<br>9. System blockiert den Speichervorgang.</p>
<h2>Alternativen</h2>
<ul><li>Deaktivierung erfolgt nach erfolgreicher Termin-Speicherung →</li></ul>
<p>Termin bleibt gültig, da Zuweisung vor Deaktivierung erfolgte.</p>
<ul><li>Akteur A lädt das Formular neu →</li></ul>
<p>Der deaktivierte Mitarbeiter erscheint nicht mehr in der Auswahl.</p>
<ul><li>Einer der Akteure bricht ab →</li></ul>
<p>Kein Konflikt.</p>
<h2>Ergebnis</h2>
<ul><li>Ein deaktivierter Mitarbeiter kann nicht neu einem Termin zugewiesen werden.</li><li>Das System antwortet mit HTTP 409 Conflict oder 400 Validation Error.</li><li>Die Fehlermeldung weist auf den zwischenzeitlich deaktivierten Mitarbeiter hin.</li><li>Es entsteht kein inkonsistenter Zustand.</li><li>Bereits bestehende Terminzuweisungen bleiben unverändert.</li><li>Historische Termine bleiben unverändert.</li></ul>