<h1>UC 04/15: Tour-KW-Wochenplanung anzeigen und anwenden</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Tour-KW-Planungen über mehrere Kalenderwochen als Matrix einsehen und zulässige Wochenplanungsaktionen ausführen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Es existieren planbare Touren.</li><li>Für schreibende Aktionen besitzt der Akteur Administrator- oder Disponentenrechte.</li><li>Im Tourformular wird der Tab <strong>Wochenplanung</strong> nur für regulär planbare Touren angeboten. Für die Systemtouren <strong>Parkplatz</strong> und <strong>Abwesenheiten</strong> bleibt der Tab unsichtbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Tourenverwaltung und wechselt in den Tab <strong>Wochenplanung</strong>.<br>2. System zeigt vier Kalenderwochen als Spalten und planbare Touren als Bahnen.<br>3. System blendet <strong>Parkplatz</strong>, <strong>Abwesenheiten</strong> und tourlose Pseudo-Bahnen aus.<br>4. Akteur kann Tour-Bahnen wie im Wochenkalender aufklappen oder zuklappen.<br>5. Akteur sieht je Tour-KW die geplanten Mitarbeiter, den Sperrstatus und vorhandene Tour-KW-Notizen.<br>6. Administrator oder Disponent öffnet bei Bedarf eine Kachelaktion, um Notizen zu pflegen, Mitarbeiter zu ändern, die Planung zu blockieren oder freizugeben oder die Planung auf passende Termine anzuwenden.<br>7. System nutzt für jede Mutation die bestehenden Tour-KW-Services mit Rollen-, Historien-, Konflikt- und Sperrprüfung.</p>
<h2>Alternativen</h2>
<ul><li>Leser öffnet die Ansicht: System zeigt die Lesesicht ohne schreibende Aktionen.</li><li>Vergangene Tour-KW: System zeigt die Kachel schreibgeschützt; direkte Mutationen werden serverseitig abgelehnt.</li><li>Blockierte Tour-KW: System verhindert Mitarbeiteränderungen und Anwenden-Aktionen, bis die Woche freigegeben wird.</li><li>Parkplatz- oder Abwesenheiten-Tour im Tourformular: System zeigt keinen Tab <strong>Wochenplanung</strong> und keine Tour-KW-Karten.</li><li>Konflikte beim Anwenden: System zeigt die bestehende Vorschau; konfliktbehaftete Termine bleiben deaktiviert und werden nicht mutiert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Akteur erhält eine kompakte Vier-KW-Übersicht über die Tour-Wochenplanung. Zulässige Aktionen verändern ausschließlich bestehende Tour-KW- oder Termin-Mitarbeiterpfade und erzeugen keine separate Planungslogik.</p>