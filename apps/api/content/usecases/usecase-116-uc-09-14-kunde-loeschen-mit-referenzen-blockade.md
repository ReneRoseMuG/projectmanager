<h1>UC 09/14: Kunde löschen mit Referenzen (Blockade)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ein Kunde nicht gelöscht werden kann, wenn ihm mindestens ein Projekt zugeordnet ist, um referenzielle Integrität zu gewährleisten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator.</li><li>Dem Kunden ist mindestens ein Projekt zugeordnet.</li><li>Eine gültige Versionskennung liegt vor.</li></ul>
<p>---</p>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet die Detailansicht des Kunden.<br>2. Der Administrator löst die Aktion „Löschen“ aus.<br>3. Das System prüft:</p>
<ul><li>Berechtigung (Admin-Rolle),</li><li>Versionskennung,</li><li>Existenz referenzierender Projekte.</li></ul>
<p>4. Das System stellt fest, dass mindestens ein Projekt existiert.<br>5. Das System blockiert den Löschvorgang.<br>6. Das System antwortet mit 409 (Konflikt) und gibt einen Hinweis auf bestehende Referenzen.</p>
<p>---</p>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Admin-Rolle → System blockiert mit 403.</li><li>Versionskonflikt → System blockiert mit 409.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Der Kunde bleibt unverändert im System bestehen.</li><li>Bestehende Projekte und Termine behalten ihre Referenzen.</li><li>Es entstehen keine verwaisten Fremdschlüssel oder inkonsistenten Zustände.</li></ul>