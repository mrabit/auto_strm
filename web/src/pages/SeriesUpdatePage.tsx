import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, message, Popconfirm, Typography, Input } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { fetchSeriesUpdates, deleteSeriesUpdate } from '../api';
import type { SeriesUpdate } from '../types';

const { Link: AntLink } = Typography;

export default function SeriesUpdatePage() {
  const [data, setData] = useState<SeriesUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async (keyword?: string) => {
    setLoading(true);
    try {
      const items = await fetchSeriesUpdates(keyword);
      setData(items);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (value: string) => {
    loadData(value.trim() || undefined);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSeriesUpdate(id);
      message.success('删除成功');
      await loadData(search.trim() || undefined);
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'SERIES_ID',
      dataIndex: 'SERIES_ID',
      key: 'SERIES_ID',
      ellipsis: true,
    },
    {
      title: 'SEASON_ID',
      dataIndex: 'SEASON_ID',
      key: 'SEASON_ID',
      ellipsis: true,
    },
    {
      title: 'URL',
      dataIndex: 'URL',
      key: 'URL',
      ellipsis: true,
      render: (url: string) =>
        url ? (
          <AntLink href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </AntLink>
        ) : (
          '-'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: SeriesUpdate) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} disabled title="编辑" />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>剧集更新</h2>
        <Space>
          <Input.Search
            placeholder="搜索名称 / SERIES_ID / SEASON_ID"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => loadData(search.trim() || undefined)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} disabled>
            新增
          </Button>
        </Space>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
