import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    console.log('Simple registration test');
    
    const body = await request.json();
    const { email, password, name } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Just return success for now
    const userId = crypto.randomUUID();
    
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully (test)',
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