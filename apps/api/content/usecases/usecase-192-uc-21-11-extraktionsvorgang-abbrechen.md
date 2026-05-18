<h1>UC 21/11: Extraktionsvorgang abbrechen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen gestarteten Extraktionsvorgang ohne Persistierung fachlicher Daten kontrolliert abbrechen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsdialog mit Vorschlagsdaten ist geöffnet.</li><li>Es wurden noch keine fachlichen Stammdaten gespeichert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur wählt im Extraktionsdialog die Funktion „Abbrechen“.<br>2. Das System verwirft alle extrahierten, nicht bestätigten Vorschlagsdaten.<br>3. Das System schließt den Extraktionsdialog.<br>4. Das System stellt den ursprünglichen Zustand des aufrufenden Formulars wieder her.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur schließt den Dialog über die Fenstersteuerung → Das System behandelt dies identisch zum aktiven Abbruch.</li></ul>
<h2>Ergebnis</h2>
<p>Es wurden keine fachlichen Stammdaten angelegt oder verändert. Das System verbleibt im Zustand vor Beginn der Extraktion.</p>