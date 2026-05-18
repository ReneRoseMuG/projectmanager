<h1>UC 02/01: Projekt anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Ein neues Projekt erfassen, einem aktiven Kunden zuordnen und mit einer Auftragsnummer versehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Anlegerechte (Disponent oder Administrator).</li><li>Der Ziel-Kunde existiert und ist aktiv.</li><li>Optional: Projektbezogene Tags existieren gemäß FT (28), sofern sie bei der Anlage vergeben werden sollen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur startet „Projekt anlegen&quot;.<br>2. Der Akteur wählt einen Kunden aus der Liste aktiver Kunden.<br>3. Der Akteur erfasst Titel, Auftragsnummer (Pflicht) und optional eine Beschreibung (Markdown).<br>4. Optional vergibt der Akteur projektbezogene Tags gemäß FT (28).<br>5. Optional liegen Projektdaten aus der Dokumentextraktion als Draft vor, inklusive PDF-Draft, Artikellistenhinweisen, Projekttitel-Vorschlag und ggf. bereits entschiedener Reklamationsnotiz.<br>6. Vor der Persistenz zeigt das System bei Bedarf den Projekt-Speichern-Review:</p>
<ul><li>offene Artikellistenhinweise,</li><li>Projekttitel-Vorschlag aus Sauna-Modell oder erstem Projektblock,</li><li>offene Reklamationsnotizentscheidung, sofern sie nicht bereits im Doc-Extract-Dialog abgeschlossen wurde,</li><li>PDF-Duplikatentscheidung für ein per Dokumentextraktion eingebrachtes Draft-PDF.</li></ul>
<p>7. Das System validiert serverseitig:</p>
<ul><li>Authentifizierung und Berechtigung,</li><li>Existenz und Aktivstatus des Kunden,</li><li>Auftragsnummer nicht leer.</li></ul>
<p>8. Das System legt das Projekt an und persistiert Projektreferenz, Auftrag und Kundenzuordnung atomar.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401, keine Persistenz.</li><li>Akteur ohne Anlegerechte → HTTP 403, keine Persistenz.</li><li>Gewählter Kunde existiert nicht → HTTP 422, keine Persistenz.</li><li>Gewählter Kunde ist inaktiv → HTTP 409, keine Persistenz.</li><li>Auftragsnummer fehlt oder ist leer → HTTP 422, keine Persistenz.</li><li>Abbruch durch den Akteur → keine Persistenz.</li><li>Abbruch im Projekt-Speichern-Review → keine Persistenz; der Formular-Draft bleibt erhalten.</li><li>Technischer Fehler → HTTP 500, keine Persistenz.</li></ul>
<h2>Ergebnis</h2>
<p>Das Projekt ist persistent angelegt, einem aktiven Kunden zugeordnet und mit einer Auftragsnummer versehen. Es kann für die Terminplanung genutzt werden.</p>