<h1>UC 01/13: Termin-Farbdarstellung ableiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Termine in Kalender- und Listenansichten mit einer konsistent abgeleiteten Farbe darstellen. Wenn ein Termin einer Tour zugeordnet ist, wird die Tourfarbe verwendet. Wenn keine Tour zugeordnet ist, wird eine definierte Standardfarbe verwendet. Diese Ableitung muss in allen Sichten identisch funktionieren und darf sich nicht zwischen Kalender, Listenprojektionen und Detailansichten widersprechen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Es existieren Termine in der Datenbank.</li><li>Es existieren Touren mit definierter Farbe.</li><li>Ein Termin kann einer Tour zugeordnet sein oder keine Tourzuordnung besitzen.</li><li>Es existiert mindestens eine Sicht (Kalender oder Liste), die Termine farblich darstellt oder eine Farbe als Feld aus der Projektion bezieht.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet eine Kalender- oder Terminlistenansicht.<br>2. Das System lädt Termine als Projektion und stellt sie dar.<br>3. Für jeden Termin leitet das System die Darstellungsfarbe nach einer festen Regel ab.<br>1. Wenn der Termin einer Tour zugeordnet ist, verwendet das System die Farbe dieser Tour.<br>2. Wenn der Termin keiner Tour zugeordnet ist, verwendet das System eine definierte Standardfarbe.<br>4. Der Akteur weist einem Termin eine Tour zu oder entfernt die Tourzuweisung.<br>5. Das System aktualisiert die Darstellung, sodass sich die Farbe des Termins entsprechend der Regel sofort und konsistent ändert.</p>
<h2>Alternativen</h2>
<ul><li>Tour ohne Farbe: Wenn eine Tour keine gültige Farbe besitzt, muss das System eine robuste Fallback-Regel anwenden, zum Beispiel die Standardfarbe, und darf keine fehlerhafte oder leere Darstellung erzeugen.</li><li>Abbruch oder Blockade: Wenn eine Änderung (Tour setzen oder Tour entfernen) abgebrochen oder wegen Konflikt blockiert wird, darf sich die angezeigte Farbe nicht dauerhaft ändern, weil kein persistierter Zustand entstanden ist.</li></ul>
<h2>Ergebnis</h2>
<p>Jeder Termin wird in allen Sichten konsistent mit der korrekten Farbe dargestellt. Termine mit Tourzuordnung nutzen die Tourfarbe, Termine ohne Tourzuordnung nutzen die Standardfarbe. Nach Änderungen an der Tourzuordnung ist die Darstellung ohne Inkonsistenzen aktualisiert.</p>