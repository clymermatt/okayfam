'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Mail, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ImportTransactionsProps {
  webhookUrl: string;
  hasApiKey: boolean;
}

export function ImportTransactions({ webhookUrl, hasApiKey }: ImportTransactionsProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'email'>('csv');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/transactions/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          type: 'success',
          message: `Imported ${data.imported} transactions${data.skipped > 0 ? ` (${data.skipped} duplicates skipped)` : ''}`,
          details: data.errors,
        });
        router.refresh();
      } else {
        setResult({
          type: 'error',
          message: data.error || 'Failed to import',
          details: data.details,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Failed to upload file',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('csv')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'csv'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="h-4 w-4 inline mr-2" />
          CSV Upload
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'email'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4 inline mr-2" />
          Email Automation
          <Badge variant="secondary" className="ml-2 text-xs">Beta</Badge>
        </button>
      </div>

      {/* CSV Upload Tab */}
      {activeTab === 'csv' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export transactions from Chase as CSV and upload here.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">How to export from Chase:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Log in to chase.com</li>
              <li>Go to your account activity</li>
              <li>Click &quot;Download account activity&quot;</li>
              <li>Select date range and CSV format</li>
              <li>Upload the file below</li>
            </ol>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Choose CSV File'}
            </Button>
          </div>

          {result && (
            <div
              className={`p-3 rounded-md text-sm flex items-start gap-2 ${
                result.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {result.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p>{result.message}</p>
                {result.details && result.details.length > 0 && (
                  <ul className="mt-1 text-xs opacity-80">
                    {result.details.slice(0, 3).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                    {result.details.length > 3 && (
                      <li>...and {result.details.length - 3} more</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Automation Tab */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Automatically import transactions by forwarding Chase alert emails.
          </p>

          {!hasApiKey ? (
            <div className="bg-amber-50 text-amber-700 p-4 rounded-md text-sm">
              <p className="font-medium">Setup Required</p>
              <p className="mt-1">
                Add <code className="bg-amber-100 px-1 rounded">TRANSACTION_IMPORT_API_KEY</code> to your environment variables to enable email import.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Setup with Zapier/Make:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Enable Chase transaction alerts (email for each transaction)</li>
                  <li>Create a Zap/scenario that triggers on new emails from Chase</li>
                  <li>Add a webhook action that POSTs to the URL below</li>
                  <li>Map the email subject and body to the request</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                    {webhookUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Request Format</p>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`POST ${webhookUrl}
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json

Body (simple format):
{
  "amount": 45.67,
  "merchant": "Starbucks",
  "date": "2024-01-15"
}

Or (email format):
{
  "subject": "Your $45.67 transaction...",
  "body": "... email content ..."
}`}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
