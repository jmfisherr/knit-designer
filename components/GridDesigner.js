import { useState, useRef, useEffect } from 'react'

export default function GridDesigner() {
  // Infinite canvas: sparse grid as { "x,y": "#color" }
  const [grid, setGrid] = useState({})
  const [color, setColor] = useState('#000000')
  const [brush, setBrush] = useState(1)
  const [tool, setTool] = useState('brush') // 'brush' or 'eraser'
  const [projectId, setProjectId] = useState(null)
  const [projectName, setProjectName] = useState('Untitled')
  const [projects, setProjects] = useState([])
  
  // Viewport: pan and zoom
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [zoom, setZoom] = useState(20) // pixels per cell
  
  const isDrawing = useRef(false)
  const canvasRef = useRef(null)
  const panStart = useRef(null)

  // Load list of projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid background (vertical lines)
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5
    const startX = Math.floor(-offsetX / zoom)
    const endX = Math.ceil((canvas.width - offsetX) / zoom)
    for (let x = startX; x <= endX; x++) {
      const px = x * zoom + offsetX
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, canvas.height)
      ctx.stroke()
    }
    // Draw grid background (horizontal lines)
    const startY = Math.floor(-offsetY / zoom)
    const endY = Math.ceil((canvas.height - offsetY) / zoom)
    for (let y = startY; y <= endY; y++) {
      const py = y * zoom + offsetY
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(canvas.width, py)
      ctx.stroke()
    }

    // Draw filled cells
    Object.entries(grid).forEach(([key, cellColor]) => {
      const [x, y] = key.split(',').map(Number)
      const px = x * zoom + offsetX
      const py = y * zoom + offsetY
      ctx.fillStyle = cellColor
      ctx.fillRect(px, py, zoom - 1, zoom - 1)
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(px, py, zoom - 1, zoom - 1)
    })
  }, [grid, offsetX, offsetY, zoom])

  function applyBrush(x, y, col) {
    setGrid(prev => {
      const copy = { ...prev }
      for (let dy = 0; dy < brush; dy++) {
        for (let dx = 0; dx < brush; dx++) {
          const key = `${x + dx},${y + dy}`
          if (col === null) {
            delete copy[key]
          } else {
            copy[key] = col
          }
        }
      }
      return copy
    })
  }

  // Convert canvas pixel coords to grid coords
  function pixelToGrid(px, py) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (px - rect.left - offsetX) / zoom
    const y = (py - rect.top - offsetY) / zoom
    return [Math.floor(x), Math.floor(y)]
  }

  // Mouse/touch handlers
  function handleMouseDown(e) {
    if (e.button === 2) {
      // Right-click: pan
      panStart.current = { x: e.clientX, y: e.clientY, offsetX, offsetY }
      return
    }
    // Left-click: draw
    isDrawing.current = true
    const [x, y] = pixelToGrid(e.clientX, e.clientY)
    const col = tool === 'eraser' ? null : color
    applyBrush(x, y, col)
  }

  function handleMouseMove(e) {
    if (panStart.current) {
      // Panning
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setOffsetX(panStart.current.offsetX + dx)
      setOffsetY(panStart.current.offsetY + dy)
    } else if (isDrawing.current) {
      // Drawing
      const [x, y] = pixelToGrid(e.clientX, e.clientY)
      const col = tool === 'eraser' ? null : color
      applyBrush(x, y, col)
    }
  }

  function handleMouseUp() {
    isDrawing.current = false
    panStart.current = null
  }

  function handleContextMenu(e) {
    e.preventDefault()
  }

  function handleWheel(e) {
    e.preventDefault()
    const oldZoom = zoom
    const newZoom = Math.max(5, Math.min(100, zoom + (e.deltaY > 0 ? -2 : 2)))
    setZoom(newZoom)
  }

  // Center viewport on content
  function fitToContent() {
    if (Object.keys(grid).length === 0) return
    const coords = Object.keys(grid).map(k => k.split(',').map(Number))
    const xs = coords.map(([x]) => x)
    const ys = coords.map(([, y]) => y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const rect = canvasRef.current.getBoundingClientRect()
    setOffsetX(rect.width / 2 - centerX * zoom)
    setOffsetY(rect.height / 2 - centerY * zoom)
  }

  // Save/load: convert sparse grid to/from JSON
  async function saveProject() {
    const body = { grid, name: projectName }
    if (projectId) {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      alert('Updated: ' + json.id)
    } else {
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
    let gridData = data.grid || {}
    
    // If grid is in old 2D array format, convert to sparse format
    if (Array.isArray(gridData)) {
      const converted = {}
      gridData.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) converted[`${x},${y}`] = cell
        })
      })
      gridData = converted
    }
    
    setGrid(gridData)
    setProjectName(data.name)
    setProjectId(id)
    // Auto-fit loaded content
    setTimeout(fitToContent, 50)
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project?')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchProjects(); if (projectId === id) { setProjectId(null); setGrid({}); setProjectName('Untitled') } }
  }

  async function exportPDF() {
    const entries = Object.entries(grid)
    if (entries.length === 0) { alert('Nothing to export'); return }

    const coords = entries.map(([k]) => k.split(',').map(Number))
    const xs = coords.map(c => c[0])
    const ys = coords.map(c => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const cols = maxX - minX + 1
    const rows = maxY - minY + 1

    // A4 dimensions in mm
    const pageW = 210
    const pageH = 297
    const marginMM = 10
    const availW = pageW - marginMM * 2
    const availH = pageH - marginMM * 2

    // choose cell size in mm to fit page
    let cellMM = Math.min(availW / cols, availH / rows)
    if (cellMM < 1) cellMM = 1

    // render canvas with margins for numbering
    const pxPerMM = 96 / 25.4
    const cellPx = Math.ceil(cellMM * pxPerMM)
    const marginLeftPx = Math.ceil(cellPx * 0.9)
    const marginTopPx = Math.ceil(cellPx * 0.9)
    const canvasW = marginLeftPx + cols * cellPx
    const canvasH = marginTopPx + rows * cellPx

    const c = document.createElement('canvas')
    c.width = canvasW
    c.height = canvasH
    const ctx = c.getContext('2d')

    // background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvasW, canvasH)

    // grid lines
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 1
    for (let x = 0; x <= cols; x++) {
      const px = marginLeftPx + x * cellPx
      ctx.beginPath()
      ctx.moveTo(px, marginTopPx)
      ctx.lineTo(px, marginTopPx + rows * cellPx)
      ctx.stroke()
    }
    for (let y = 0; y <= rows; y++) {
      const py = marginTopPx + y * cellPx
      ctx.beginPath()
      ctx.moveTo(marginLeftPx, py)
      ctx.lineTo(marginLeftPx + cols * cellPx, py)
      ctx.stroke()
    }

    // numbering (1..n)
    ctx.fillStyle = '#000'
    const fontSize = Math.max(10, Math.floor(cellPx * 0.4))
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let x = 0; x < cols; x++) {
      ctx.fillText(String(x + 1), marginLeftPx + x * cellPx + cellPx / 2, marginTopPx / 2)
    }
    ctx.textAlign = 'right'
    for (let y = 0; y < rows; y++) {
      ctx.fillText(String(y + 1), marginLeftPx / 2, marginTopPx + y * cellPx + cellPx / 2)
    }

    // draw cells
    entries.forEach(([k, colVal]) => {
      const [x, y] = k.split(',').map(Number)
      const rx = marginLeftPx + (x - minX) * cellPx
      const ry = marginTopPx + (y - minY) * cellPx
      ctx.fillStyle = colVal
      ctx.fillRect(rx + 1, ry + 1, cellPx - 2, cellPx - 2)
    })

    const imgData = c.toDataURL('image/jpeg', 1.0)
    const { jsPDF } = await import('jspdf')
    const imgWmm = (canvasW / pxPerMM)
    const imgHmm = (canvasH / pxPerMM)
    const orientation = imgWmm > imgHmm ? 'landscape' : 'portrait'
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation })
    const x = (pageW - imgWmm) / 2
    const y = (pageH - imgHmm) / 2
    doc.addImage(imgData, 'JPEG', x, y, imgWmm, imgHmm)
    doc.save(`${(projectName || 'untitled').replace(/\s+/g, '_')}.pdf`)
  }

  function clearGrid() {
    setProjectId(null)
    setProjectName('Untitled')
    setGrid({})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="toolbar">
        <input type="text" placeholder="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} />
        <label>Brush: <input type="number" value={brush} onChange={e => setBrush(Number(e.target.value))} min={1} max={8} /></label>
        <label>Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setTool('brush')}
            style={{ background: tool === 'brush' ? '#0056b3' : '#007bff', color: 'white', padding: '6px 8px', borderRadius: 4 }}
          >Brush</button>
          <button
            onClick={() => setTool('eraser')}
            style={{ background: tool === 'eraser' ? '#d9534f' : '#ff6b6b', color: 'white', padding: '6px 8px', borderRadius: 4 }}
          >Eraser</button>
        </div>
        <label>Zoom: <input type="range" value={zoom} onChange={e => setZoom(Number(e.target.value))} min={5} max={100} style={{ width: '100px' }} /></label>
        <span>{zoom}px/cell</span>
        <button onClick={fitToContent}>Fit to Content</button>
        <button onClick={clearGrid}>New</button>
        <button onClick={saveProject}>{projectId ? 'Update' : 'Save'}</button>
        <button onClick={() => exportPDF()}>{'Export PDF'}</button>
      </div>

      {projects.length > 0 && (
        <div className="projects-list">
          <h3>Projects</h3>
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

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        style={{ flex: 1, background: '#f5f5f5', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
      />
    </div>
  )
}
