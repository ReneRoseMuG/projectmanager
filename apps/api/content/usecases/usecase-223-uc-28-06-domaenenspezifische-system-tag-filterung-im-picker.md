<h1>UC 28/06: Domänenspezifische System-Tag-Filterung im Picker</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-28-universelles-tagging-system.md">FT (28): Universelles Tagging-System</a></li></ul>
<h2>Akteur</h2>
<p>Administrator oder Disponent.</p>
<h2>Ziel</h2>
<p>Der Akteur sieht im Tag-Picker nur Tags, die in der jeweiligen Domäne manuell zugewiesen werden dürfen. Geschützte System-Tags werden nicht als frei auswählbare Tags angeboten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Es existieren frei verwendbare Tags und geschützte System-Tags.</li><li>Das System kennt die Domäne, für die der Tag-Katalog geladen wird.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Tag-Picker für Kunde, Mitarbeiter, Termin oder Projekt.<br>2. Das System lädt den Tag-Katalog mit Domänenbezug.<br>3. Das System filtert geschützte System-Tags serverseitig aus dem Picker.<br>4. Der Akteur sieht nur Tags, die in dieser Domäne manuell zuweisbar sind.</p>
<h2>Alternativen</h2>
<ul><li>Bei Kunden und Mitarbeitern werden geschützte System-Tags nicht im Picker angeboten.</li><li>Bei Terminen werden geschützte System-Tags nicht im Picker angeboten. <strong>Storniert</strong> wird ausschließlich über den Storno-Workflow gesetzt; <strong>Reklamation</strong> wird ausschließlich über die Reklamationsfunktion gesetzt oder entfernt.</li><li>Bei Projekten werden geschützte System-Tags nicht im Picker angeboten. <strong>Reklamation</strong> wird ausschließlich über die Reklamationsfunktion gesetzt oder entfernt.</li><li>Wenn ein Client einen geschützten System-Tag trotzdem direkt über eine generische Tag-API zuweisen oder entfernen will, muss der Server die Mutation abweisen.</li></ul>
<h2>Ergebnis</h2>
<p>Der Tag-Picker bleibt domänenspezifisch korrekt und bietet keine Systemzustände als frei pflegbare Tags an. Die fachlichen Workflows behalten die Kontrolle über geschützte System-Tags.</p>