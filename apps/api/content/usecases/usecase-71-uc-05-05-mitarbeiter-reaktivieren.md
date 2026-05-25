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
<ol><li>Akteur öffnet die Mitarbeiterverwaltung.</li><li>Akteur wählt einen deaktivierten Mitarbeiter.</li><li>Akteur löst die Aktion „Reaktivieren“ aus.</li><li>System prüft die Berechtigung.</li><li>System prüft die Versionskennung.</li><li>System setzt <code>is_active = true</code>.</li><li>System persistiert die Änderung.</li><li>System erhöht die Versionskennung.</li><li>System aktualisiert abhängige Auswahl- und Listenansichten.</li></ol>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Admin-Rolle → System blockiert mit 403.</li><li>Versionskonflikt → System blockiert mit 409.</li><li>Mitarbeiter bereits aktiv → System antwortet mit 200 ohne Zustandsänderung.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Mitarbeiter ist wieder aktiv.</li><li><code>is_active = true</code>.</li><li>Bestehende Terminzuordnungen bleiben unverändert.</li><li>Der Mitarbeiter erscheint wieder:<ul><li>in Mitarbeiterlisten,</li><li>in Dialogen zur Terminzuweisung,</li><li>in Filtern für aktive Mitarbeiter.</li></ul></li><li>Es wurden keine bestehenden Termine oder Projekte verändert.</li></ul>