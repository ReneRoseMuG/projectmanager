# FT (14): Benutzer- und Rollenverwaltung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature definiert die Benutzerrollen und deren Berechtigungen im System. Ziel ist eine klare, nachvollziehbare und technisch durchsetzbare Trennung von Leserechten, operativen Bearbeitungsrechten und administrativen Systemrechten. Die Rollen wirken systemweit und bilden die Grundlage für sichere UI- und Backend-Logik.

## Fachliche Beschreibung

Das System arbeitet rollenbasiert. Jeder Benutzer besitzt genau eine Rolle. Die Rolle bestimmt, welche Inhalte sichtbar sind und welche Aktionen erlaubt sind. Die Durchsetzung der Berechtigungen erfolgt sowohl in der Benutzeroberfläche (Sichtbarkeit und Bedienbarkeit) als auch serverseitig zur Absicherung gegen manipulierte Requests.

Es existieren drei Rollen:

- Leser
- Disponent
- Admin

Die Rollen beziehen sich auf alle fachlichen Objekte, insbesondere Kunden und Notizen, wie sie in FT (09) und FT (13) beschrieben sind. Bestimmte Felder und Aktionen (z. B. Archivierung von Kunden) sind bewusst ausschließlich administrativen Benutzern vorbehalten.

Zur Benutzerverwaltung gehören außerdem sicherheitsrelevante Kontodaten wie Passwort, Aktiv-Status, Rolle und der benutzerspezifische Zwei-Faktor-Zustand. Ein globales Setting kann 2FA systemweit aktivieren oder verpflichtend machen, ersetzt aber kein benutzerspezifisch bestätigtes Secret.

## Regeln & Randbedingungen

Ein Benutzer besitzt genau eine Rolle. Mehrfachrollen oder temporäre Rollen sind nicht vorgesehen.

Berechtigungen müssen serverseitig geprüft werden. UI-seitige Einschränkungen dienen ausschließlich der Benutzerführung und ersetzen keine serverseitige Prüfung.

Kunden dürfen von normalen Benutzern nicht gelöscht werden. Die Deaktivierung bzw. Archivierung eines Kunden ist eine Admin-Funktion. Für nicht berechtigte Rollen bleibt der Status sichtbar, aber nicht veränderbar.

Notizen existieren ausschließlich im Kontext eines übergeordneten Objekts (Kunde oder Projekt). Es gibt keine eigenständige Notizverwaltung. Schreib- und Löschrechte für Notizen sind rollenabhängig.

Leser dürfen keinerlei schreibende Aktionen durchführen. Disponenten dürfen fachlich arbeiten, aber keine systemkritischen Zustände verändern. Admins dürfen alle Aktionen durchführen.

Ist globale 2FA aktiv, muss pro Benutzer ein technisch nutzbares und bestätigtes Secret vorliegen. Fehlt dieses oder ist es inkonsistent, führt der Login kontrolliert in den Setup-Pfad statt in einen nicht auflösbaren Verify-Zustand.

Admins dürfen benutzerspezifische 2FA-Zustände für andere Benutzer zurücksetzen und bestehende Benutzer vollständig bearbeiten, einschließlich optionaler Passwortänderung. Der Reset löscht nur den 2FA-Zustand, nicht Passwort, Rolle oder sonstige Stammdaten.

Der letzte aktive Admin bleibt besonders geschützt. Er darf weder entfernt noch deaktiviert werden. Bei global aktiver 2FA darf er seinen eigenen 2FA-Zustand außerdem nicht so zurücksetzen, dass kein aktiver Rückfallanker mehr verbleibt.