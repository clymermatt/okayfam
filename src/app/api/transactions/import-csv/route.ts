// @ts-nocheck - Supabase types not generated
import { createClient } from '@/lib/supabase/server';
import { parseChaseCSV } from '@/lib/email-parser';
import { NextResponse } from 'next/server';

/**
 * POST /api/transactions/import-csv
 *
 * Accepts Chase CSV export file upload
 * Requires authentication (session cookie)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single() as { data: { family_id: string } | null };

    if (!profile?.family_id) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file content
    const csvContent = await file.text();

    // Parse CSV
    const result = parseChaseCSV(csvContent);

    if (!result.success || result.transactions.length === 0) {
      return NextResponse.json({
        error: 'Failed to parse CSV',
        details: result.errors,
      }, { status: 400 });
    }

    // Get or create virtual account for CSV imports
    let accountId: string;
    const { data: csvAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('family_id', profile.family_id)
      .eq('plaid_account_id', 'csv-import')
      .single();

    if (csvAccount) {
      accountId = csvAccount.id;
    } else {
      // Create virtual connection first
      const { data: csvConnection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('family_id', profile.family_id)
        .eq('plaid_item_id', 'csv-import')
        .single();

      let connectionId: string;
      if (csvConnection) {
        connectionId = csvConnection.id;
      } else {
        const { data: newConnection, error: connError } = await supabase
          .from('bank_connections')
          .insert({
            family_id: profile.family_id,
            plaid_item_id: 'csv-import',
            plaid_access_token: 'none',
            institution_name: 'CSV Import',
            status: 'active',
          })
          .select()
          .single();

        if (connError || !newConnection) {
          return NextResponse.json({ error: 'Failed to set up import' }, { status: 500 });
        }
        connectionId = newConnection.id;
      }

      const { data: newAccount, error: accError } = await supabase
        .from('bank_accounts')
        .insert({
          connection_id: connectionId,
          family_id: profile.family_id,
          plaid_account_id: 'csv-import',
          name: 'CSV Import',
          type: 'depository',
          subtype: 'checking',
          is_tracked: true,
        })
        .select()
        .single();

      if (accError || !newAccount) {
        return NextResponse.json({ error: 'Failed to set up import' }, { status: 500 });
      }
      accountId = newAccount.id;
    }

    // Get existing transaction hashes to detect duplicates
    const { data: existingTx } = await supabase
      .from('bank_transactions')
      .select('amount, name, date')
      .eq('family_id', profile.family_id);

    const existingSet = new Set(
      existingTx?.map(tx => `${tx.amount}|${tx.name?.toLowerCase()}|${tx.date}`) || []
    );

    // Filter out duplicates and prepare inserts
    const newTransactions = result.transactions.filter(tx => {
      const hash = `${tx.amount}|${tx.merchant.toLowerCase()}|${tx.date}`;
      return !existingSet.has(hash);
    });

    let imported = 0;
    let skipped = result.transactions.length - newTransactions.length;

    if (newTransactions.length > 0) {
      const inserts = newTransactions.map(tx => ({
        family_id: profile.family_id,
        account_id: accountId,
        plaid_transaction_id: `csv-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount: tx.amount,
        name: tx.merchant,
        merchant_name: tx.merchant,
        category: null,
        date: tx.date,
        pending: false,
        is_hidden: false,
      }));

      const { error: insertError } = await supabase
        .from('bank_transactions')
        .insert(inserts);

      if (insertError) {
        console.error('Failed to insert transactions:', insertError);
        return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 });
      }

      imported = inserts.length;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: result.transactions.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Error processing CSV import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
