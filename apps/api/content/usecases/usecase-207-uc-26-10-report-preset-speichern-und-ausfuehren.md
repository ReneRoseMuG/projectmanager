<h1>UC 26/10: Report-Preset speichern und ausführen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-26-auswertungen-und-reports.md">FT (26): Auswertungen und Reports</a></li><li>Status: Abgeschlossen</li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer. GLOBAL-Presets dürfen nur Admins verwalten.</p>
<h2>Ziel</h2>
<p>Der Benutzer speichert eine Report-Konfiguration bewusst als Preset und führt dieses Preset später erneut aus.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li><li>Ein Report-Konfigurationspanel ist geöffnet.</li><li>Die aktuelle Konfiguration ist fachlich gültig.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer konfiguriert einen Report.<br>2. Der Benutzer wählt Preset speichern.<br>3. Das System fragt mindestens den Preset-Namen und den Scope ab.<br>4. Das System erlaubt jedem Benutzer den Scope USER.<br>5. Das System erlaubt den Scope GLOBAL nur Admins.<br>6. Das System speichert die Konfiguration serverseitig als Preset.<br>7. Der Benutzer wählt später ein Preset aus.<br>8. Das System lädt das Preset, validiert Scope und Report-Key und setzt die gespeicherte Konfiguration in den Report.<br>9. Enthält das Preset dynamische Kalenderwochen, löst das System Start aktuelle KW oder Start kommende KW mit Anzahl KW in eine konkrete Datumsspanne auf.<br>10. Enthält das Preset Aktionen, führt das System die erlaubten Aktionen in definierter Reihenfolge aus.</p>
<h2>Alternativen</h2>
<ul><li>Der Benutzer versucht, ein GLOBAL-Preset ohne Admin-Recht zu speichern: Das System verweigert die Änderung serverseitig.</li><li>Das Preset enthält einen ungültigen Report-Key oder eine ungültige Aktion: Das System verweigert die Speicherung oder Ausführung.</li><li>Das Preset gehört einem anderen Benutzer und ist USER-gescoped: Das System zeigt es nicht an und erlaubt keinen direkten Zugriff.</li></ul>
<h2>Ergebnis</h2>
<p>Das Preset steht im zulässigen Scope zur Verfügung. Es ersetzt keine stille Settings-Persistenz; es wird nur durch ausdrückliche Benutzeraktion gespeichert und angewendet.</p>