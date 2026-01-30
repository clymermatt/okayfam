import { getFamily, getFamilyMembers, getProfile, getMerchantCategories, getEvents } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BudgetForm } from '@/components/settings/budget-form';
import { FamilyNameForm } from '@/components/settings/family-name-form';
import { FamilyMembersList } from '@/components/settings/family-members-list';
import { AddFamilyMemberForm } from '@/components/settings/add-family-member-form';
import { ImportTransactions } from '@/components/settings/import-transactions';
import { MerchantCategories } from '@/components/settings/merchant-categories';
import { headers } from 'next/headers';

export default async function SettingsPage() {
  const [family, familyMembers, profile, merchantCategories, events] = await Promise.all([
    getFamily(),
    getFamilyMembers(),
    getProfile(),
    getMerchantCategories(),
    getEvents(),
  ]);

  // Build webhook URL for email import
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const webhookUrl = `${protocol}://${host}/api/transactions/import-email`;
  const hasApiKey = !!process.env.TRANSACTION_IMPORT_API_KEY;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Family Name */}
      <Card>
        <CardHeader>
          <CardTitle>Family Name</CardTitle>
          <CardDescription>This appears in the header</CardDescription>
        </CardHeader>
        <CardContent>
          <FamilyNameForm currentName={family?.name || 'My Family'} />
        </CardContent>
      </Card>

      {/* Monthly Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Base Monthly Budget</CardTitle>
          <CardDescription>
            Set a base budget amount. Income from scheduled events (like paychecks) will be added automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BudgetForm currentBudget={family?.monthly_budget || 0} />
          <p className="text-sm text-muted-foreground">
            Tip: Create recurring income events for paychecks and they&apos;ll automatically add to your monthly budget.
          </p>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>
            Add family members to tag them on events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FamilyMembersList members={familyMembers} />
          <AddFamilyMemberForm />
        </CardContent>
      </Card>

      {/* Import Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Transactions</CardTitle>
          <CardDescription>
            Import transactions from your bank to track spending automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportTransactions webhookUrl={webhookUrl} hasApiKey={hasApiKey} />
        </CardContent>
      </Card>

      {/* Transaction Categories */}
      <Card id="categories">
        <CardHeader>
          <CardTitle>Transaction Categories</CardTitle>
          <CardDescription>
            Automatically categorize imported transactions by merchant name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-2">
            <p><strong>Two category types:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Budget</strong> — For variable spending (groceries, gas, dining). Set a monthly limit and track against it.</li>
              <li><strong>Event</strong> — For recurring bills (Netflix, gym). Links transactions to a specific event.</li>
            </ul>
          </div>
          <MerchantCategories categories={merchantCategories} events={events} />
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Signed in as {profile?.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
