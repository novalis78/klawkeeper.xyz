import { NextResponse } from 'next/server';
import db from '@/lib/db';
import validation from '@/lib/utils/validation';
import accountManager from '@/lib/mail/accountManager';
import { generateServerPasswordHash } from '@/lib/mail/dovecotAuth';

/**
 * User registration API endpoint
 * 
 * This endpoint receives a new user's information and PGP public key,
 * validates the information, and creates a new user account in the database.
 */
// Set dynamic mode to ensure this is handled server-side
export const dynamic = 'force-dynamic';

// Add a version identifier to track which code version is running
const VERSION = 'v2.0.2';

export async function POST(request) {
  console.log(`[Register API ${VERSION}] Registration request received`);
  
  // Check if database connection is available first
  if (!db.isConnected()) {
    console.error('[Register API] Database connection not available!');
    return NextResponse.json(
      { 
        error: 'Database connection not available',
        version: VERSION,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
  
  console.log('[Register API] Database connection confirmed available');
  
  try {
    // Parse request body
    const body = await request.json();
    console.log('[Register API] Request body parsed');
    
    // Extract required fields
    const { email, name, publicKey, keyId, fingerprint, authMethod, mailPassword } = body;
    console.log(`[Register API] Processing registration for: ${email}`);
    
    // Validate required fields
    if (!email || !publicKey || !keyId || !fingerprint || !authMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }
    
    // Validate public key format
    if (!validation.isValidPublicKey(publicKey)) {
      return NextResponse.json(
        { error: 'Invalid PGP public key format' },
        { status: 400 }
      );
    }
    
    // Validate key ID format
    if (!validation.isValidKeyId(keyId)) {
      return NextResponse.json(
        { error: 'Invalid PGP key ID format' },
        { status: 400 }
      );
    }
    
    // Validate fingerprint format
    if (!validation.isValidFingerprint(fingerprint)) {
      return NextResponse.json(
        { error: 'Invalid PGP fingerprint format' },
        { status: 400 }
      );
    }
    
    // Sanitize authentication method
    const sanitizedAuthMethod = validation.sanitizeAuthMethod(authMethod);
    if (!sanitizedAuthMethod) {
      return NextResponse.json(
        { error: 'Invalid authentication method' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    console.log(`[Register API] Checking if email exists: ${email}`);
    try {
      const existingUser = await db.users.findByEmail(email);
      console.log(`[Register API] Email check result:`, existingUser ? 'found' : 'not found');
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    } catch (dbError) {
      console.error('[Register API] Error checking email:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error while checking email', 
          details: {
            message: dbError.message,
            code: dbError.code
          },
          version: VERSION
        },
        { status: 500 }
      );
    }
    
    // Check if fingerprint is already in use
    console.log(`[Register API] Checking if fingerprint exists: ${fingerprint.substring(0, 8)}...`);
    try {
      const existingFingerprint = await db.users.findByFingerprint(fingerprint);
      console.log(`[Register API] Fingerprint check result:`, existingFingerprint ? 'found' : 'not found');
      
      if (existingFingerprint) {
        return NextResponse.json(
          { error: 'PGP key fingerprint already registered to another account' },
          { status: 409 }
        );
      }
    } catch (dbError) {
      console.error('[Register API] Error checking fingerprint:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error while checking fingerprint', 
          details: {
            message: dbError.message,
            code: dbError.code
          },
          version: VERSION
        },
        { status: 500 }
      );
    }
    
    // Create new user
    console.log(`[Register API] Creating new user in database`);
    let userId;
    try {
      userId = await db.users.create({
        email,
        name: name || null,
        publicKey,
        keyId,
        fingerprint,
        authMethod: sanitizedAuthMethod,
        // Default to 'pending' until email verification
        status: 'pending'
      });
      console.log(`[Register API] User created with ID: ${userId}`);
    } catch (dbError) {
      console.error('[Register API] Error creating user:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error while creating user', 
          details: {
            message: dbError.message,
            code: dbError.code
          },
          version: VERSION
        },
        { status: 500 }
      );
    }
    
    // Log user registration
    console.log(`[Register API] Logging user registration activity`);
    try {
      await db.activityLogs.create(userId, 'user_registration', {
        ipAddress: request.headers.get('x-forwarded-for') || request.ip,
        details: {
          email,
          keyId,
          authMethod: sanitizedAuthMethod
        }
      });
      console.log(`[Register API] Registration activity logged`);
    } catch (logError) {
      // Non-fatal error - just log it and continue
      console.error('[Register API] Error logging activity:', logError);
    }
    
    // Check if this is a KeyKeeper email request (create mail account)
    let mailAccountCreated = false;
    
    // Consider any email during signup as a KeyKeeper email
    // You can change this if you only want to create mail accounts for specific domains
    const isKeyKeeperEmail = true; // For testing - create mail account for any email
    // const isKeyKeeperEmail = email.endsWith('@keykeeper.world') || email.endsWith('@phoneshield.ai');
    
    console.log(`[Register API] Email domain check: ${email}`);
    console.log(`[Register API] CREATE_MAIL_ACCOUNTS=${process.env.CREATE_MAIL_ACCOUNTS}`);
    console.log(`[Register API] Environment vars: MAIL_USERS_TABLE=${process.env.MAIL_USERS_TABLE}, MAIL_DOMAINS_TABLE=${process.env.MAIL_DOMAINS_TABLE}`);
    
    // Force mail account creation for all users
    const shouldCreateMailAccount = isKeyKeeperEmail; // Override environment check for testing
    console.log(`[Register API] Will create mail account: ${shouldCreateMailAccount}`);
    
    if (shouldCreateMailAccount) {
      try {
        console.log(`[Register API] Creating mail account for: ${email}`);
        
        // Initialize account password
        let accountPassword;
        
        // Generate a deterministic mail password based on the user's public key
        // This should match exactly what the client will derive during login
        console.log(`[Register API] Generating deterministic password for email: ${email}`);
        
        try {
          // First, generate the deterministic password (same algorithm as client login)
          // Important: This needs to match exactly what deriveDovecotPassword will produce!
          const deterministicPassword = await generateDeterministicPassword(email, publicKey);
          console.log(`[Register API] Successfully generated deterministic mail password`);
          console.log(`[Register API] Password first few chars: ${deterministicPassword.substring(0, 5)}...`);
          
          // Generate a SHA512-CRYPT hash of this password for Dovecot
          const passwordHash = await generateServerPasswordHash(email, publicKey);
          console.log(`[Register API] Successfully generated server password hash`);
          
          // Important: Use the actual deterministic password that will be derived on login
          // This ensures the hash stored in the database will match what the client sends
          accountPassword = deterministicPassword;
          
          // For testing in development, you can set this env var to see the actual password
          if (process.env.NODE_ENV === 'development' && process.env.LOG_PASSWORDS === 'true') {
            console.log(`[Register API] DEVELOPMENT ONLY - Password: ${accountPassword}`);
          }
        } catch (passwordError) {
          console.error('[Register API] Error generating deterministic password:', passwordError);
          
          // Fall back to using user-provided mail password if available, otherwise generate one
          accountPassword = mailPassword;
          
          // If no password was provided, generate a secure one
          if (!accountPassword) {
            console.log(`[Register API] No mail password provided, generating one`);
            const crypto = await import('crypto');
            
            // Create a secure hash from fingerprint and key ID
            const mailPasswordBase = crypto.createHash('sha256')
              .update(fingerprint + keyId)
              .digest('hex');
              
            // Add some random bits for additional security
            const randomBits = crypto.randomBytes(8).toString('hex');
            accountPassword = mailPasswordBase.substring(0, 24) + randomBits;
            
            console.log(`[Register API] Generated secure mail password for: ${email}`);
          } else {
            console.log(`[Register API] Using user-provided mail password`);
          }
        }
        
        // Create the mail account with userId to link it
        const result = await accountManager.createMailAccount(
          email,
          accountPassword,
          name || email.split('@')[0],
          parseInt(process.env.DEFAULT_MAIL_QUOTA || '1024'),
          userId // Pass userId to link the accounts
        );
        
        console.log(`[Register API] Mail account created successfully: ${email}`);
        mailAccountCreated = true;
        
        // Store mail account password in user record (encrypted)
        await db.users.updateMailPassword(userId, accountPassword);
        
        // Log mail account creation
        await db.activityLogs.create(userId, 'mail_account_creation', {
          email,
          success: true
        });
      } catch (mailError) {
        console.error('[Register API] Error creating mail account:', mailError);
        
        // Log the error but continue - we'll still create the user account
        await db.activityLogs.create(userId, 'mail_account_creation', {
          email,
          success: false,
          error: mailError.message
        });
      }
    } else {
      console.log(`[Register API] Skipping mail account creation. isKeyKeeperEmail=${isKeyKeeperEmail}, CREATE_MAIL_ACCOUNTS=${process.env.CREATE_MAIL_ACCOUNTS}`);
    }
    
    // Return success response
    console.log(`[Register API] Registration successful for: ${email}`);
    return NextResponse.json(
      { 
        success: true, 
        message: 'User registered successfully',
        userId,
        status: 'pending',
        mailAccountCreated,
        version: VERSION
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[Register API] General registration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error during registration', 
        details: {
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        version: VERSION
      },
      { status: 500 }
    );
  }
}