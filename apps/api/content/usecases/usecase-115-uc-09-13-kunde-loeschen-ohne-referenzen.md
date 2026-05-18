<h1>UC 09/13: Kunde löschen ohne Referenzen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen Kunden endgültig löschen, sofern keine referenzierenden Projekte existieren, ohne inkonsistente Zustände zu erzeugen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator.</li><li>Dem Kunden sind <strong>keine Projekte</strong> zugeordnet.</li><li>Eine gültige Versionskennung liegt vor.</li></ul>
<p>---</p>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet die Detailansicht des Kunden.<br>2. Der Administrator löst die Aktion „Löschen“ aus.<br>3. Das System prüft:</p>
<ul><li>Berechtigung (Admin-Rolle),</li><li>Versionskennung,</li><li>ob referenzierende Projekte existieren.</li></ul>
<p>4. Das System stellt fest, dass keine Projekte referenzieren.<br>5. Das System löscht den Kundendatensatz.<br>6. Das System löscht alle zugehörigen Notizen über CASCADE (<code>customer_note</code>).<br>7. Das System entfernt alle Attachment-Referenzen zum Kunden (Dateien verbleiben gemäß globaler Regel physisch bestehen, sofern kein anderes Löschkonzept definiert ist).<br>8. Das System bestätigt die Löschung.</p>
<p>---</p>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Admin-Rolle → System blockiert mit 403.</li><li>Versionskonflikt → System blockiert mit 409.</li><li>Referenzierende Projekte vorhanden → System blockiert mit 409 (siehe UC 14).</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Der Kunde existiert nicht mehr im System.</li><li>Es existieren keine verwaisten Notizen oder Attachment-Referenzen.</li><li>Es existieren keine Projekte oder Termine, die auf einen gelöschten Kunden verweisen.</li><li>Der Datenzustand bleibt konsistent.</li></ul>