import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { message } from 'antd';
import { fetchConfig, saveConfig } from '../api';
import type { ConfigFile } from '../types';

interface ConfigState {
  config: ConfigFile | null;
  loading: boolean;
  dirty: boolean;
  saving: boolean;
  update: (patch: Partial<ConfigFile>) => void;
  toggleEnabled: (index: number, enabled: boolean) => Promise<void>;
  save: () => void;
  reload: () => Promise<void>;
}

const ConfigStateContext = createContext<ConfigState | null>(null);

export function useConfigState() {
  const ctx = useContext(ConfigStateContext);
  if (!ctx) throw new Error('useConfigState must be used within ConfigStateProvider');
  return ctx;
}

export function ConfigStateProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
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
      setDirty(false);
    } catch (err) {
      message.error('Failed to load config: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!dirty) {
      message.info('No changes to save');
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await saveConfig(configRef.current!);
      message.success('Config saved');
      savedConfigRef.current = configRef.current;
      await load();
      setDirty(false);
    } catch (err) {
      message.error('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [dirty, load]);

  const toggleEnabled = useCallback(
    async (index: number, enabled: boolean) => {
      const saved = savedConfigRef.current;
      if (!saved) return;
      const tasks = saved.tasks.map((t, i) => (i === index ? { ...t, enabled } : t));
      const toSave = { ...saved, tasks };
      try {
        await saveConfig(toSave);
        const fresh = await fetchConfig();
        savedConfigRef.current = fresh;
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

  const update = useCallback((patch: Partial<ConfigFile>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      configRef.current = next;
      return next;
    });
    setDirty(true);
  }, []);

  return (
    <ConfigStateContext.Provider value={{ config, loading, dirty, saving, update, toggleEnabled, save, reload: load }}>
      {children}
    </ConfigStateContext.Provider>
  );
}
