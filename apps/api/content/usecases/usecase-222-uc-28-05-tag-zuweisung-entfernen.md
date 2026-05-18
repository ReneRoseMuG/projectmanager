<h1>UC 28/05: Tag-Zuweisung entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-28-universelles-tagging-system.md">FT (28): Universelles Tagging-System</a></li></ul>
<h2>Akteur</h2>
<p>Administrator oder Disponent.</p>
<h2>Ziel</h2>
<p>Der Akteur entfernt einen frei verwendbaren Tag von einem Domänenobjekt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Domänenobjekt existiert.</li><li>Der Tag ist dem Domänenobjekt zugewiesen.</li><li>Der Tag ist kein geschützter System-Tag.</li><li>Der Akteur besitzt Schreibrechte für das Domänenobjekt.</li><li>Für Termine gelten zusätzlich die fachlichen Schreibsperren aus FT (01).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet ein Domänenobjekt mit Tag-Bereich.<br>2. Das System zeigt die aktuell zugewiesenen Tags an.<br>3. Der Akteur wählt bei einem frei entfernbaren Tag die Entfernen-Aktion.<br>4. Das System entfernt die Tag-Zuweisung serverseitig.<br>5. Das Objekt wird ohne diesen Tag angezeigt.</p>
<h2>Alternativen</h2>
<ul><li>Ist die Relation bereits nicht mehr vorhanden, darf keine fehlerhafte Duplikat- oder Negativrelation entstehen.</li><li>Ist der Tag ein geschützter System-Tag, wird die generische Entfernung serverseitig abgewiesen.</li><li>Der System-Tag <strong>Reklamation</strong> darf nicht über diesen generischen Use Case entfernt werden. Dafür gilt der Reklamationsworkflow aus FT (06).</li><li>Der System-Tag <strong>Storniert</strong> darf nicht über diesen generischen Use Case entfernt werden.</li><li>Fehlen Schreibrechte, wird die Aktion nicht angeboten bzw. serverseitig verboten.</li></ul>
<h2>Ergebnis</h2>
<p>Das Domänenobjekt verliert den frei verwendbaren Tag. Geschützte System-Tags bleiben vor manueller Entfernung geschützt.</p>