<h1>UC 18/03: Unberechtigten Zugriff auf persönliche Einstellungen verhindern</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-18-user-preferences.md">FT (18): User Preferences</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser, Admin</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ein Akteur ausschließlich seine eigenen persönlichen Einstellungen einsehen und ändern kann.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Für mindestens einen weiteren Akteur existieren gespeicherte persönliche Einstellungen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ruft den Bereich für persönliche Einstellungen auf.<br>2. Das System ermittelt anhand des Benutzerkontextes die Identität des Akteurs.<br>3. Das System lädt ausschließlich die dem Akteur zugeordneten Einstellungen.<br>4. Der Akteur versucht, direkt oder indirekt Einstellungen eines anderen Akteurs abzurufen oder zu ändern.<br>5. Das System prüft serverseitig die Benutzerzuordnung.<br>6. Das System verweigert den Zugriff auf fremde Einstellungen und liefert einen Berechtigungsfehler zurück.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur ruft ausschließlich seine eigenen Einstellungen auf → Das System erlaubt Zugriff.</li><li>Technischer Fehler → Das System liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Ein Akteur kann ausschließlich seine eigenen persönlichen Einstellungen einsehen und ändern. Einstellungen anderer Akteure bleiben geschützt und unverändert.</p>