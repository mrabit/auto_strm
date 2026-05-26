import { useState, useEffect } from 'react';
import { Modal, Tabs, Input, Switch, Space } from 'antd';
import Addon from './Addon';
import RemoteFieldsEditor from './RemoteFieldsEditor';
import RateLimitFields from './RateLimitFields';
import JellyfinFields from './JellyfinFields';
import { cleanJellyfin } from './cleanJellyfin';
import type { ConfigFile, RawTaskConfig } from '../types';

interface Props {
  open: boolean;
  task: RawTaskConfig | null;
  index: number | null;
  defaults: {
    remote?: ConfigFile['remote'];
    cron?: string;
    rateLimit?: ConfigFile['rateLimit'];
    jellyfin?: ConfigFile['jellyfin'];
    metaExts?: string;
    videoExts?: string;
  };
  isNew: boolean;
  onSave: (task: RawTaskConfig) => void;
  onCancel: () => void;
}

export default function TaskEditModal({ open, task, defaults, isNew, onSave, onCancel }: Props) {
  const [localTask, setLocalTask] = useState<RawTaskConfig>(
    task || { name: '', remote: {}, local: { path: '' } },
  );
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (open && task) {
      setLocalTask({ ...task });
      setActiveTab('basic');
    }
  }, [open, task]);

  function updateLocal(patch: Partial<RawTaskConfig>) {
    setLocalTask((prev) => ({ ...prev, ...patch }));
  }

  function handleOk() {
    onSave(localTask);
  }

  return (
    <Modal
      title={isNew ? '新建任务' : `编辑: ${localTask.name || '未命名'}`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={640}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="基本设置" key="basic">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input
              placeholder="任务名称"
              value={localTask.name}
              onChange={(e) => updateLocal({ name: e.target.value })}
            />
            <Input
              placeholder="本地路径 (如 ./data/movies)"
              value={localTask.local?.path}
              onChange={(e) => updateLocal({ local: { path: e.target.value } })}
            />
            <RemoteFieldsEditor
              value={localTask.remote}
              defaults={defaults.remote}
              onChange={(remote) => updateLocal({ remote })}
            />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="高级设置" key="advanced">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Addon label="Cron" />
              <Input
                placeholder={defaults.cron || '0 */6 * * *'}
                value={localTask.cron}
                onChange={(e) => updateLocal({ cron: e.target.value || undefined })}
              />
            </Space.Compact>
            <div>
              <div style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>并发控制</div>
              <RateLimitFields
                value={localTask.rateLimit}
                inherited={defaults.rateLimit}
                onChange={(rateLimit) => updateLocal({ rateLimit })}
              />
            </div>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <Addon label="Video Exts" />
              <Input
                placeholder={defaults.videoExts || '(inherits global)'}
                value={localTask.videoExts}
                onChange={(e) => updateLocal({ videoExts: e.target.value || undefined })}
              />
            </Space.Compact>
            <Space.Compact style={{ width: '100%' }}>
              <Addon label="Meta Exts" />
              <Input
                placeholder={defaults.metaExts || '(inherits global)'}
                value={localTask.metaExts}
                onChange={(e) => updateLocal({ metaExts: e.target.value || undefined })}
              />
            </Space.Compact>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888', fontSize: 12 }}>同步元数据</span>
              <Switch
                checked={localTask.remote?.syncMetadata !== false}
                checkedChildren="是"
                unCheckedChildren="否"
                onChange={(checked) =>
                  updateLocal({ remote: { ...localTask.remote, syncMetadata: checked } })
                }
              />
            </div>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Jellyfin" key="jellyfin">
          <JellyfinFields
            value={localTask.jellyfin || {}}
            inherited={defaults.jellyfin}
            onChange={(jellyfin) => updateLocal({ jellyfin: cleanJellyfin(jellyfin) })}
          />
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
}
