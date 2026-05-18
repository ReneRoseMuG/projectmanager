<h1>UC 09/06: Kunde reaktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Ein deaktivierter Kunde wird wieder aktiviert, sodass er erneut für neue Projekte auswählbar ist.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator.</li><li>Der Kunde ist aktuell deaktiviert (<code>is_active = false</code>).</li><li>Eine gültige Versionskennung liegt vor.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht eines deaktivierten Kunden.<br>2. Der Akteur löst die Aktion „Reaktivieren“ aus.<br>3. Das System prüft:</p>
<ul><li>Berechtigung (Admin-Rolle),</li><li>Versionskennung (Optimistic Locking).</li></ul>
<p>4. Das System setzt <code>is_active = true</code>.<br>5. Das System persistiert die Änderung.<br>6. Das System erhöht die Versionskennung.<br>7. Das System aktualisiert abhängige Listen- und Auswahlansichten.</p>
<h3>Auswirkungen / Query-Vertrag</h3>
<ul><li>Der Kunde erscheint wieder:</li><li>in Kundenlisten für Disponenten,</li><li>in Projektauswahldialogen,</li><li>in Filtern für aktive Kunden.</li><li>Bestehende Projekte, Termine, Notizen und Anhänge bleiben unverändert.</li><li>Es erfolgt keine automatische Änderung an Projekten oder Terminen.</li></ul>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Admin-Rolle → System blockiert mit 403.</li><li>Versionskonflikt → System blockiert mit 409.</li><li>Kunde bereits aktiv → System antwortet mit 200 ohne Zustandsänderung.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li><code>is_active = true</code>.</li><li>Der Kunde ist wieder vollständig auswählbar.</li><li>Keine fachlichen Seiteneffekte auf bestehende Projekte oder Termine.</li></ul>