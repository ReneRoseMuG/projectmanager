<h1>UC 21/03: Ungeeignetes Dokument behandeln</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ungeeignete oder nicht strukturierbare Dokumente nicht zu inkonsistenten Daten führen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Dokument enthält keine ausreichend strukturierbaren Daten oder entspricht nicht dem erwarteten Format.</li><li>Der Akteur startet die Dokumentextraktion.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur startet die Extraktion.<br>2. Das System extrahiert den Text.<br>3. Das System führt die Parsing-Regeln aus.<br>4. Das System erkennt, ob zumindest Kundendaten oder Projektdaten verwertbar sind.<br>5. Wenn keine hinreichend verwertbaren strukturierten Daten erzeugt werden können, bricht das System den Prozess mit einer klaren Fehlermeldung ab.</p>
<h2>Alternativen</h2>
<ul><li>Das Dokument enthält teilweise verwertbare Daten → Das System zeigt nur valide Teilbereiche als Vorschlag an und kennzeichnet unvollständige oder auffällige Felder.</li><li>Einzelne fachliche Bereiche fehlen, etwa die Artikelliste → Das System behandelt dies als Hinweis oder Warnung, solange andere verwertbare Daten vorhanden sind.</li></ul>
<h2>Ergebnis</h2>
<p>Es erfolgt keine Persistierung fachlicher Daten. Das System bleibt konsistent.</p>