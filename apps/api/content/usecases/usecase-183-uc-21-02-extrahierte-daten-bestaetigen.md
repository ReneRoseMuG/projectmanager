<h1>UC 21/02: Extrahierte Daten bestätigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-21-dokumentenextraktion.md">FT (21): Dokumentenextraktion</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen durch Parsing erzeugten Extraktionsvorschlag prüfen, anpassen und in den passenden Formular- oder Draft-Zustand übernehmen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Extraktionsvorschlag mit erkannten Feldern, Hinweisen und Warnungen liegt vor.</li><li>Der Akteur ist berechtigt, Kunden, Projekte oder Termine anzulegen oder zu verändern.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur prüft die vorbefüllten Kundendaten, fehlende Felder und Warnungen.<br>2. Das System löst die Kundennummer automatisch auf.<br>3. Bei einem bestehenden Kunden zeigt das System die Verknüpfung an und bietet optional an, ausschließlich leere Stammdaten aus dem Dokument zu ergänzen.<br>4. Bei einem neuen Kunden zeigt das System an, dass dieser Kunde beim Übernehmen angelegt wird.<br>5. Der Akteur prüft Projektdaten, Auftragsinhalt und optional die extrahierte Artikelliste.<br>6. Der Akteur entscheidet optional, ob der Dokumenttext in die Anmerkungen übernommen wird.<br>7. Der Akteur entscheidet im Projekt- oder Terminpfad optional, ob das Dokument als Reklamation behandelt wird. Bei Zustimmung wird die Notizfrage direkt im Dialog gestellt.<br>8. Der Akteur bestätigt die Übernahme.<br>9. Das System übernimmt bestätigte Daten in Formular- und Draft-Zustand. Projekt- und Terminpersistenz erfolgen erst im jeweiligen Speichern-Flow.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur bricht den Vorgang ab → Es erfolgt keine Speicherung; bestehende Daten bleiben unverändert.</li><li>Fehlende oder mehrdeutige Kundennummer → Der Dialog blockiert die Übernahme und zeigt den konkreten Grund.</li><li>Bei der späteren Persistierung tritt ein Validierungsfehler auf → Das System zeigt eine Fehlermeldung an; es werden keine Teilzustände gespeichert.</li><li>Während der Persistierung tritt ein Versionskonflikt auf → Das System bricht ab und informiert den Akteur; es erfolgt keine Speicherung.</li></ul>
<h2>Ergebnis</h2>
<p>Die bestätigten Daten sind im jeweiligen Formular- oder Draft-Zustand fachlich korrekt vorbereitet. Spätere Speicherentscheidungen werden im Project Save Review oder Termin-Save-Review getroffen, ohne bereits im Doc-Extract-Dialog abgeschlossene Entscheidungen doppelt abzufragen.</p>