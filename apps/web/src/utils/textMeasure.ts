// Misst die Pixelbreite eines Textes für eine gegebene CSS-Font-Kurzschreibweise. Basis für
// inhaltsgesteuerte Panelbreiten (Wiki-Baum, Verwaltungsspalte der Dokumente-Seite), damit ein
// Panel genau so breit wird, dass sein längster Eintrag vollständig lesbar bleibt.
//
// Ohne Canvas-Kontext (z. B. jsdom in Tests) liefert die Funktion 0. Das ist unkritisch, weil die
// Aufrufer ihr Ergebnis ohnehin auf eine Mindestbreite klemmen.
export function measureTextWidth(text: string, font: string): number {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(text).width;
  } catch {
    return 0;
  }
}
