import { InputNumber, Space } from 'antd';
import Addon from './Addon';
import type { RateLimitConfig } from '../types';

const DEFAULTS = { concurrency: 5, intervalMs: 200 };

interface Props {
  value?: RateLimitConfig;
  onChange?: (value: RateLimitConfig) => void;
  inherited?: RateLimitConfig;
}

export default function RateLimitFields({ value = {}, onChange, inherited }: Props) {
  const fallback = { ...DEFAULTS, ...inherited };

  function update(key: keyof RateLimitConfig, val: number | null) {
    onChange?.({ ...value, [key]: val ?? undefined });
  }

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Addon label="Concurrency" />
        <InputNumber
          style={{ width: '100%' }}
          placeholder={String(fallback.concurrency)}
          min={1}
          max={20}
          value={value.concurrency}
          onChange={(v) => update('concurrency', v)}
        />
      </Space.Compact>
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Addon label="Interval (ms)" />
        <InputNumber
          style={{ width: '100%' }}
          placeholder={String(fallback.intervalMs)}
          min={0}
          step={100}
          value={value.intervalMs}
          onChange={(v) => update('intervalMs', v)}
        />
      </Space.Compact>
    </>
  );
}
