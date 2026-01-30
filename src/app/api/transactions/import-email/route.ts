// @ts-nocheck - Supabase types not generated
import { createClient } from '@/lib/supabase/server';
import { parseChaseEmail, parseSimpleTransaction, SimpleTransactionInput } from '@/lib/email-parser';
import { NextResponse } from 'next/server';

// Verify API key for webhook security
function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.TRANSACTION_IMPORT_API_KEY;

  // If no API key is configured, reject all requests
  if (!expectedKey) {
    console.warn('TRANSACTION_IMPORT_API_KEY not configured');
    return false;
  }

  return apiKey === expectedKey;
}

/**
 * POST /api/transactions/import-email
 *
 * Accepts transaction data in multiple formats:
 *
 * 1. Simple JSON (recommended for Zapier/Make/Apps Script):
 *    {
 *      "amount": 45.67,
 *      "merchant": "Starbucks",
 *      "date": "2024-01-15",  // optional
 *      "card_last4": "1234",  // optional
 *      "type": "charge"       // optional: "charge" or "credit"
 *    }
 *
 * 2. Email format (for email forwarding services):
 *    {
 *      "subject": "Your $45.67 transaction with STARBUCKS",
 *      "body": "... email body ...",
 *      "from": "no-reply@chase.com"
 *    }
 *
 * 3. Mailgun/SendGrid inbound format:
 *    Form data with 'subject', 'body-plain' or 'text', 'from' fields
 *
 * Headers:
 *   x-api-key: Your TRANSACTION_IMPORT_API_KEY
 *   x-family-id: (optional) Target family ID, defaults to first family with matching API key
 */
export async function POST(request: Request) {
  // Verify API key
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let data: Record<string, unknown>;

    // Parse request body based on content type
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form data (Mailgun/SendGrid style)
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    // Determine format and parse
    let parsedResult;

    if ('subject' in data || 'body' in data || 'body-plain' in data || 'text' in data) {
      // Email format
      const subject = (data.subject as string) || '';
      const body = (data.body as string) || (data['body-plain'] as string) || (data.text as string) || '';

      // Verify it's from Chase (basic check)
      const from = (data.from as string) || '';
      if (from && !from.includes('chase.com') && !from.includes('chase@')) {
        // Allow non-Chase emails but log it
        console.log('Email not from chase.com:', from);
      }

      parsedResult = parseChaseEmail(subject, body);
    } else if ('amount' in data || 'merchant' in data) {
      // Simple JSON format
      parsedResult = parseSimpleTransaction(data as unknown as SimpleTransactionInput);
    } else {
      return NextResponse.json(
        { error: 'Invalid request format. Expected email or transaction data.' },
        { status: 400 }
      );
    }

    if (!parsedResult.success || !parsedResult.transaction) {
      return NextResponse.json(
        { error: parsedResult.error || 'Failed to parse transaction' },
        { status: 400 }
      );
    }

    // Get family ID from header or find default
    const supabase = await createClient();
    let familyId = request.headers.get('x-family-id');

    if (!familyId) {
      // Get the first family from import_settings or just use any family
      // For now, we'll need a way to identify which family this belongs to
      // Using a simple approach: get the family associated with the API key config
      const { data: families } = await supabase
        .from('families')
        .select('id')
        .limit(1)
        .single();

      if (!families) {
        return NextResponse.json({ error: 'No family found' }, { status: 400 });
      }
      familyId = families.id;
    }

    // Check for duplicate transaction (same amount, merchant, date)
    const tx = parsedResult.transaction;
    const { data: existing } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('family_id', familyId)
      .eq('amount', tx.amount)
      .eq('date', tx.date)
      .ilike('name', tx.merchant)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: 'Transaction already exists',
        transaction_id: existing[0].id,
      });
    }

    // Create a virtual account for email imports if it doesn't exist
    let accountId: string;
    const { data: emailAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('family_id', familyId)
      .eq('plaid_account_id', 'email-import')
      .single();

    if (emailAccount) {
      accountId = emailAccount.id;
    } else {
      // Create the virtual account
      // First, create a virtual connection
      const { data: emailConnection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('family_id', familyId)
        .eq('plaid_item_id', 'email-import')
        .single();

      let connectionId: string;
      if (emailConnection) {
        connectionId = emailConnection.id;
      } else {
        const { data: newConnection, error: connError } = await supabase
          .from('bank_connections')
          .insert({
            family_id: familyId,
            plaid_item_id: 'email-import',
            plaid_access_token: 'none',
            institution_name: 'Email Import',
            status: 'active',
          })
          .select()
          .single();

        if (connError || !newConnection) {
          console.error('Failed to create email import connection:', connError);
          return NextResponse.json({ error: 'Failed to set up import' }, { status: 500 });
        }
        connectionId = newConnection.id;
      }

      const { data: newAccount, error: accError } = await supabase
        .from('bank_accounts')
        .insert({
          connection_id: connectionId,
          family_id: familyId,
          plaid_account_id: 'email-import',
          name: tx.cardLast4 ? `Card ****${tx.cardLast4}` : 'Email Import',
          type: 'depository',
          subtype: 'checking',
          mask: tx.cardLast4 || null,
          is_tracked: true,
        })
        .select()
        .single();

      if (accError || !newAccount) {
        console.error('Failed to create email import account:', accError);
        return NextResponse.json({ error: 'Failed to set up import' }, { status: 500 });
      }
      accountId = newAccount.id;
    }

    // Insert the transaction
    const transactionId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('bank_transactions')
      .insert({
        id: transactionId,
        family_id: familyId,
        account_id: accountId,
        plaid_transaction_id: `email-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount: tx.amount,
        name: tx.merchant,
        merchant_name: tx.merchant,
        category: null,
        date: tx.date,
        pending: false,
        is_hidden: false,
      });

    if (insertError) {
      console.error('Failed to insert transaction:', insertError);
      return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      transaction: {
        amount: tx.amount,
        merchant: tx.merchant,
        date: tx.date,
      },
    });
  } catch (error) {
    console.error('Error processing transaction import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Transaction import endpoint ready',
    formats: [
      'Simple JSON: { amount, merchant, date?, card_last4?, type? }',
      'Email: { subject, body, from? }',
      'Form data (Mailgun/SendGrid style)',
    ],
  });
}
