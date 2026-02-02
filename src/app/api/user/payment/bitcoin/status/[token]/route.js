import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bitcoinService from '@/lib/payment/bitcoinService';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Check Bitcoin Payment Status
 *
 * Polls mempool.space to check if payment has been received
 * and automatically upgrades user subscription when confirmed
 */
export async function GET(request, { params }) {
  try {
    // Verify user is authenticated
    let authToken = extractTokenFromHeader(request);

    if (!authToken) {
      const cookieStore = cookies();
      authToken = extractTokenFromCookies(cookieStore);
    }

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(authToken);
    const userId = payload.userId;

    const { token } = params;

    // Find payment in database
    const [payment] = await query(
      `SELECT * FROM crypto_payments
       WHERE JSON_EXTRACT(metadata, '$.paymentToken') = ?
       AND user_id = ?
       AND blockchain = 'bitcoin'`,
      [token, userId]
    );

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If already confirmed, return success
    if (payment.status === 'confirmed' || payment.status === 'claimed') {
      return NextResponse.json({
        status: 'confirmed',
        paymentAddress: payment.payment_address,
        amountReceived: {
          btc: payment.amount_btc,
          usd: payment.amount_usd,
          sats: Math.ceil(payment.amount_btc * 100000000)
        },
        confirmedAt: payment.confirmed_at,
        message: 'Payment confirmed! Your subscription is active.'
      });
    }

    // Check payment status on blockchain
    const metadata = JSON.parse(payment.metadata);
    const requiredSats = metadata.requiredSats;

    const paymentStatus = await bitcoinService.checkPaymentStatus(
      payment.payment_address,
      requiredSats
    );

    console.log(`[Bitcoin Payment] Status check for ${token}:`, paymentStatus);

    // If payment is confirmed on blockchain
    if (paymentStatus.isConfirmed) {
      // Get transactions to find the tx hash
      const transactions = await bitcoinService.getAddressTransactions(payment.payment_address);
      const txHash = transactions.length > 0 ? transactions[0].txid : null;

      // Update payment status
      await query(
        `UPDATE crypto_payments
         SET status = 'confirmed',
             confirmed_at = NOW(),
             transaction_hash = ?,
             network_confirmations = ?
         WHERE id = ?`,
        [txHash, paymentStatus.confirmations, payment.id]
      );

      // Update user subscription to Bitcoin 3-year plan
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 3); // Add 3 years

      await query(
        `UPDATE users
         SET subscription_status = 'active',
             subscription_plan = 'bitcoin',
             subscription_expires_at = ?
         WHERE id = ?`,
        [expiresAt, userId]
      );

      console.log(`[Bitcoin Payment] Confirmed payment ${payment.id} for user ${userId}. Subscription expires: ${expiresAt}`);

      return NextResponse.json({
        status: 'confirmed',
        paymentAddress: payment.payment_address,
        amountReceived: {
          btc: payment.amount_btc,
          usd: payment.amount_usd,
          sats: paymentStatus.confirmedSats
        },
        transactionHash: txHash,
        confirmations: paymentStatus.confirmations,
        confirmedAt: new Date(),
        subscriptionExpiresAt: expiresAt,
        message: 'Payment confirmed! Your 3-year Bitcoin plan is now active.'
      });
    }

    // Payment pending or partially received
    return NextResponse.json({
      status: paymentStatus.isPaid ? 'pending_confirmation' : 'pending',
      paymentAddress: payment.payment_address,
      required: {
        btc: payment.amount_btc,
        usd: payment.amount_usd,
        sats: requiredSats
      },
      received: {
        sats: paymentStatus.totalReceivedSats,
        confirmed: paymentStatus.confirmedSats,
        pending: paymentStatus.pendingSats
      },
      confirmations: paymentStatus.confirmations,
      percentPaid: paymentStatus.percentPaid,
      message: paymentStatus.isPaid
        ? 'Payment detected! Waiting for confirmations...'
        : 'Waiting for payment...'
    });

  } catch (error) {
    console.error('[Bitcoin Payment] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status: ' + error.message },
      { status: 500 }
    );
  }
}
