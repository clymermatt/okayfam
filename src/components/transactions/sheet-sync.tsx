'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SheetSyncProps {
  autoSync?: boolean;
  lastSynced?: string | null;
}

export function SheetSync({ autoSync = true, lastSynced }: SheetSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const router = useRouter();

  // Auto-sync on mount (only once)
  useEffect(() => {
    if (autoSync && !hasAutoSynced) {
      setHasAutoSynced(true);
      handleSync(true);
    }
  }, [autoSync, hasAutoSynced]);

  async function handleSync(silent = false) {
    setSyncing(true);
    if (!silent) setResult(null);

    try {
      const response = await fetch('/api/transactions/sync-sheet', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.imported > 0 || data.autoMatched > 0) {
          const parts = [];
          if (data.imported > 0) {
            parts.push(`Imported ${data.imported} transaction${data.imported !== 1 ? 's' : ''}`);
          }
          if (data.autoMatched > 0) {
            parts.push(`auto-linked ${data.autoMatched} to events`);
          }
          if (data.skipped > 0) {
            parts.push(`${data.skipped} duplicates skipped`);
          }
          setResult({
            type: 'success',
            message: parts.join(', '),
          });
          router.refresh();
        } else if (!silent) {
          setResult({
            type: 'success',
            message: data.skipped > 0
              ? `No new transactions (${data.skipped} already imported)`
              : 'No transactions found in sheet',
          });
        }
      } else {
        setResult({
          type: 'error',
          message: data.error || 'Failed to sync',
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Failed to connect to sync service',
      });
    } finally {
      setSyncing(false);
    }
  }

  // Format last synced time
  const lastSyncedDisplay = lastSynced
    ? new Date(lastSynced).toLocaleString()
    : 'Never';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 flex-1">
        <div className="text-sm">
          <span className="text-muted-foreground">Google Sheet sync</span>
          {lastSynced && (
            <span className="text-muted-foreground ml-2">
              · Last: {lastSyncedDisplay}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://docs.google.com/spreadsheets/d/1Bp1DlgifwNrU7trcrk-02O6pyAYgz-VP220xRCroDgs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Open Sheet
          <ExternalLink className="h-3 w-3" />
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSync(false)}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {result && (
        <div
          className={`flex items-center gap-2 text-sm ${
            result.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {result.message}
        </div>
      )}
    </div>
  );
}
