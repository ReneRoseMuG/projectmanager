<h1>UC 06/05: Wochenplanung für Parkplatz sperren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-06-automatische-regeln.md">FT (06): Automatische Regeln</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Verhindern, dass die Systemtour <strong>Parkplatz</strong> als reguläre Tour-KW-Planung verwendet wird. Parkplatz dient als fachlicher Zwischen- und Sonderzustand für Termine, aber nicht als Basis für Mitarbeiterplanung.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Die Systemtour <strong>Parkplatz</strong> existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Parkplatz-Tour im Tourformular.<br>2. System zeigt die normalen Stammdaten- und Terminbereiche der Tour.<br>3. System bietet keinen Tab <strong>Wochenplanung</strong> an.<br>4. System lädt keine Tour-KW-Karten, keine Mitarbeiterplanungsaktionen und keinen KW-Einfügen-Schalter für Parkplatz.<br>5. Im Wochenkalender kann die Parkplatz-Lane Termine anzeigen, erhält aber keine Tour-KW-Personalkarte in der Personalspalte.</p>
<h2>Alternativen</h2>
<ul><li>Akteur öffnet die übergreifende Tour-KW-Planungsansicht: System blendet Parkplatz als nicht planbare Bahn aus.</li><li>Direkte API-Aufrufe bleiben durch die bestehenden Tour-KW-, Rollen-, Historien- und Sperrregeln serverseitig begrenzt. UI-Sichtbarkeit ersetzt keine serverseitige Durchsetzung.</li></ul>
<h2>Ergebnis</h2>
<p>Parkplatz erscheint nicht als regulärer Ursprung für Tour-KW-Mitarbeiterplanung. Termine auf Parkplatz bleiben fachlich bearbeitbar, soweit die bestehenden Termin- und Parkplatz-Regeln dies erlauben.</p>