import React from 'react';
import { Button, Space, Tag, Popconfirm, Tooltip } from 'antd';
import { SyncOutlined, EditOutlined, DeleteOutlined, FolderOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import useResponsive from '../hooks/useResponsive';
import type { RawTaskConfig } from '../types';

interface Props {
  task: RawTaskConfig;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onSync: () => void;
  syncing: boolean;
  lastSyncTime?: Date;
}

const TaskListItem = React.memo(function TaskListItem({
  task,
  index,
  onEdit,
  onDelete,
  onToggleEnabled,
  onSync,
  syncing,
  lastSyncTime,
}: Props) {
  const { isMobile } = useResponsive();
  const enabled = task.enabled !== false;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 10,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 10 : 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: enabled
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : 'linear-gradient(135deg, #a8edea, #fed6e3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          <FolderOutlined />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{task.name || `Task ${index + 1}`}</div>
          <div
            style={{
              color: '#888',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.remote?.path || 'No remote path'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}
      >
        {lastSyncTime && (
          <span style={{ color: '#999', fontSize: 12 }}>
            {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '已启用' : '已禁用'}</Tag>
        <Tooltip title={enabled ? '禁用任务' : '启用任务'}>
          <Button
            size="small"
            type={enabled ? 'default' : 'primary'}
            icon={enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => onToggleEnabled(!enabled)}
          />
        </Tooltip>
        <Space size={4}>
          <Button size="small" icon={<SyncOutlined />} loading={syncing} onClick={onSync} />
          <Button size="small" icon={<EditOutlined />} onClick={onEdit} />
          <Popconfirm title="确认删除？" onConfirm={onDelete} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>
    </div>
  );
});

export default TaskListItem;
