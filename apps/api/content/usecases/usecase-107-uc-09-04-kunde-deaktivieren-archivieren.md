<h1>UC 09/04: Kunde deaktivieren / archivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Ein bestehender Kunde wird deaktiviert, sodass er nicht mehr für neue Projekte auswählbar ist, jedoch historisch erhalten bleibt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator.</li><li>Der Kunde ist aktuell aktiv (<code>is_active = true</code>).</li><li>Eine gültige Versionskennung liegt vor.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht eines aktiven Kunden.<br>2. Der Akteur löst die Aktion „Deaktivieren“ aus.<br>3. Das System prüft:</p>
<ul><li>Berechtigung (Admin-Rolle),</li><li>Versionskennung (Optimistic Locking).</li></ul>
<p>4. Das System setzt <code>is_active = false</code>.<br>5. Das System persistiert die Änderung.<br>6. Das System erhöht die Versionskennung.<br>7. Das System aktualisiert abhängige Listen- und Auswahlansichten.</p>
<h3>Auswirkungen / Query-Vertrag</h3>
<ul><li>Der deaktivierte Kunde erscheint nicht mehr:</li><li>in Projektauswahldialogen,</li><li>in Standard-Kundenlisten für Disponenten,</li><li>in Filtern für aktive Kunden.</li><li>Bestehende Projekte und Termine bleiben unverändert referenziert.</li><li>Historische Daten bleiben vollständig erhalten.</li><li>Administratoren können den Kunden weiterhin laden und anzeigen.</li></ul>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Admin-Rolle → System blockiert mit 403.</li><li>Versionskonflikt → System blockiert mit 409.</li><li>Kunde bereits deaktiviert → System antwortet mit 200 ohne Zustandsänderung.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li><code>is_active = false</code>.</li><li>Der Kunde ist archiviert.</li><li>Keine Projekte, Termine, Notizen oder Anhänge werden verändert oder gelöscht.</li><li>Es entstehen keine verwaisten Referenzen.</li></ul>