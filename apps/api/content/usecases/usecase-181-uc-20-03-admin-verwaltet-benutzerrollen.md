<h1>UC 20/03: Admin verwaltet Benutzerrollen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md">FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Die Rolle eines bestehenden Benutzers ändern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Admin.</li><li>Der zu ändernde Benutzer existiert.</li><li>Mindestens ein Admin bleibt im System erhalten.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Benutzerverwaltung.<br>2. Akteur wählt einen Benutzer aus.<br>3. Akteur wählt eine neue Rolle.<br>4. Das System prüft, ob durch die Änderung kein letzter Admin entfernt wird.<br>5. Das System speichert die neue Rolle.<br>6. Das System macht die neue Rolle unmittelbar wirksam.</p>
<h2>Alternativen</h2>
<ul><li>Der zu ändernde Benutzer existiert nicht → System antwortet mit 404.</li><li>Die Änderung würde den letzten Admin entfernen → System blockiert mit 409.</li><li>Der Akteur besitzt keine Admin-Rolle → System blockiert mit 403.</li></ul>
<h2>Ergebnis</h2>
<p>Die neue Rolle ist persistiert.</p>
<p>Die Berechtigungen des betroffenen Benutzers ändern sich entsprechend.</p>