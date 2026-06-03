import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button, Radio, Input, Space, Switch } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { subscribeLogs } from '../api';
import { ansiToHtml } from '../utils/ansiToHtml';
import type { LogEntry } from '../types';

const MAX_LOGS = 5000;

const LEVEL_COLORS: Record<string, string> = {
  error: '#ff4d4f',
  warn: '#faad14',
  info: '#e0e0e0',
};

export default function LogViewerPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const unsubRef = useRef<(() => void) | null>(null);

  // SSE subscription — endpoint replays history on connect
  useEffect(() => {
    if (!autoRefresh) {
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }
    unsubRef.current = subscribeLogs((entry) => {
      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    });
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [autoRefresh]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (levelFilter !== 'all') {
      result = result.filter((log) => log.level === levelFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((log) => log.message.toLowerCase().includes(q));
    }
    return [...result].reverse();
  }, [logs, levelFilter, searchQuery]);

  const handleExport = useCallback(() => {
    const text = logs.map((e) => `${e.timestamp} ${e.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>日志查看</h2>
        <Space>
          <Switch
            checked={autoRefresh}
            onChange={setAutoRefresh}
            checkedChildren="自动"
            unCheckedChildren="手动"
          />
          <Button onClick={() => setLogs([])}>清空</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Radio.Group value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="error">错误</Radio.Button>
          <Radio.Button value="warn">警告</Radio.Button>
          <Radio.Button value="info">信息</Radio.Button>
        </Radio.Group>
        <Input.Search
          placeholder="搜索日志..."
          onSearch={setSearchQuery}
          allowClear
          style={{ width: 260 }}
        />
      </Space>

      <div
        style={{
          background: '#1a1a2e',
          color: '#e0e0e0',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 13,
          lineHeight: '18px',
          padding: 12,
          borderRadius: 6,
          maxHeight: 'calc(100vh - 260px)',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {filteredLogs.length === 0 ? (
          <span style={{ color: '#666' }}>暂无日志</span>
        ) : (
          filteredLogs.map((entry, i) => (
            <div key={`${entry.timestamp}-${i}`}>
              <span style={{ color: '#666', marginRight: 8 }}>{entry.timestamp}</span>
              <span
                style={{ color: LEVEL_COLORS[entry.level] || '#e0e0e0' }}
                dangerouslySetInnerHTML={{ __html: ansiToHtml(entry.message) }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
