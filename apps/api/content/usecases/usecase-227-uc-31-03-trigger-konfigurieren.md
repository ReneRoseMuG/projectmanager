<h1>UC 31/03: Trigger konfigurieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-31-dispositions-monitoring-konflikte.md">FT (31): Dispositions-Monitoring (Konflikte)</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Trigger-Parameter anpassen, um das Monitoring an die betrieblichen Anforderungen anzupassen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator.</li><li>Die Monitoring-Konfiguration ist erreichbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Monitoring-Konfiguration.<br>2. Das System zeigt alle vorhandenen Trigger mit ihren aktuellen Parametern.<br>3. Der Akteur ändert für einen Trigger Aktivstatus, Vorlaufhorizont oder Triggerbedingungsparameter.<br>4. Der Akteur speichert die Änderungen.<br>5. Das System persistiert die Konfiguration.<br>6. Das System verwendet die neuen Werte bei der nächsten Berechnung.</p>
<h2>Alternativen</h2>
<ul><li>Ungültiger Wert, zum Beispiel Mindestzahl kleiner 1 oder Horizont kleiner 1: Das System blockiert mit Validierungsfehler.</li><li>Der Akteur deaktiviert alle Trigger: Das Monitoring zeigt beim nächsten Login keinen Hinweis.</li></ul>
<h2>Ergebnis</h2>
<p>Die Konfiguration ist gespeichert und wirkt bei der nächsten Berechnung. Bereits laufende Sessions werden nicht beeinflusst.</p>