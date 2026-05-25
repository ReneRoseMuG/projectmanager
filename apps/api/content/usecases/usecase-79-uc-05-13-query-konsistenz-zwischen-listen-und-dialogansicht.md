<h1>UC 05/13: Query-Konsistenz zwischen Listen- und Dialogansicht</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass die in der Mitarbeiterliste angezeigten aktiven Mitarbeiter mit den in Dialoglisten zur Terminzuweisung verfügbaren Mitarbeitern konsistent sind.</p>
<h2>Vorbedingungen</h2>
<ul><li>Mitarbeiter existieren im System.</li><li>Mindestens ein Mitarbeiter ist deaktiviert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Leserechte für Mitarbeiter.</li></ul>
<h2>Ablauf</h2>
<ol><li>Akteur öffnet die Mitarbeiterlistenansicht.</li><li>System lädt Mitarbeiterdaten gemäß Rollenregel:<ul><li>Administrator erhält aktive und inaktive Mitarbeiter.</li><li>Disponent erhält ausschließlich aktive Mitarbeiter.</li></ul></li><li>Akteur öffnet ein Terminformular.</li><li>System lädt die Mitarbeiterauswahlliste.</li><li>System wendet dieselbe Aktiv-Filterlogik an.</li><li>System stellt sicher, dass die Ergebnismenge identisch zur Listenlogik ist.</li></ol>
<h2>Alternativen</h2>
<ul><li>Ein Mitarbeiter wird zwischenzeitlich deaktiviert → Bei erneuter Abfrage erscheinen die Daten konsistent gefiltert.</li><li>Unterschiedliche API-Endpunkte liefern unterschiedliche Filter → System muss als fehlerhaft betrachtet werden.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Disponenten sehen in Listen- und Dialogansicht ausschließlich aktive Mitarbeiter.</li><li>Administratoren sehen in der Stammdatenliste aktive und inaktive Mitarbeiter.</li><li>Dialoglisten zur Terminzuweisung enthalten niemals deaktivierte Mitarbeiter.</li><li>Es existiert keine Divergenz zwischen:<ul><li>GET <code>/employees</code></li><li>GET <code>/employees?active=true</code></li><li>internen Dialogabfragen.</li></ul></li><li>Integrationstests können prüfen:<ul><li>gleiche Anzahl aktiver Mitarbeiter in Liste und Dialog</li><li>deaktivierter Mitarbeiter erscheint in keiner Zuweisungsauswahl.</li></ul></li></ul>