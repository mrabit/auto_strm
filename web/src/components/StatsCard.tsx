import React from 'react';

interface Props {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
}

const StatsCard = React.memo(function StatsCard({ title, value, icon, gradient }: Props) {
  return (
    <div
      style={{
        background: gradient,
        borderRadius: 12,
        padding: '20px 24px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minWidth: 0,
      }}
    >
      <div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      </div>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
    </div>
  );
});

export default StatsCard;
