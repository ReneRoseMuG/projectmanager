<h1>UC 02/19: Projekt in abhängigen Sichten anzeigen (Quersicht-Vertrag)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Projektdaten in allen abhängigen Sichten konsistent und referenziell korrekt dargestellt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Projekt wird in mindestens einer abhängigen Sicht verwendet (z. B. Terminliste, Kalender, Tabellenansicht).</li><li>Der Akteur besitzt Leserechte gemäß seiner Rolle.</li></ul>
<h2>Ablauf</h2>
<p>1. Eine abhängige Sicht lädt Termine oder Listen mit Projektbezug.<br>2. System stellt sicher, dass Projektdaten nicht lokal dupliziert oder eigenständig persistiert werden.<br>3. Die Sicht bezieht Projektdaten ausschließlich über die gültige Projektquelle.<br>4. Die Darstellung erfolgt konsistent zur Projekt-Detailansicht.</p>
<h2>Alternativen</h2>
<ul><li>Projekt wurde gelöscht → Referenz darf nicht mehr angezeigt werden.</li><li>Projekt besitzt keine abhängigen Sichten → Keine weitere Aktion erforderlich.</li></ul>
<h2>Ergebnis</h2>
<p>Alle abhängigen Sichten zeigen identische Projektdaten.</p>
<p>Es existieren keine widersprüchlichen Projektrepräsentationen im System.</p>