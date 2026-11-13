/**
 * Euro amounts as the interface writes them in es-ES («1.234,56 €»), with whatever space the formatter puts before
 * the symbol (a non-breaking one), and ignoring the spaces the template leaves around the text. The figure is written
 * exactly as in the acceptance criterion.
 */
export function euros(figure: string): RegExp {
  return new RegExp(`^\\s*${figure.replaceAll('.', '\\.')}\\s€\\s*$`);
}
