import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import accountManager from '@/lib/mail/accountManager';
import db from '@/lib/db';
import { deriveMailPasswordFromHash } from '@/lib/auth/serverPgp';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with active status
    const userId = uuidv4();
    await query(
      `INSERT INTO users (
        id, email, name, password_hash,
        account_type, auth_method, status, created_at
      ) VALUES (?, ?, ?, ?, 'human', 'password', 'active', NOW())`,
      [userId, email, name || null, passwordHash]
    );

    // Auto-provision mail account for the user
    // Derive the mail password deterministically from the password hash
    // This ensures the same password is generated on login
    let mailPassword;
    try {
      mailPassword = await deriveMailPasswordFromHash(email, passwordHash);
      console.log(`[Registration] Derived mail password for ${email} (length: ${mailPassword.length})`);
    } catch (deriveError) {
      console.error('[Registration] Failed to derive mail password:', deriveError);
      // Fall back to random password if derivation fails
      mailPassword = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '').substring(0, 32);
    }

    // Create virtual_users entry for Postfix/Dovecot authentication
    try {
      // Insert directly into virtual_users with PLAIN password format
      // This bypasses the complex accountManager and ensures consistency
      const [username, domain] = email.split('@');

      // Check/create domain first
      const domainResult = await query(
        'SELECT id FROM virtual_domains WHERE name = ?',
        [domain]
      );

      let domainId;
      if (domainResult.length === 0) {
        // Create domain if it doesn't exist
        const insertDomain = await query(
          'INSERT INTO virtual_domains (name) VALUES (?)',
          [domain]
        );
        domainId = insertDomain.insertId;
        console.log(`[Registration] Created domain ${domain} with ID ${domainId}`);
      } else {
        domainId = domainResult[0].id;
      }

      // Insert into virtual_users with PLAIN password format
      // This is what Dovecot reads for authentication
      await query(
        `INSERT INTO virtual_users (domain_id, username, password, email, user_id, pending_activation)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [domainId, username, `{PLAIN}${mailPassword}`, email, userId]
      );

      console.log(`[Registration] Mail account created successfully for: ${email}`);

      // Log mail account creation
      await db.activityLogs.create(userId, 'mail_account_creation', {
        email,
        success: true
      });
    } catch (mailError) {
      console.error('[Registration] Error creating mail account:', mailError);

      // Log the failure for debugging
      try {
        await db.activityLogs.create(userId, 'mail_account_creation', {
          email,
          success: false,
          error: mailError.message
        });
      } catch (logError) {
        console.error('[Registration] Failed to log mail creation error:', logError);
      }

      // Don't fail registration - user account is created, mail can be set up later
      console.warn(`[Registration] Continuing without mail account for ${email}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId,
        email,
        accountType: 'human'
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    console.log('User registered successfully:', email);

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: userId,
          email,
          name: name || null,
          accountType: 'human'
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}