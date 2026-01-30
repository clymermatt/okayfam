// @ts-nocheck - Supabase types not generated
import { createClient } from '@/lib/supabase/server';
import { fetchGoogleSheet } from '@/lib/google-sheets';
import { autoMatchTransactions } from '@/lib/auto-match';
import { NextResponse } from 'next/server';

// The Google Sheet ID (extracted from the URL you shared)
const GOOGLE_SHEET_ID = '1Bp1DlgifwNrU7trcrk-02O6pyAYgz-VP220xRCroDgs';

/**
 * POST /api/transactions/sync-sheet
 * Syncs transactions from the configured Google Sheet
 */
export async function POST() {
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

    // Fetch from Google Sheet
    const result = await fetchGoogleSheet(GOOGLE_SHEET_ID);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (result.transactions.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        message: 'No transactions found in sheet',
      });
    }

    // Get or create virtual account for sheet imports
    let accountId: string;
    const { data: sheetAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('family_id', profile.family_id)
      .eq('plaid_account_id', 'google-sheet-import')
      .single();

    if (sheetAccount) {
      accountId = sheetAccount.id;
    } else {
      // Create virtual connection first
      const { data: sheetConnection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('family_id', profile.family_id)
        .eq('plaid_item_id', 'google-sheet-import')
        .single();

      let connectionId: string;
      if (sheetConnection) {
        connectionId = sheetConnection.id;
      } else {
        const { data: newConnection, error: connError } = await supabase
          .from('bank_connections')
          .insert({
            family_id: profile.family_id,
            plaid_item_id: 'google-sheet-import',
            plaid_access_token: 'none',
            institution_name: 'Google Sheet',
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
          plaid_account_id: 'google-sheet-import',
          name: 'Google Sheet Import',
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

    // Get existing transactions to detect duplicates
    const { data: existingTx } = await supabase
      .from('bank_transactions')
      .select('amount, name, date')
      .eq('family_id', profile.family_id);

    const existingSet = new Set(
      existingTx?.map(tx => `${tx.amount}|${tx.name?.toLowerCase()}|${tx.date}`) || []
    );

    // Filter out duplicates
    const newTransactions = result.transactions.filter(tx => {
      const hash = `${tx.amount}|${tx.description.toLowerCase()}|${tx.date}`;
      return !existingSet.has(hash);
    });

    let imported = 0;
    const skipped = result.transactions.length - newTransactions.length;

    if (newTransactions.length > 0) {
      const inserts = newTransactions.map(tx => ({
        family_id: profile.family_id,
        account_id: accountId,
        plaid_transaction_id: `sheet-${tx.date}-${tx.amount}-${Math.random().toString(36).substring(7)}`,
        amount: tx.amount,
        name: tx.description,
        merchant_name: tx.description,
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

    // Update last synced time on the connection
    await supabase
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('plaid_item_id', 'google-sheet-import')
      .eq('family_id', profile.family_id);

    // Run auto-matching on all unlinked transactions
    const matchResult = await autoMatchTransactions(supabase, profile.family_id);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: result.transactions.length,
      autoMatched: matchResult.matched,
      matchDetails: matchResult.details,
    });
  } catch (error) {
    console.error('Error syncing from sheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions/sync-sheet
 * Returns sync status
 */
export async function GET() {
  return NextResponse.json({
    sheetId: GOOGLE_SHEET_ID,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}`,
  });
}
