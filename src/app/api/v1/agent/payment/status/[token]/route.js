import { NextResponse } from 'next/server';
import bitcoinService from '@/lib/payment/bitcoinService';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Check Payment Status
 *
 * Agent polls this endpoint to check if their payment has been confirmed
 */
export async function GET(request, { params }) {
  try {
    const paymentToken = params.token;

    // Find payment in database
    const payments = await db.query(
      `SELECT * FROM crypto_payments WHERE JSON_EXTRACT(metadata, '$.token') = ?`,
      [paymentToken]
    );

    if (payments.length === 0) {
      return NextResponse.json(
        { error: 'Payment token not found' },
        { status: 404 }
      );
    }

    const payment = payments[0];

    // If already confirmed and claimed, return that status
    if (payment.status === 'confirmed' && payment.claimed_at) {
      return NextResponse.json({
        status: 'claimed',
        credits: parseFloat(payment.credits_purchased),
        message: 'Payment confirmed and credits already claimed'
      });
    }

    // Check blockchain for payment
    const metadata = JSON.parse(payment.metadata);
    const requiredSats = metadata.requiredSats;

    try {
      const paymentStatus = await bitcoinService.checkPaymentStatus(
        payment.payment_address,
        requiredSats
      );

      // Update payment record if confirmed
      if (paymentStatus.isConfirmed && payment.status !== 'confirmed') {
        await db.query(
          `UPDATE crypto_payments
           SET status = ?, confirmations = ?, confirmed_at = NOW()
           WHERE id = ?`,
          ['confirmed', paymentStatus.confirmations, payment.id]
        );

        console.log(`[Payment] Payment ${payment.id} confirmed with ${paymentStatus.confirmations} confirmations`);
      }

      // Return current status
      return NextResponse.json({
        status: paymentStatus.isConfirmed ? 'confirmed' : 'pending',
        paymentAddress: payment.payment_address,
        required: {
          sats: requiredSats,
          btc: requiredSats / 100000000
        },
        received: {
          totalSats: paymentStatus.totalReceivedSats,
          confirmedSats: paymentStatus.confirmedSats,
          pendingSats: paymentStatus.pendingSats,
          btc: paymentStatus.totalReceivedSats / 100000000
        },
        confirmations: paymentStatus.confirmations,
        percentPaid: paymentStatus.percentPaid.toFixed(2),
        isPaid: paymentStatus.isPaid,
        isConfirmed: paymentStatus.isConfirmed,
        canClaim: paymentStatus.isConfirmed && !payment.claimed_at,
        credits: parseFloat(payment.credits_purchased),
        message: paymentStatus.isConfirmed
          ? 'Payment confirmed! You can now claim your credits.'
          : paymentStatus.isPaid
          ? 'Payment detected, waiting for confirmations...'
          : 'Waiting for payment...'
      });
    } catch (blockchainError) {
      console.error('[Payment] Error checking blockchain:', blockchainError);

      // Return cached status if blockchain check fails
      return NextResponse.json({
        status: payment.status,
        paymentAddress: payment.payment_address,
        message: 'Unable to check blockchain. Please try again.',
        lastChecked: payment.confirmed_at || payment.created_at
      });
    }
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status: ' + error.message },
      { status: 500 }
    );
  }
}
