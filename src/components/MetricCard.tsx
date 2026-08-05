interface Props { label: string; value: string; detail?: string; accent?: boolean }

export function MetricCard({ label, value, detail, accent }: Props) {
  return <div className={`metric-card${accent ? ' accent' : ''}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}
