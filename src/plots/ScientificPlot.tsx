import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import type { Data, Layout } from 'plotly.js'

const Plot = createPlotlyComponent(Plotly)

interface ScientificPlotProps {
  data: Data[]
  title: string
  xTitle: string
  yTitle: string
  height?: number
}

export function ScientificPlot({ data, title, xTitle, yTitle, height = 340 }: ScientificPlotProps) {
  const layout: Partial<Layout> = {
    title: { text: title, font: { size: 15, color: '#dce8f2' }, x: 0.03 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(5,14,22,.45)',
    font: { color: '#9eb1c1', family: 'Inter, system-ui, sans-serif', size: 11 },
    xaxis: { title: { text: xTitle }, gridcolor: '#253746', zerolinecolor: '#405363' },
    yaxis: { title: { text: yTitle }, gridcolor: '#253746', zerolinecolor: '#405363' },
    margin: { l: 62, r: 20, t: 48, b: 55 },
    legend: { orientation: 'h', y: 1.12, x: 1, xanchor: 'right' },
    hovermode: 'x unified',
  }
  return <Plot data={data} layout={layout} style={{ width: '100%', height }} useResizeHandler config={{ responsive: true, displaylogo: false, toImageButtonOptions: { format: 'svg', filename: title.toLowerCase().replaceAll(' ', '-') } }} />
}
