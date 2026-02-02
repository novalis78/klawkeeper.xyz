import { NextResponse } from 'next/server';
import * as openpgp from 'openpgp';
import pgpUtils from '@/lib/auth/pgp';
import crypto from 'crypto';

/**
 * Password Derivation Test API
 * 
 * This API endpoint tests the password derivation process to ensure
 * it's consistent across multiple calls with the same inputs.
 */

export const dynamic = 'force-dynamic';

// Constants that should match those in dovecotAuth.js
const DOVECOT_AUTH_SALT = 'keykeeper-dovecot-auth';
const DOVECOT_AUTH_VERSION = 'v1';

export async function POST(request) {
  console.log('[Password Test API] Testing password derivation consistency');
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Verify required fields
    const { email, privateKeyArmored, testCount = 5 } = body;
    
    if (!email || !privateKeyArmored) {
      console.error('[Password Test API] Missing required fields');
      return NextResponse.json({ error: 'Email and privateKeyArmored are required' }, { status: 400 });
    }
    
    const results = [];
    const passwordSet = new Set();
    
    // Run the test multiple times to check consistency
    for (let i = 0; i < testCount; i++) {
      console.log(`[Password Test API] Test run #${i + 1}`);
      
      try {
        // Step 1: Create a stable input string
        const input = `${DOVECOT_AUTH_SALT}:${email}:${DOVECOT_AUTH_VERSION}`;
        console.log(`[Password Test API] Input string: "${input}"`);
        
        // Step 2: Sign the input with the private key
        const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
        const message = await openpgp.createMessage({ text: input });
        const signature = await openpgp.sign({
          message,
          signingKeys: privateKey,
          detached: true
        });
        
        // Log signature length for debugging
        console.log(`[Password Test API] Signature length: ${signature.length}`);
        
        // Step 3: Hash the signature
        const hash = crypto.createHash('sha256').update(signature).digest();
        
        // Step 4: Convert to base64
        const hashBase64 = hash.toString('base64');
        console.log(`[Password Test API] Raw hash base64: ${hashBase64.substring(0, 10)}...`);
        
        // Step 5: Clean up and truncate
        const cleanPassword = hashBase64
          .substring(0, 32)
          .replace(/\+/g, 'A')
          .replace(/\//g, 'B')
          .replace(/=/g, 'C');
        
        console.log(`[Password Test API] Generated password: ${cleanPassword}`);
        
        // Add to results and set
        results.push({
          runNumber: i + 1,
          password: cleanPassword,
          signatureLength: signature.length,
          rawHashPrefix: hashBase64.substring(0, 10)
        });
        
        passwordSet.add(cleanPassword);
        
      } catch (runError) {
        console.error(`[Password Test API] Error in test run #${i + 1}:`, runError);
        results.push({
          runNumber: i + 1,
          error: runError.message
        });
      }
    }
    
    // Analyze results
    const isConsistent = passwordSet.size === 1;
    
    return NextResponse.json({
      success: true,
      isConsistent,
      uniquePasswordCount: passwordSet.size,
      passwords: Array.from(passwordSet),
      testCount,
      results
    });
    
  } catch (error) {
    console.error('[Password Test API] Error:', error);
    return NextResponse.json({ 
      error: 'Error testing password derivation',
      details: error.message
    }, { status: 500 });
  }
}