/**
 * Masks sensitive values in log strings before persisting or broadcasting.
 */
const PATTERNS: [RegExp, string][] = [
  // Anthropic / OpenAI style keys
  [/sk-ant-[A-Za-z0-9_\-]{10,}/g,    'sk-ant-****'],
  [/sk-[A-Za-z0-9]{10,}/g,           'sk-****'],

  // GitHub tokens (PAT / OAuth / App)
  [/ghp_[A-Za-z0-9]{10,}/g,          'ghp_****'],
  [/gho_[A-Za-z0-9]{10,}/g,          'gho_****'],
  [/ghs_[A-Za-z0-9]{10,}/g,          'ghs_****'],

  // AWS access key IDs and secret access keys
  [/AKIA[A-Z0-9]{16}/g,              'AKIA****'],
  [/(?<=aws[_\s]?secret[_\s]?access[_\s]?key[=:\s]+)[A-Za-z0-9/+]{40}/gi, '****'],

  // Bearer tokens in headers
  [/Bearer\s+[A-Za-z0-9._\-]{10,}/g, 'Bearer ****'],

  // Basic auth credentials in URLs
  [/(:\/\/)([^:@\s]+):([^@\s]+)@/g,  '$1****:****@'],

  // Email addresses
  [/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '****@****.***'],
];

export function maskSecrets(input: string): string {
  let out = input;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
