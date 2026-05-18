<h1>UC 28/04: Tag an Domänenobjekt zuweisen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-28-universelles-tagging-system.md">FT (28): Universelles Tagging-System</a></li></ul>
<h2>Akteur</h2>
<p>Administrator oder Disponent.</p>
<h2>Ziel</h2>
<p>Der Akteur weist einem Domänenobjekt einen frei verwendbaren Tag zu, um das Objekt fachlich zu markieren und später filtern oder auswerten zu können.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Tag existiert.</li><li>Der Tag ist kein geschützter System-Tag.</li><li>Das Domänenobjekt existiert.</li><li>Der Akteur besitzt Schreibrechte für das Domänenobjekt.</li><li>Für Termine gelten zusätzlich die fachlichen Schreibsperren aus FT (01).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet ein Domänenobjekt mit Tag-Bereich.<br>2. Das System lädt den Tag-Katalog für die jeweilige Domäne.<br>3. Das System zeigt nur Tags an, die für diese Domäne manuell zuweisbar sind.<br>4. Der Akteur wählt einen Tag aus.<br>5. Das System legt die Tag-Zuweisung serverseitig an.<br>6. Das Objekt wird mit dem neuen Tag angezeigt.</p>
<h2>Alternativen</h2>
<ul><li>Ist der Tag bereits zugewiesen, darf keine doppelte Relation entstehen.</li><li>Ist der Tag ein geschützter System-Tag, wird die generische Zuweisung serverseitig abgewiesen.</li><li>Der System-Tag <strong>Reklamation</strong> darf nicht über diesen generischen Use Case gesetzt werden. Dafür gilt der Reklamationsworkflow aus FT (06).</li><li>Der System-Tag <strong>Storniert</strong> darf nicht über diesen generischen Use Case gesetzt werden. Dafür gilt der Storno-Workflow.</li><li>Fehlen Schreibrechte, wird die Aktion nicht angeboten bzw. serverseitig verboten.</li></ul>
<h2>Ergebnis</h2>
<p>Das Domänenobjekt besitzt den ausgewählten frei verwendbaren Tag. Geschützte System-Tags bleiben vor manueller Zuweisung geschützt.</p>