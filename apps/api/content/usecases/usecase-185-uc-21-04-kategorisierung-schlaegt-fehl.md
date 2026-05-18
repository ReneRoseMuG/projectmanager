<h1>UC 21/04: Kategorisierung schlägt fehl</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass eine fehlgeschlagene regelbasierte Gruppierung von Positionen die Extraktion nicht blockiert.</p>
<h2>Vorbedingungen</h2>
<ul><li>Eine Artikelliste wurde extrahiert.</li><li>Die regelbasierte Gruppierung liefert kein eindeutiges Ergebnis.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System versucht, die Artikelliste anhand definierter Regeln zu gruppieren.<br>2. Das System erkennt, dass keine eindeutige Gruppierung möglich ist.<br>3. Das System stellt die Artikelliste in der ursprünglichen Reihenfolge dar.<br>4. Der Akteur kann die Liste weiterhin bearbeiten und übernehmen.</p>
<h2>Alternativen</h2>
<ul><li>Teilweise Gruppierung möglich → Das System gruppiert nur eindeutig identifizierbare Bereiche; übrige Positionen bleiben in Originalreihenfolge.</li></ul>
<h2>Ergebnis</h2>
<p>Die Extraktion bleibt nutzbar. Es wird keine Blockade des Prozesses verursacht.</p>