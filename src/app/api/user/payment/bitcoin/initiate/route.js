import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import bitcoinService from '@/lib/payment/bitcoinService';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Initiate Bitcoin Payment for Human User (3-Year Plan)
 *
 * This generates a unique Bitcoin address for the user to pay $30
 * for 3 years of Pro features (500 emails/day)
 */
export async function POST(request) {
  try {
    // Verify user is authenticated
    let token = extractTokenFromHeader(request);

    if (!token) {
      const cookieStore = cookies();
      token = extractTokenFromCookies(cookieStore);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    const userId = payload.userId;

    // Get user email
    const [user] = await query(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userEmail = user.email;

    // Check if user already has an active subscription
    const [existingSubscription] = await query(
      `SELECT subscription_status, subscription_plan, subscription_expires_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (existingSubscription?.subscription_status === 'active') {
      return NextResponse.json(
        {
          error: 'You already have an active subscription',
          currentPlan: existingSubscription.subscription_plan,
          expiresAt: existingSubscription.subscription_expires_at
        },
        { status: 400 }
      );
    }

    // Generate payment token
    const paymentToken = `btc_human_${crypto.randomBytes(32).toString('hex')}`;

    // Generate deterministic Bitcoin address
    const bitcoinAddress = bitcoinService.generateBitcoinAddress(paymentToken);

    // Get current BTC price and calculate amount needed for $30
    const btcPrice = await bitcoinService.fetchBitcoinPrice();
    const usdAmount = 30; // 3-year plan price
    const btcAmount = usdAmount / btcPrice;
    const sats = Math.ceil(btcAmount * 100000000);

    // Store payment request in database
    const paymentId = crypto.randomUUID();
    await query(
      `INSERT INTO crypto_payments (
        id, user_id, payment_address, amount_btc, amount_usd,
        credits_purchased, status, metadata, blockchain, token_symbol
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        userId,
        bitcoinAddress,
        btcAmount,
        usdAmount,
        0, // Not using credits for human users
        'pending',
        JSON.stringify({
          paymentToken,
          plan: 'bitcoin-3year',
          userEmail,
          btcPrice,
          requiredSats: sats
        }),
        'bitcoin',
        'BTC'
      ]
    );

    console.log(`[Bitcoin Payment] Created payment for user ${userId}: ${bitcoinAddress} (${sats} sats)`);

    // Return payment details
    return NextResponse.json({
      paymentToken,
      bitcoinAddress,
      amount: {
        usd: usdAmount,
        btc: btcAmount,
        sats
      },
      btcPrice,
      plan: {
        name: 'Bitcoin 3-Year Plan',
        duration: '3 years',
        emailsPerDay: 500,
        price: '$30 one-time'
      },
      qrData: `bitcoin:${bitcoinAddress}?amount=${btcAmount}`,
      instructions: [
        `Send exactly ${btcAmount.toFixed(8)} BTC to the address above`,
        'Payment will be confirmed after 1 confirmation',
        'Your account will be automatically upgraded once payment is received'
      ]
    });

  } catch (error) {
    console.error('[Bitcoin Payment] Initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Bitcoin payment: ' + error.message },
      { status: 500 }
    );
  }
}
