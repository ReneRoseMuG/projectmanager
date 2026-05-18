<h1>FT (14): Benutzer- und Rollenverwaltung</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Dieses Feature definiert die Benutzerrollen und deren Berechtigungen im System. Ziel ist eine klare, nachvollziehbare und technisch durchsetzbare Trennung von Leserechten, operativen Bearbeitungsrechten und administrativen Systemrechten. Die Rollen wirken systemweit und bilden die Grundlage für sichere UI- und Backend-Logik.</p>
<h2>Fachliche Beschreibung</h2>
<p>Das System arbeitet rollenbasiert. Jeder Benutzer besitzt genau eine Rolle. Die Rolle bestimmt, welche Inhalte sichtbar sind und welche Aktionen erlaubt sind. Die Durchsetzung der Berechtigungen erfolgt sowohl in der Benutzeroberfläche (Sichtbarkeit und Bedienbarkeit) als auch serverseitig zur Absicherung gegen manipulierte Requests.</p>
<p>Es existieren drei Rollen:</p>
<ul><li>Leser</li><li>Disponent</li><li>Admin</li></ul>
<p>Die Rollen beziehen sich auf alle fachlichen Objekte, insbesondere Kunden und Notizen, wie sie in FT (09) und FT (13) beschrieben sind. Bestimmte Felder und Aktionen (z. B. Archivierung von Kunden) sind bewusst ausschließlich administrativen Benutzern vorbehalten.</p>
<p>Zur Benutzerverwaltung gehören außerdem sicherheitsrelevante Kontodaten wie Passwort, Aktiv-Status, Rolle und der benutzerspezifische Zwei-Faktor-Zustand. Ein globales Setting kann 2FA systemweit aktivieren oder verpflichtend machen, ersetzt aber kein benutzerspezifisch bestätigtes Secret.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<p>Ein Benutzer besitzt genau eine Rolle. Mehrfachrollen oder temporäre Rollen sind nicht vorgesehen.</p>
<p>Berechtigungen müssen serverseitig geprüft werden. UI-seitige Einschränkungen dienen ausschließlich der Benutzerführung und ersetzen keine serverseitige Prüfung.</p>
<p>Kunden dürfen von normalen Benutzern nicht gelöscht werden. Die Deaktivierung bzw. Archivierung eines Kunden ist eine Admin-Funktion. Für nicht berechtigte Rollen bleibt der Status sichtbar, aber nicht veränderbar.</p>
<p>Notizen existieren ausschließlich im Kontext eines übergeordneten Objekts (Kunde oder Projekt). Es gibt keine eigenständige Notizverwaltung. Schreib- und Löschrechte für Notizen sind rollenabhängig.</p>
<p>Leser dürfen keinerlei schreibende Aktionen durchführen. Disponenten dürfen fachlich arbeiten, aber keine systemkritischen Zustände verändern. Admins dürfen alle Aktionen durchführen.</p>
<p>Ist globale 2FA aktiv, muss pro Benutzer ein technisch nutzbares und bestätigtes Secret vorliegen. Fehlt dieses oder ist es inkonsistent, führt der Login kontrolliert in den Setup-Pfad statt in einen nicht auflösbaren Verify-Zustand.</p>
<p>Admins dürfen benutzerspezifische 2FA-Zustände für andere Benutzer zurücksetzen und bestehende Benutzer vollständig bearbeiten, einschließlich optionaler Passwortänderung. Der Reset löscht nur den 2FA-Zustand, nicht Passwort, Rolle oder sonstige Stammdaten.</p>
<p>Der letzte aktive Admin bleibt besonders geschützt. Er darf weder entfernt noch deaktiviert werden. Bei global aktiver 2FA darf er seinen eigenen 2FA-Zustand außerdem nicht so zurücksetzen, dass kein aktiver Rückfallanker mehr verbleibt.</p>