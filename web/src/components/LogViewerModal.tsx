import { useState, useEffect, useRef } from 'react';
import { Modal } from 'antd';
import { fetchLogs } from '../api';
import type { LogEntry } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

function ansiToHtml(text: string): string {
  let result = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Simple one-pass replacement: each ANSI code maps to a span tag.
  // \x1b[0m always closes the current span (no nesting in our log output).
  const map: [string, string][] = [
    ['\x1b[1m', '<span style="font-weight:bold">'],
    ['\x1b[2m', '<span style="opacity:0.5">'],
    ['\x1b[31m', '<span style="color:#ff4d4f">'],
    ['\x1b[32m', '<span style="color:#52c41a">'],
    ['\x1b[33m', '<span style="color:#faad14">'],
    ['\x1b[36m', '<span style="color:#36cfc9">'],
    ['\x1b[0m', '</span>'],
  ];

  for (const [code, html] of map) {
    result = result.split(code).join(html);
  }

  return result;
}

export default function LogViewerModal({ open, onClose }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const load = async () => {
      try {
        setLogs(await fetchLogs());
      } catch {
        // silent — avoid noise if server restarts
      }
    };

    load();
    timerRef.current = setInterval(load, 2000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);

  return (
    <Modal
      title="Logs"
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
    >
      <div
        style={{
          background: '#1a1a2e',
          color: '#e0e0e0',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 13,
          lineHeight: '18px',
          padding: 12,
          borderRadius: 6,
          maxHeight: '60vh',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: '#666' }}>No logs yet</span>
        ) : (
          [...logs].reverse().map((entry) => (
            <div key={entry.timestamp + entry.message.slice(0, 20)}>
              <span style={{ color: '#666', marginRight: 8 }}>{entry.timestamp}</span>
              <span dangerouslySetInnerHTML={{ __html: ansiToHtml(entry.message) }} />
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
