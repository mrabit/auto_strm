import React, { useMemo } from 'react';
import {
  UnorderedListOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import StatsCard from './StatsCard';
import useResponsive from '../hooks/useResponsive';

interface Stats {
  total: number;
  enabled: number;
  disabled: number;
}

interface Props {
  stats: Stats;
}

const StatsDashboard = React.memo(function StatsDashboard({ stats }: Props) {
  const { isMobile } = useResponsive();

  const items = useMemo(
    () => [
      { title: '任务总数', value: stats.total, icon: <UnorderedListOutlined />, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { title: '已启用', value: stats.enabled, icon: <CheckCircleOutlined />, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
      { title: '已禁用', value: stats.disabled, icon: <CloseCircleOutlined />, gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    ],
    [stats],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}
    >
      {items.map((item) => (
        <StatsCard key={item.title} {...item} />
      ))}
    </div>
  );
});

export default StatsDashboard;
