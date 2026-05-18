<h1>UC 34/06: Unberechtigte Marker-Pflege blockieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-34-kalendermarker-feiertage-betriebsferien.md">FT (34): Kalendermarker, Feiertage und Betriebsferien</a></li></ul>
<h2>Akteur</h2>
<p>Leser</p>
<h2>Ziel</h2>
<p>Verhindern, dass nicht berechtigte Rollen Kalendermarker oder globale Marker-Settings verändern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Akteur ist angemeldet.</li><li>Akteur besitzt nicht die Rolle Administrator oder Disponent.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur ruft einen Pflegepfad für Kalendermarker direkt auf.<br>2. System prüft die Rolle serverseitig.<br>3. System lehnt die Mutation ab.<br>4. Akteur ruft den Schreibpfad für den globalen Visualisierungsstil direkt auf.<br>5. System lehnt auch diese Änderung serverseitig ab.</p>
<h2>Alternativen</h2>
<ul><li>Akteur liest aktive Marker über den Kalenderpfad.</li><li>Diese Leseoperation ist erlaubt, sofern die Rolle Kalenderlesen darf.</li></ul>
<h2>Ergebnis</h2>
<p>Leser können Kalendermarker sehen, aber nicht pflegen und keine globale Marker-Darstellung ändern. Administratoren und Disponenten bleiben die zulässigen schreibenden Rollen.</p>