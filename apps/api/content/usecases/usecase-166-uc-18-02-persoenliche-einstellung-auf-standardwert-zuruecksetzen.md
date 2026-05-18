<h1>UC 18/02: Persönliche Einstellung auf Standardwert zurücksetzen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-18-user-preferences.md">FT (18): User Preferences</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser, Admin</p>
<h2>Ziel</h2>
<p>Eine persönliche Einstellung auf den systemseitig definierten Standardwert zurücksetzen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Für die betreffende Einstellung ist ein systemweiter Standardwert definiert.</li><li>Für den Akteur existiert eine gespeicherte individuelle Einstellung.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Bereich für persönliche Einstellungen.<br>2. Das System lädt die aktuell gespeicherten Einstellungen des Akteurs.<br>3. Der Akteur wählt für eine Einstellung die Funktion „Auf Standard zurücksetzen“.<br>4. Der Akteur bestätigt die Aktion.<br>5. Das System entfernt oder überschreibt den individuellen Wert des Akteurs.<br>6. Das System speichert den Standardwert als wirksame Einstellung.<br>7. Das System bestätigt die erfolgreiche Zurücksetzung.<br>8. Bei zukünftigen Aktionen wird der Standardwert angewendet.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht die Zurücksetzung ab → Der individuelle Wert bleibt unverändert.</li><li>Für die Einstellung existiert kein definierter Standardwert → Das System blockiert die Aktion mit einem Fehlerstatus.</li><li>Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Die persönliche Einstellung entspricht dem systemweit definierten Standardwert und wirkt ausschließlich für den betreffenden Akteur.</p>