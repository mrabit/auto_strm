import { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, message } from 'antd';
import GlobalDefaultsEditor from '../components/GlobalDefaultsEditor';
import TaskListEditor from '../components/TaskListEditor';
import { fetchConfig, saveConfig } from '../api';
import type { ConfigFile } from '../types';

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
  triggerSave?: number;
  onSaveDone?: () => void;
}

export default function ConfigPage({ onDirtyChange, triggerSave, onSaveDone }: Props) {
  const [config, setConfig] = useState<ConfigFile | null>(null);
  const [loading, setLoading] = useState(true);
  const configRef = useRef(config);
  const savedConfigRef = useRef<ConfigFile | null>(null);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
      configRef.current = cfg;
      savedConfigRef.current = cfg;
      onDirtyChange?.(false);
    } catch (err) {
      message.error('Failed to load config: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [onDirtyChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (triggerSave && triggerSave > 0 && !savingRef.current) {
      savingRef.current = true;
      (async () => {
        try {
          await saveConfig(configRef.current!);
          message.success('Config saved');
          savedConfigRef.current = configRef.current;
          await load();
          onDirtyChange?.(false);
        } catch (err) {
          message.error('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
          savingRef.current = false;
          onSaveDone?.();
        }
      })();
    }
  }, [triggerSave, onDirtyChange, onSaveDone]);

  const toggleEnabled = useCallback(
    async (index: number, enabled: boolean) => {
      const saved = savedConfigRef.current;
      if (!saved) return;
      // Build minimal config: only change the enabled field on the specific task
      const tasks = saved.tasks.map((t, i) => (i === index ? { ...t, enabled } : t));
      const toSave = { ...saved, tasks };
      try {
        await saveConfig(toSave);
        // Fetch latest from server to get any server-side changes (e.g. key assignment)
        const fresh = await fetchConfig();
        savedConfigRef.current = fresh;
        // Sync only this task's enabled back into local config, preserving other edits
        setConfig((prev) => {
          if (!prev) return prev;
          const updated = prev.tasks.map((t, i) =>
            i === index ? { ...t, enabled: fresh.tasks[i]?.enabled ?? enabled } : t,
          );
          return { ...prev, tasks: updated };
        });
      } catch (err) {
        message.error('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
      }
    },
    [],
  );

  function update(changes: Partial<ConfigFile>) {
    if (!config) return;
    const next = { ...config, ...changes };
    setConfig(next);
    configRef.current = next;
    onDirtyChange?.(true);
  }

  if (loading || !config) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <GlobalDefaultsEditor
        value={config.remote}
        cron={config.cron}
        rateLimit={config.rateLimit}
        jellyfin={config.jellyfin}
        onChange={(patch) => update(patch)}
      />

      <h3 style={{ marginBottom: 16 }}>Tasks</h3>
      <TaskListEditor
        tasks={config.tasks}
        defaults={{
          remote: config.remote,
          cron: config.cron,
          rateLimit: config.rateLimit,
          jellyfin: config.jellyfin,
        }}
        onChange={(tasks) => update({ tasks })}
        onToggleEnabled={toggleEnabled}
      />
    </div>
  );
}
