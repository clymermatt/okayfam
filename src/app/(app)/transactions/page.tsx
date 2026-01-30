import { getBankConnections, getMonthTransactions, getEvents, getMerchantCategories } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TransactionList } from '@/components/transactions/transaction-list';
import { SheetSync } from '@/components/transactions/sheet-sync';
import { MonthNavigator } from '@/components/budget/month-navigator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const [connections, transactions, events, allCategories] = await Promise.all([
    getBankConnections(),
    getMonthTransactions(year, month),
    getEvents('upcoming'),
    getMerchantCategories(),
  ]);

  // Find the Google Sheet connection for last sync time
  const sheetConnection = connections.find(c => c.plaid_item_id === 'google-sheet-import');

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Import Settings
          </Button>
        </Link>
      </div>

      {/* Month navigation */}
      <MonthNavigator year={year} month={month} basePath="/transactions" />

      {/* Google Sheet sync bar */}
      <SheetSync
        autoSync={true}
        lastSynced={sheetConnection?.last_synced_at}
      />

      {transactions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Transactions This Month</CardTitle>
            <CardDescription>
              No transactions found for {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}.
              Try navigating to a different month or sync new transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="https://docs.google.com/spreadsheets/d/1Bp1DlgifwNrU7trcrk-02O6pyAYgz-VP220xRCroDgs"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>Open Google Sheet</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <TransactionList
          transactions={transactions}
          upcomingEvents={events}
          allCategories={allCategories}
        />
      )}
    </div>
  );
}
