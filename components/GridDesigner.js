import { useState, useRef, useEffect } from 'react'

function createEmptyGrid(cols, rows) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))
}

export default function GridDesigner() {
  const [cols, setCols] = useState(24)
  const [rows, setRows] = useState(24)
  const [grid, setGrid] = useState(() => createEmptyGrid(24, 24))
  const [color, setColor] = useState('#000000')
  const [brush, setBrush] = useState(1)
  const isDrawing = useRef(false)

  useEffect(() => {
    setGrid(createEmptyGrid(cols, rows))
  }, [cols, rows])

  function applyBrush(x, y, col) {
    setGrid(prev => {
      const copy = prev.map(r => r.slice())
      for (let dy = 0; dy < brush; dy++) {
        for (let dx = 0; dx < brush; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) copy[ny][nx] = col
        }
      }
      return copy
    })
  }

  function handleMouseDown(e, x, y) {
    isDrawing.current = true
    applyBrush(x, y, color)
  }
  function handleMouseEnter(e, x, y) {
    if (!isDrawing.current) return
    applyBrush(x, y, color)
  }
  function handleMouseUp() {
    isDrawing.current = false
  }

  // Basic save to local API
  async function saveProject() {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols, rows, grid, name: 'untitled' })
    })
    const json = await res.json()
    alert('Saved: ' + json.id)
  }

  function clearGrid() {
    setGrid(createEmptyGrid(cols, rows))
  }

  return (
    <div onMouseUp={handleMouseUp}>
      <div className="toolbar">
        <label>Cols: <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} min={1} max={64} /></label>
        <label>Rows: <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} min={1} max={64} /></label>
        <label>Brush: <input type="number" value={brush} onChange={e => setBrush(Number(e.target.value))} min={1} max={8} /></label>
        <label>Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
        <button onClick={clearGrid}>New</button>
        <button onClick={saveProject}>Save</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 20px)` }}>
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className="cell"
              onMouseDown={e => handleMouseDown(e, x, y)}
              onMouseEnter={e => handleMouseEnter(e, x, y)}
              style={{ background: cell || 'transparent' }}
            />
          ))
        )}
      </div>
    </div>
  )
}
