// @ts-check
/**
 * Covers the data of the server and of the author with a visible mark (D-99, D-175, D-189). Every rule is a pattern,
 * so no real value lives in the repository; the names that no pattern can find (an SSH alias, a system user, the
 * short name of another site) come from a private file outside it (`private-terms.mjs`).
 */
import { isIPv6 } from 'node:net';

/** The only mark: it never says what it covers, so it reveals nothing about the server (D-175, D-189). */
export const MARK = '[Omitido: detalle del servidor privado]';

/** The only subdomain of the author's domains that may appear: the public demo. */
export const DEMO_HOST = 'saas-o-matic.codeserviceapi.es';

const IPV4 = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?(?![\w.]*\d)/g;
const IPV6_CANDIDATE = /(?<![\w:.])[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}(?:\/\d{1,3})?(?![\w:])/gi;
const HOST = /\b(?:[a-z0-9-]+\.)+codeservice(?:api)?\.es\b/gi;
const SERVER_PATH =
  /(?<![\w~./-])\/(?:etc|root|home|var|opt|srv)(?=$|[/\s`'"),;:\]>])(?:\/[^\s`'"),;\]>]*)?/g;
const EMAIL = /[\w.%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi;
const TOKENS = [
  /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_\w{20,}/g,
  /\bsk-[\w-]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g,
  /\bBearer\s+[\w.~+/=-]{16,}/g,
];
const WINDOWS_HOME = [
  /[a-z]:[\\/]users[\\/]usuario(?![\w-])/gi,
  /\/c\/users\/usuario(?![\w-])/gi,
  /\bC--Users-Usuario/g,
];

/**
 * @param {string} address an IPv4 address, maybe with a CIDR suffix
 * @returns {boolean} whether it says nothing about any machine: loopback, unspecified, documentation (RFC 5737) or
 * the Docker subnet of the project, already public in its Compose files (172.30.0.0/24)
 */
export function isAllowedIpv4(address) {
  const [ip = ''] = address.split('/');
  if (ip === '127.0.0.1' || ip === '0.0.0.0') return true;
  return /^(?:192\.0\.2|198\.51\.100|203\.0\.113|172\.30\.0)\.\d{1,3}$/.test(ip);
}

/**
 * @param {string} address
 * @returns {boolean} whether it is a well-formed IPv4 address (every octet up to 255)
 */
export function isIpv4(address) {
  const [ip = ''] = address.split('/');
  const octets = ip.split('.');
  return octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}

/**
 * @param {string} address an IPv6 address, maybe with a prefix length
 * @returns {boolean} whether it is loopback, unspecified or documentation (RFC 3849)
 */
export function isAllowedIpv6(address) {
  const [ip = ''] = address.toLowerCase().split('/');
  return ip === '::1' || ip === '::' || /^2001:0?db8(?::|$)/.test(ip);
}

/**
 * @param {string} text
 * @returns {string} the text with every IPv4 and IPv6 address that is not allowed covered
 */
export function redactIps(text) {
  const v4 = text.replace(IPV4, (match) => (isIpv4(match) && !isAllowedIpv4(match) ? MARK : match));
  return v4.replace(IPV6_CANDIDATE, (match) => {
    const [ip = ''] = match.split('/');
    return isIPv6(ip) && !isAllowedIpv6(match) ? MARK : match;
  });
}

/**
 * @param {string} text
 * @returns {string} the text with the subdomains of the author's domains covered, except the demo
 */
export function redactHosts(text) {
  return text.replace(HOST, (match) => (match.toLowerCase() === DEMO_HOST ? match : MARK));
}

/**
 * @param {string} text
 * @returns {string} the text with every email address that is not a `noreply` one covered
 */
export function redactEmails(text) {
  return text.replace(EMAIL, (match) => (/noreply/i.test(match) ? match : MARK));
}

/**
 * @param {string} term
 * @returns {RegExp} the term as a whole word, ignoring case
 */
export function wholeWord(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
}

/**
 * @param {string} text
 * @param {readonly string[]} terms the names to cover always, from the private file
 * @returns {string}
 */
export function redactPrivateTerms(text, terms) {
  const longestFirst = [...terms].sort((a, b) => b.length - a.length);
  return longestFirst.reduce((result, term) => result.replace(wholeWord(term), MARK), text);
}

/**
 * @param {string} text
 * @param {readonly string[]} terms
 * @returns {string} the text with every rule applied, in an order where no rule can uncover what another covered
 */
export function redact(text, terms) {
  const withoutTokens = TOKENS.reduce((result, pattern) => result.replace(pattern, MARK), text);
  const steps = [
    redactEmails,
    redactHosts,
    redactIps,
    (/** @type {string} */ value) => value.replace(SERVER_PATH, MARK),
    (/** @type {string} */ value) => redactPrivateTerms(value, terms),
  ];
  const covered = steps.reduce((result, step) => step(result), withoutTokens);
  return WINDOWS_HOME.reduce((result, pattern) => result.replace(pattern, '~'), covered);
}

/**
 * @param {string} text an output that has already been redacted
 * @param {readonly string[]} terms
 * @returns {string[]} what is still there and should not be: the self-check of the converter
 */
export function leftovers(text, terms) {
  const found = [];
  if (redactIps(text) !== text) found.push('IP');
  if (redactHosts(text) !== text) found.push('host');
  if (redactEmails(text) !== text) found.push('email');
  if (text.replace(SERVER_PATH, '') !== text) found.push('ruta del servidor');
  if (TOKENS.some((pattern) => text.replace(pattern, '') !== text)) found.push('token');
  if (redactPrivateTerms(text, terms) !== text) found.push('término privado');
  if (WINDOWS_HOME.some((pattern) => text.replace(pattern, '') !== text)) found.push('ruta de Windows');
  return found;
}
