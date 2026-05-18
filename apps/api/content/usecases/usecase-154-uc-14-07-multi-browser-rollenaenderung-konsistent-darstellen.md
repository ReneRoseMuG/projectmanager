<h1>UC 14/07: Multi-Browser-Rollenänderung konsistent darstellen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Rollenänderungen in parallelen Sitzungen konsistent wirksam werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Benutzer ist in zwei Browsern angemeldet.</li><li>Eine Rolle wird geändert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ändert die Rolle eines Benutzers.<br>2. Das System persistiert die neue Rolle.<br>3. In der zweiten Sitzung wird eine neue Anfrage gestellt.<br>4. Das System prüft die Rolle erneut serverseitig.<br>5. Das System setzt die neue Berechtigungsstufe durch.</p>
<h2>Alternativen</h2>
<ul><li>Sitzung verwendet veraltete Tokens → System validiert bei nächstem Request.</li></ul>
<h2>Ergebnis</h2>
<p>Rollenänderungen wirken konsistent in allen Sitzungen.</p>