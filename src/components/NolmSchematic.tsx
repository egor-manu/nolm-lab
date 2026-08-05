interface Props { kappa: number; attenuationDb: number; lengthM: number; reverse: boolean }

export function NolmSchematic({ kappa, attenuationDb, lengthM, reverse }: Props) {
  const length = lengthM < 1000 ? `${lengthM.toFixed(0)} m` : `${(lengthM / 1000).toFixed(2)} km`
  return (
    <section className="schematic panel" aria-label="Compact NOLM topology diagram">
      <div className="panel-heading"><span>NOLM topology</span><span className="tag">κ {(kappa * 100).toFixed(0)}%</span></div>
      <svg viewBox="0 0 420 178" role="img" aria-labelledby="schematic-title">
        <title id="schematic-title">Input and output connected through a two-by-two coupler to a fibre loop with a coupler-adjacent VOA</title>
        <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#63d6c4" /></marker></defs>
        <path className="port" d="M20 52 C58 52 66 75 100 75 M20 126 C58 126 67 103 100 103" />
        <rect className="coupler" x="100" y="68" width="62" height="42" rx="8" />
        <path className="fibre" d="M162 78 C205 26 338 30 366 76 C390 116 339 149 263 145 C205 142 178 118 162 101" />
        <rect className="voa" x={reverse ? 170 : 300} y={reverse ? 51 : 48} width="55" height="27" rx="5" />
        <path className="direction" d={reverse ? 'M326 132 C270 154 196 133 172 103' : 'M177 71 C218 34 275 31 318 49'} markerEnd="url(#arrow)" />
        <text x="19" y="43">E in</text><text x="19" y="145">E out · through</text>
        <text x="131" y="88" textAnchor="middle">2×2</text><text x="131" y="101" textAnchor="middle">coupler</text>
        <text x={reverse ? 198 : 328} y={reverse ? 69 : 66} textAnchor="middle">VOA</text>
        <text x="272" y="169" textAnchor="middle">loop length {length}</text>
        <text x="273" y="116" textAnchor="middle">nonlinear fibre</text>
        <text x="273" y="130" textAnchor="middle">{attenuationDb.toFixed(1)} dB VOA · {reverse ? 'CCW first' : 'CW first'}</text>
      </svg>
    </section>
  )
}
