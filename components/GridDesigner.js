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
  const [projectId, setProjectId] = useState(null)
  const [projectName, setProjectName] = useState('Untitled')
  const [projects, setProjects] = useState([])
  const isDrawing = useRef(false)

  useEffect(() => {
    setGrid(createEmptyGrid(cols, rows))
  }, [cols, rows])

  // Load list of projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

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
    const body = { cols, rows, grid, name: projectName }
    if (projectId) {
      // Update existing
      const res = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      alert('Updated: ' + json.id)
    } else {
      // Create new
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      setProjectId(json.id)
      alert('Saved: ' + json.id)
    }
    fetchProjects()
  }

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    const json = await res.json()
    setProjects(json)
  }

  async function loadProject(id) {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { alert('Failed to load'); return }
    const data = await res.json()
    setCols(data.cols)
    setRows(data.rows)
    setGrid(data.grid)
    setProjectName(data.name)
    setProjectId(id)
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project?')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchProjects(); if (projectId === id) { setProjectId(null); clearGrid() } }
  }

  function clearGrid() {
    setProjectId(null)
    setProjectName('Untitled')
    setGrid(createEmptyGrid(cols, rows))
  }

  return (
    <div onMouseUp={handleMouseUp}>
      <div className="toolbar">
        <input type="text" placeholder="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} />
        <label>Cols: <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} min={1} max={64} /></label>
        <label>Rows: <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} min={1} max={64} /></label>
        <label>Brush: <input type="number" value={brush} onChange={e => setBrush(Number(e.target.value))} min={1} max={8} /></label>
        <label>Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
        <button onClick={clearGrid}>New</button>
        <button onClick={saveProject}>{projectId ? 'Update' : 'Save'}</button>
      </div>

      {projects.length > 0 && (
        <div className="projects-list">
          <h3>Recent Projects</h3>
          <ul>
            {projects.map(p => (
              <li key={p.id}>
                <button onClick={() => loadProject(p.id)}>{p.name || p.id}</button>
                <button onClick={() => deleteProject(p.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
