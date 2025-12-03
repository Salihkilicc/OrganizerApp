const key =
  process.env.SUPABASE_APPLE_OAUTH_KEY ??
  process.env.APPLE_OAUTH_PRIVATE_KEY ??
  process.env.APPLE_OAUTH_SECRET_KEY ??
  '';

if (!key) {
  console.error(
    'No Apple OAuth private key provided. Set SUPABASE_APPLE_OAUTH_KEY (or APPLE_OAUTH_PRIVATE_KEY/APPLE_OAUTH_SECRET_KEY) before running this script.'
  );
  process.exit(1);
}

const normalized = key.trim();
const hasPemFrame =
  normalized.startsWith('-----BEGIN PRIVATE KEY-----') &&
  normalized.endsWith('-----END PRIVATE KEY-----');

if (!hasPemFrame) {
  console.error(
    'Apple OAuth private key must be a PEM block with BEGIN/END PRIVATE KEY lines. Please copy the exact PEM (including delimiters) from Apple.'
  );
  process.exit(1);
}

const inner = normalized
  .replace('-----BEGIN PRIVATE KEY-----', '')
  .replace('-----END PRIVATE KEY-----', '')
  .trim();

if (!inner) {
  console.error('Apple OAuth private key is empty between PEM delimiters.');
  process.exit(1);
}

console.log('Apple OAuth private key is present and appears to be PEM formatted.');
