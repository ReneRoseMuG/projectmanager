<h1>UC 31/01: Monitoring-Hinweis beim Login</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-31-dispositions-monitoring-konflikte.md">FT (31): Dispositions-Monitoring (Konflikte)</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Beim Sessionstart eine verständliche Übersicht über aktuelle Dispositionskonflikte erhalten, ohne sofort handeln zu müssen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist angemeldet.</li><li>Der Akteur besitzt Administrator- oder Disponentenrechte.</li><li>Es existieren Termine, die einen aktiven Monitoring-Trigger erfüllen.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur startet eine neue Session oder meldet sich an.<br>2. System lädt die Monitoring-Zusammenfassung.<br>3. System öffnet einmalig einen Konfliktdialog, wenn relevante Konflikte vorliegen.<br>4. Dialog trennt die Konfliktarten, insbesondere Termine ohne ausreichende Mitarbeiter und Termine auf <strong>Parkplatz</strong>.<br>5. Akteur kann den Dialog schließen, ohne eine Änderung vorzunehmen.<br>6. System hält die Konflikte weiterhin im Monitoring sichtbar.</p>
<h2>Alternativen</h2>
<ul><li>Keine Konflikte vorhanden → System zeigt keinen Dialog.</li><li>Leser meldet sich an → System zeigt keinen Monitoring-Hinweis und verweigert direkte Monitoring-Aufrufe serverseitig.</li><li>Konflikte ändern sich während der Session → Aktualisierung erfolgt über die Monitoring-Abfrage, nicht über persistierte Login-Ergebnisse.</li></ul>
<h2>Ergebnis</h2>
<p>Akteur kennt die aktuellen Dispositionskonflikte. Es wurde keine automatische Terminänderung ausgelöst.</p>