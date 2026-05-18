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
<p>1. Akteur öffnet die Mitarbeiterlistenansicht.<br>2. System lädt Mitarbeiterdaten gemäß Rollenregel:</p>
<ul><li>Administrator erhält aktive und inaktive Mitarbeiter.</li><li>Disponent erhält ausschließlich aktive Mitarbeiter.</li></ul>
<p>3. Akteur öffnet ein Terminformular.<br>4. System lädt die Mitarbeiterauswahlliste.<br>5. System wendet dieselbe Aktiv-Filterlogik an.<br>6. System stellt sicher, dass die Ergebnismenge identisch zur Listenlogik ist.</p>
<h2>Alternativen</h2>
<ul><li>Ein Mitarbeiter wird zwischenzeitlich deaktiviert →</li></ul>
<p>Bei erneuter Abfrage erscheinen die Daten konsistent gefiltert.</p>
<ul><li>Unterschiedliche API-Endpunkte liefern unterschiedliche Filter →</li></ul>
<p>System muss als fehlerhaft betrachtet werden.</p>
<h2>Ergebnis</h2>
<ul><li>Disponenten sehen in Listen- und Dialogansicht ausschließlich aktive Mitarbeiter.</li><li>Administratoren sehen in der Stammdatenliste aktive und inaktive Mitarbeiter.</li><li>Dialoglisten zur Terminzuweisung enthalten niemals deaktivierte Mitarbeiter.</li><li>Es existiert keine Divergenz zwischen:</li><li>GET <code>/employees</code></li><li>GET <code>/employees?active=true</code></li><li>internen Dialogabfragen.</li><li>Integrationstests können prüfen:</li><li>gleiche Anzahl aktiver Mitarbeiter in Liste und Dialog</li><li>deaktivierter Mitarbeiter erscheint in keiner Zuweisungsauswahl.</li></ul>