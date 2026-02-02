import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import * as openpgp from 'openpgp';

export const dynamic = 'force-dynamic';

// Public keyservers to search
const KEYSERVERS = [
  { name: 'keys.openpgp.org', url: 'https://keys.openpgp.org' },
  { name: 'keyserver.ubuntu.com', url: 'https://keyserver.ubuntu.com' }
];

/**
 * POST /api/contacts/keyserver-search
 * Search public PGP keyservers for keys
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    console.log('[Keyserver Search] Searching for:', query);

    const results = [];
    const seenKeyIds = new Set();

    // Search each keyserver
    for (const server of KEYSERVERS) {
      try {
        const serverResults = await searchKeyserver(server, query.trim());
        for (const result of serverResults) {
          // Deduplicate by key ID
          if (!seenKeyIds.has(result.keyId)) {
            seenKeyIds.add(result.keyId);
            results.push({
              ...result,
              server: server.name
            });
          }
        }
      } catch (serverError) {
        console.warn(`[Keyserver Search] Error searching ${server.name}:`, serverError.message);
      }
    }

    console.log('[Keyserver Search] Found', results.length, 'keys');

    return NextResponse.json({
      success: true,
      results,
      query
    });

  } catch (error) {
    console.error('[Keyserver Search] Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

async function searchKeyserver(server, query) {
  const results = [];

  // Determine if query is email or key ID
  const isEmail = query.includes('@');
  const isKeyId = /^[0-9A-Fa-f]{8,40}$/.test(query);

  if (server.url.includes('keys.openpgp.org')) {
    // keys.openpgp.org uses a different API
    try {
      let fetchUrl;
      if (isEmail) {
        fetchUrl = `${server.url}/vks/v1/by-email/${encodeURIComponent(query)}`;
      } else if (isKeyId) {
        fetchUrl = `${server.url}/vks/v1/by-keyid/${query}`;
      } else {
        // Search by email pattern
        fetchUrl = `${server.url}/vks/v1/by-email/${encodeURIComponent(query)}`;
      }

      const response = await fetch(fetchUrl, {
        headers: { 'Accept': 'application/pgp-keys' },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const armoredKey = await response.text();
        if (armoredKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
          const keyInfo = await parseKeyInfo(armoredKey);
          if (keyInfo) {
            results.push({
              ...keyInfo,
              publicKey: armoredKey
            });
          }
        }
      }
    } catch (e) {
      console.warn('[keys.openpgp.org] Error:', e.message);
    }
  } else {
    // Standard HKP protocol for other keyservers
    try {
      // Search endpoint
      const searchQuery = isKeyId ? `0x${query}` : query;
      const searchUrl = `${server.url}/pks/lookup?search=${encodeURIComponent(searchQuery)}&op=index&options=mr`;

      const searchResponse = await fetch(searchUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (searchResponse.ok) {
        const indexText = await searchResponse.text();
        const keyIds = parseHKPIndex(indexText);

        // Fetch each key (limit to first 5)
        for (const keyId of keyIds.slice(0, 5)) {
          try {
            const keyUrl = `${server.url}/pks/lookup?search=0x${keyId}&op=get&options=mr`;
            const keyResponse = await fetch(keyUrl, {
              signal: AbortSignal.timeout(10000)
            });

            if (keyResponse.ok) {
              const armoredKey = await keyResponse.text();
              if (armoredKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
                const keyInfo = await parseKeyInfo(armoredKey);
                if (keyInfo) {
                  results.push({
                    ...keyInfo,
                    publicKey: armoredKey
                  });
                }
              }
            }
          } catch (e) {
            console.warn('[HKP] Error fetching key:', e.message);
          }
        }
      }
    } catch (e) {
      console.warn('[HKP] Error:', e.message);
    }
  }

  return results;
}

function parseHKPIndex(indexText) {
  // Parse HKP machine-readable index format
  const keyIds = [];
  const lines = indexText.split('\n');

  for (const line of lines) {
    if (line.startsWith('pub:')) {
      const parts = line.split(':');
      if (parts[1]) {
        keyIds.push(parts[1]);
      }
    }
  }

  return keyIds;
}

async function parseKeyInfo(armoredKey) {
  try {
    const key = await openpgp.readKey({ armoredKey });

    // Get primary user ID
    const primaryUser = key.users.find(u => u.userID?.email) || key.users[0];
    const userID = primaryUser?.userID;

    return {
      keyId: key.getKeyID().toHex().toUpperCase(),
      fingerprint: key.getFingerprint().toUpperCase(),
      email: userID?.email || null,
      name: userID?.name || null,
      created: key.getCreationTime(),
      expires: key.getExpirationTime(),
      algorithm: key.getAlgorithmInfo().algorithm
    };
  } catch (e) {
    console.error('[parseKeyInfo] Error:', e);
    return null;
  }
}
