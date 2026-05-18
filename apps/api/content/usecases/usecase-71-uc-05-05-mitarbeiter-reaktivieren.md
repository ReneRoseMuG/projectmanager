<h1>UC 05/05: Mitarbeiter reaktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen zuvor deaktivierten Mitarbeiter wieder für zukünftige Dispositionsvorgänge freigeben.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Mitarbeiter existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator.</li><li>Der Mitarbeiter ist aktuell deaktiviert (<code>is_active = false</code>).</li><li>Eine gültige Versionskennung liegt vor.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Mitarbeiterverwaltung.<br>2. Akteur wählt einen deaktivierten Mitarbeiter.<br>3. Akteur löst die Aktion „Reaktivieren“ aus.<br>4. System prüft die Berechtigung.<br>5. System prüft die Versionskennung.<br>6. System setzt <code>is_active = true</code>.<br>7. System persistiert die Änderung.<br>8. System erhöht die Versionskennung.<br>9. System aktualisiert abhängige Auswahl- und Listenansichten.</p>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht →</li></ul>
<p>System antwortet mit 404.</p>
<ul><li>Akteur ohne Admin-Rolle →</li></ul>
<p>System blockiert mit 403.</p>
<ul><li>Versionskonflikt →</li></ul>
<p>System blockiert mit 409.</p>
<ul><li>Mitarbeiter bereits aktiv →</li></ul>
<p>System antwortet mit 200 ohne Zustandsänderung.</p>
<ul><li>Technischer Fehler →</li></ul>
<p>System antwortet mit 500.</p>
<h2>Ergebnis</h2>
<ul><li>Mitarbeiter ist wieder aktiv.</li><li><code>is_active = true</code>.</li><li>Bestehende Terminzuordnungen bleiben unverändert.</li><li>Der Mitarbeiter erscheint wieder:</li><li>in Mitarbeiterlisten,</li><li>in Dialogen zur Terminzuweisung,</li><li>in Filtern für aktive Mitarbeiter.</li><li>Es wurden keine bestehenden Termine oder Projekte verändert.</li></ul>