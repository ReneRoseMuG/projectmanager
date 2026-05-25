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
<ol><li>Akteur A öffnet das Terminformular.</li><li>System lädt aktive Mitarbeiter zur Auswahl.</li><li>Akteur A wählt den Mitarbeiter aus.</li><li>Vor dem Speichern deaktiviert Akteur B denselben Mitarbeiter.</li><li>System setzt <code>is_active = false</code>.</li><li>Akteur A speichert den Termin.</li><li>System prüft beim Speichern:<ul><li>ob alle ausgewählten Mitarbeiter weiterhin aktiv sind.</li></ul></li><li>System erkennt, dass der Mitarbeiter deaktiviert wurde.</li><li>System blockiert den Speichervorgang.</li></ol>
<h2>Alternativen</h2>
<ul><li>Deaktivierung erfolgt nach erfolgreicher Termin-Speicherung → Termin bleibt gültig, da Zuweisung vor Deaktivierung erfolgte.</li><li>Akteur A lädt das Formular neu → Der deaktivierte Mitarbeiter erscheint nicht mehr in der Auswahl.</li><li>Einer der Akteure bricht ab → Kein Konflikt.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Ein deaktivierter Mitarbeiter kann nicht neu einem Termin zugewiesen werden.</li><li>Das System antwortet mit HTTP 409 Conflict oder 400 Validation Error.</li><li>Die Fehlermeldung weist auf den zwischenzeitlich deaktivierten Mitarbeiter hin.</li><li>Es entsteht kein inkonsistenter Zustand.</li><li>Bereits bestehende Terminzuweisungen bleiben unverändert.</li><li>Historische Termine bleiben unverändert.</li></ul>