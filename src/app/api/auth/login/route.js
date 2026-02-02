import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import jwt from '@/lib/auth/jwt';
import db, { query } from '@/lib/db';
import { deriveMailPasswordFromHash } from '@/lib/auth/serverPgp';

export const dynamic = 'force-dynamic';

/**
 * Auto-repair missing virtual_users entry for a user
 * This ensures mail access works even if registration partially failed
 */
async function ensureMailboxExists(user, mailPassword) {
  try {
    // Check if virtual_users entry exists
    const existingMailbox = await query(
      'SELECT id FROM virtual_users WHERE user_id = ? OR email = ?',
      [user.id, user.email]
    );

    if (existingMailbox.length > 0) {
      // Mailbox exists - update password to ensure consistency
      await query(
        'UPDATE virtual_users SET password = ? WHERE user_id = ? OR email = ?',
        [`{PLAIN}${mailPassword}`, user.id, user.email]
      );
      console.log(`[Login Auto-repair] Updated mail password for ${user.email}`);
      return { repaired: false, updated: true };
    }

    // No mailbox exists - create one
    console.log(`[Login Auto-repair] No mailbox found for ${user.email}, creating...`);

    const [username, domain] = user.email.split('@');

    // Get or create domain
    const domainResult = await query(
      'SELECT id FROM virtual_domains WHERE name = ?',
      [domain]
    );

    let domainId;
    if (domainResult.length === 0) {
      const insertDomain = await query(
        'INSERT INTO virtual_domains (name) VALUES (?)',
        [domain]
      );
      domainId = insertDomain.insertId;
      console.log(`[Login Auto-repair] Created domain ${domain} with ID ${domainId}`);
    } else {
      domainId = domainResult[0].id;
    }

    // Create virtual_users entry
    await query(
      `INSERT INTO virtual_users (domain_id, username, password, email, user_id, pending_activation)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [domainId, username, `{PLAIN}${mailPassword}`, user.email, user.id]
    );

    console.log(`[Login Auto-repair] Created mailbox for ${user.email}`);

    // Log the repair
    await db.activityLogs.create(user.id, 'mail_account_auto_repair', {
      email: user.email,
      success: true
    });

    return { repaired: true, updated: false };
  } catch (error) {
    console.error(`[Login Auto-repair] Failed for ${user.email}:`, error);
    // Don't fail login for mail repair issues
    return { repaired: false, updated: false, error: error.message };
  }
}

/**
 * Simplified login using email/password + optional 2FA
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, totpCode } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.users.findByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if this is a password-based account
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'This account uses a different authentication method' },
        { status: 400 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      // Log failed login attempt
      await db.activityLogs.create(user.id, 'login_failed', {
        ipAddress: request.headers.get('x-forwarded-for') || request.ip,
        reason: 'invalid_password'
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.totp_enabled) {
      if (!totpCode) {
        return NextResponse.json(
          {
            error: '2FA code required',
            requires2FA: true
          },
          { status: 403 }
        );
      }

      // Verify TOTP code
      try {
        const totp = new OTPAuth.TOTP({
          secret: user.totp_secret,
          digits: 6,
          period: 30
        });

        const isValid = totp.validate({ token: totpCode, window: 1 }) !== null;

        if (!isValid) {
          await db.activityLogs.create(user.id, 'login_failed', {
            ipAddress: request.headers.get('x-forwarded-for') || request.ip,
            reason: 'invalid_2fa'
          });

          return NextResponse.json(
            { error: 'Invalid 2FA code' },
            { status: 401 }
          );
        }
      } catch (totpError) {
        console.error('2FA verification error:', totpError);
        return NextResponse.json(
          { error: '2FA verification failed' },
          { status: 500 }
        );
      }
    }

    // Generate JWT token
    const token = await jwt.generateToken({
      userId: user.id,
      email: user.email,
      accountType: user.account_type || 'human',
      keyId: user.key_id,
      fingerprint: user.fingerprint
    });

    // Update last login timestamp
    await db.users.updateLastLogin(user.id);

    // Log successful login
    await db.activityLogs.create(user.id, 'login_success', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });

    // Derive mail password for client-side credential storage
    let mailPassword = null;
    let mailboxRepaired = false;
    try {
      if (user.password_hash) {
        mailPassword = await deriveMailPasswordFromHash(email, user.password_hash);
        console.log(`Derived mail password for ${email}`);

        // Auto-repair: ensure virtual_users entry exists and password is correct
        // This fixes cases where registration failed to create the mailbox
        const repairResult = await ensureMailboxExists(user, mailPassword);
        mailboxRepaired = repairResult.repaired;
        if (repairResult.repaired) {
          console.log(`[Login] Auto-repaired mailbox for ${email}`);
        }
      }
    } catch (deriveError) {
      console.error('Failed to derive mail password:', deriveError);
      // Non-fatal - continue without mail password
    }

    // Return token and user info
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.account_type || 'human',
        totpEnabled: user.totp_enabled || false,
        keyId: user.key_id,
        fingerprint: user.fingerprint,
        hasPgpKeys: !!(user.public_key && user.key_id && user.fingerprint)
      },
      mailPassword // Include derived mail password for client storage
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed: ' + error.message },
      { status: 500 }
    );
  }
}