/**
 * An email cut at its natural break points (D-159): after the «@» and after each dot, so a long address wraps as
 * `ventas@` / `acme-industrial.` / `es` instead of in the middle of a word. Joined, the segments are the email as it
 * is; the view puts a `<wbr>` after each one, which changes neither the text nor its accessible name.
 */
export function emailBreakSegments(email: string): readonly string[] {
  return email.split(/(?<=[@.])/).filter((segment) => segment !== '');
}
