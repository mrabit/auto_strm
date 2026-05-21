interface Props {
  label: string;
}

export default function Addon({ label }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 11px',
        background: '#fafafa',
        border: '1px solid #d9d9d9',
        borderRight: 0,
        borderRadius: '6px 0 0 6px',
        whiteSpace: 'nowrap',
        color: '#666',
        fontSize: 14,
      }}
    >
      {label}
    </span>
  );
}
