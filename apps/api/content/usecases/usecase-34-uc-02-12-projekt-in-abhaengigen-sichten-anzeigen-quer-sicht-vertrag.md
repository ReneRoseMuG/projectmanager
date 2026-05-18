<h1>UC 02/12: Projekt in abhängigen Sichten anzeigen (Quersicht-Vertrag)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Projektdaten in allen abhängigen Sichten konsistent und referenziell korrekt angezeigt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Projekt ist mindestens einer abhängigen Sicht referenziert (z. B. Terminansicht, Kalender, Tabellenansicht).</li><li>Der Akteur besitzt Leserechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Eine abhängige Sicht (z. B. Terminliste oder Kalender) lädt ein oder mehrere Termine mit Projektbezug.<br>2. System stellt sicher, dass projektrelevante Anzeigedaten nicht lokal dupliziert oder eigenständig persistiert werden.<br>3. Die Sicht bezieht projektrelevante Informationen ausschließlich aus der gültigen Projektquelle.<br>4. Darstellung erfolgt konsistent mit der Projekt-Detailansicht.</p>
<h2>Alternativen</h2>
<ul><li>Projekt wurde zwischenzeitlich gelöscht → Referenz darf nicht mehr existieren.</li><li>Projekt besitzt keine abhängigen Sichten → Keine weitere Aktion erforderlich.</li></ul>
<h2>Ergebnis</h2>
<p>Alle abhängigen Sichten zeigen identische und konsistente Projektdaten.</p>
<p>Es existieren keine widersprüchlichen Projektrepräsentationen zwischen Detailansicht und Quersichten.</p>