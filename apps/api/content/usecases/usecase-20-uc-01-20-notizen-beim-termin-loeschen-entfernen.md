<h1>UC 01/20: Notizen beim Termin-Löschen entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass beim Löschen eines Termins auch die zugeordneten Notizen entfernt werden und keine Restzustände entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin liegt nicht in der Vergangenheit.</li><li>Optional: Dem Termin sind Notizen zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet einen bestehenden Termin im Terminformular.<br>2. Der Akteur löst die Löschaktion aus.<br>3. Das System löscht den Termin (siehe UC 01/04).<br>4. Das System entfernt gleichzeitig alle Zuordnungen zwischen Termin und Notizen.<br>5. Das System aktualisiert alle betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht den Löschvorgang ab. Der Termin und seine Notizen bleiben bestehen.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist vollständig gelöscht. Alle Notiz-Zuordnungen zum Termin sind entfernt. Falls die Notizen auch von anderen Objekten (z. B. Projekten oder Kunden) zugeordnet sind, bleiben diese Zuordnungen bestehen. Notizen, die nur diesem Termin zugeordnet waren, werden ebenfalls gelöscht, sofern die Implementierung dies vorsieht.</p>