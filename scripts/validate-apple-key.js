const key =
  (process.env.EXPO_PUBLIC_SUPABASE_APPLE_OAUTH_KEY ??
    process.env.SUPABASE_APPLE_OAUTH_KEY ??
    '').trim();

if (!key) {
  console.error(
    'No Apple OAuth client secret provided. Set SUPABASE_APPLE_OAUTH_KEY to the generated JWT (client secret).'
  );
  process.exit(1);
}

const segments = key.split('.');
const looksLikeJwt = segments.length === 3 && segments.every(Boolean);

if (!looksLikeJwt) {
  console.error(
    'Apple OAuth client secret must be a JWT (three dot-separated segments). Please paste the full JWT from Apple.'
  );
  process.exit(1);
}

console.log('Apple OAuth client secret is present and appears to be a JWT.');
