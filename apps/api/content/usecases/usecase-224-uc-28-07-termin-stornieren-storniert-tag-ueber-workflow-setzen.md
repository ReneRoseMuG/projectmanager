<h1>UC 28/07: Termin stornieren – Storniert-Tag über Workflow setzen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-28-universelles-tagging-system.md">FT (28): Universelles Tagging-System</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Den Storniert-Tag an einem Termin ausschließlich über die dedizierte Storno-Aktion setzen, nicht über den Tag-Picker.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin ist noch nicht storniert.</li><li>Der Termin liegt nicht in der Vergangenheit.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur löst den Storno-Workflow gemäß FT (01) aus.<br>2. Das System führt die Stornierung als atomare Transaktion aus.<br>3. Das System entfernt Mitarbeiterzuweisungen.<br>4. Das System setzt den Auftragsbetrag auf 0.<br>5. Das System setzt den Storniert-Tag.</p>
<h2>Alternativen</h2>
<ul><li>Versuch, den Storniert-Tag manuell über den Tag-Picker zu setzen: Das System weist die Änderung serverseitig mit <code>CANCELLATION_TAG_PROTECTED</code> ab.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin trägt den Storniert-Tag und ist für weitere Mutationen gesperrt.</p>