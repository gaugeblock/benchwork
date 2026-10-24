import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AlertTriangle, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface MigrationBannerProps {
  onMigrated?: () => void;
}

export const MigrationBanner: React.FC<MigrationBannerProps> = ({ onMigrated }) => {
  const [hasLegacy, setHasLegacy] = useState(false);
  const [legacyCount, setLegacyCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.getMigrationPlan()
      .then((plan) => {
        if (plan.has_legacy_items) {
          setHasLegacy(true);
          setLegacyCount(plan.items.length);
        }
      })
      .catch((err) => console.error('Failed checking migration plan:', err));
  }, []);

  if (!hasLegacy || dismissed) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const receipt = await api.executeMigration({ dry_run: false, force: false });
      setSuccessMsg(`Migrated ${receipt.migrated_count} items to .gaugeblock/`);
      setTimeout(() => {
        setHasLegacy(false);
        onMigrated?.();
      }, 2000);
    } catch (err: any) {
      alert(`Migration failed: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0">
      <div className="flex items-center gap-2">
        {successMsg ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <span>
          {successMsg ? (
            <span className="text-emerald-300 font-mono">{successMsg}</span>
          ) : (
            <>
              <span className="font-semibold uppercase tracking-wider text-amber-300 mr-1.5">
                Layout Upgrade:
              </span>
              Detected {legacyCount} legacy items (.storypole, sawhorse.toml, etc.). Consolidate into unified <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">.gaugeblock/</code> directory?
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!successMsg && (
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-xs transition-colors disabled:opacity-50"
          >
            {migrating ? 'Migrating...' : 'Migrate Now'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/70 hover:text-amber-200 p-1"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

