import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import validation from '@/lib/utils/validation';
import accountManager from '@/lib/mail/accountManager';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Simplified user registration for humans
 * Uses email/password instead of PGP keys
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate user ID
    const userId = crypto.randomUUID();

    // Create user account
    await db.users.createSimple({
      id: userId,
      email,
      name: name || null,
      passwordHash,
      accountType: 'human',
      status: 'active' // Activate immediately for simplified flow
    });

    // Create mail account for @keykeeper.world email
    // Generate a secure mail password
    const mailPassword = crypto.randomBytes(32).toString('hex');

    try {
      await accountManager.createMailAccount(
        email,
        mailPassword,
        name || email.split('@')[0],
        parseInt(process.env.DEFAULT_MAIL_QUOTA || '1024'),
        userId
      );

      // Store mail password (encrypted)
      await db.users.updateMailPassword(userId, mailPassword);

      // Log mail account creation
      await db.activityLogs.create(userId, 'mail_account_creation', {
        email,
        success: true
      });
    } catch (mailError) {
      console.error('Error creating mail account:', mailError);
      // Continue anyway - user can set up mail later
      await db.activityLogs.create(userId, 'mail_account_creation', {
        email,
        success: false,
        error: mailError.message
      });
    }

    // Log user registration
    await db.activityLogs.create(userId, 'user_registration_simple', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      details: { email, accountType: 'human' }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        userId,
        email
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Server error during registration: ' + error.message },
      { status: 500 }
    );
  }
}
