<h1>UC 19/07: Verhalten bei Löschung eines Parent-Objekts</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass bei Löschung eines Parent-Objekts keine verwaisten Attachment-Referenzen entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) existiert.</li><li>Dem Parent-Objekt sind ein oder mehrere Attachments zugeordnet.</li><li>Der Akteur besitzt Löschrechte für das Parent-Objekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur initiiert die Löschung des Parent-Objekts.<br>2. Das System prüft die Berechtigung des Akteurs.<br>3. Das System prüft referenzielle Integrität.<br>4. Das System entfernt den Parent-Datensatz gemäß den Regeln des jeweiligen Features.<br>5. Das System stellt sicher, dass Attachment-Datensätze nicht ohne Parent-Zuordnung bestehen bleiben.<br>6. Das System verhindert verwaiste Fremdschlüsselzustände.</p>
<h2>Alternativen</h2>
<ul><li>Parent-Objekt existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Löschrechte → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Es existieren keine verwaisten Attachment-Referenzen.</li><li>Die physische Löschung der Datei erfolgt weiterhin nicht.</li><li>Die Datenbank bleibt konsistent.</li></ul>