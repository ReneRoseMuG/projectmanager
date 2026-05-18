<h1>UC 09/20: Notizen beim Kunde-Löschen entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass beim Löschen eines Kunden auch die zugeordneten Notizen entfernt werden und keine Restzustände entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte (Administrator).</li><li>Dem Kunden sind keine Projekte zugeordnet (Bedingung für Kunde-Löschung, siehe UC 09/13).</li><li>Optional: Dem Kunden sind Notizen zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet einen bestehenden Kunden im Kundenformular.<br>2. Der Akteur löst die Löschaktion aus.<br>3. Das System prüft, dass dem Kunden keine Projekte zugeordnet sind (siehe UC 09/13).<br>4. Das System löscht den Kundendatensatz (siehe UC 09/13).<br>5. Das System entfernt gleichzeitig alle Zuordnungen zwischen Kunde und Notizen.<br>6. Das System aktualisiert alle betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht den Löschvorgang ab. Der Kunde und seine Notizen bleiben bestehen.</li><li>Kunde besitzt Projekte: Das System blockiert die Löschung bereits vor diesem Punkt (siehe UC 09/13 und UC 09/14).</li></ul>
<h2>Ergebnis</h2>
<p>Der Kunde ist vollständig gelöscht. Alle Notiz-Zuordnungen zum Kunden sind entfernt. Falls die Notizen auch von anderen Objekten (z. B. Projekten) zugeordnet sind, bleiben diese Zuordnungen bestehen. Notizen, die nur diesem Kunden zugeordnet waren, werden ebenfalls gelöscht, sofern die Implementierung dies vorsieht.</p>