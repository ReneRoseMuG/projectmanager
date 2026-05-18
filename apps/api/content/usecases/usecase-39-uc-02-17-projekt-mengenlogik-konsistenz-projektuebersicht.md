<h1>UC 02/17: Projekt-Mengenlogik-Konsistenz (Projektübersicht)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass die Projektübersicht die fachlich definierten Grundmengen korrekt und disjunkt darstellt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt mindestens Leserechte gemäß seiner Rolle.</li><li>Projekte sind im System vorhanden.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet die Projektübersicht.<br>2. System lädt standardmäßig die Grundmenge „Aktuelle Projekte“ (mindestens ein Termin mit Startdatum ≥ heute).<br>3. System berücksichtigt ausschließlich Projekte, die mindestens einen Termin mit Startdatum ≥ heute besitzen.<br>4. Akteur kann auf die Grundmenge „Ohne Termine“ umschalten.<br>5. System lädt ausschließlich Projekte ohne zugeordnete Termine.<br>6. Filter (z. B. Titel, Status) wirken ausschließlich innerhalb der jeweils geladenen Grundmenge.</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Leserechte → HTTP 403.</li><li>Projekt besitzt ausschließlich vergangene Termine → Projekt erscheint nicht in „Aktuelle Projekte“.</li><li>Projekt besitzt vergangene und zukünftige Termine → Projekt erscheint in „Aktuelle Projekte“.</li><li>Projekt besitzt keine Termine → Projekt erscheint nur in „Ohne Termine“.</li><li>Keine Projekte in der gewählten Grundmenge → System zeigt eine leere Liste.</li></ul>
<h2>Ergebnis</h2>
<p>Die Grundmengen „Aktuelle Projekte“ und „Ohne Termine“ sind disjunkt.</p>
<p>Filter verändern nicht die zugrunde liegende Grundmenge.</p>
<p>Die Projektübersicht ist fachlich konsistent und nachvollziehbar.</p>