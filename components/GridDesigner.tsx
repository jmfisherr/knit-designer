import React, { useEffect, useRef, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Grid = Record<string, string>

export default function GridDesigner(): JSX.Element {
  const [grid, setGrid] = useState<Grid>({})
  const [color, setColor] = useState('#000000')
  const [brush, setBrush] = useState(1)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('Untitled')
  const [projects, setProjects] = useState<Array<{ id: string; name?: string }>>([])

  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [zoom, setZoom] = useState(20)

  const isDrawing = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const panStart = useRef<any>(null)

  const { data: session } = useSession()

  useEffect(() => { fetchProjects() }, [session])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) {
        console.error('Failed to fetch projects', await res.text())
        setProjects([])
        return
      }
      const json = await res.json()
      setProjects(json)
    } catch (err) {
      console.error('Error fetching projects', err)
      setProjects([])
    }
  }

  function formatProjectDisplayName(id: string, name?: string) {
    if (name && name !== id) return name
    if (!id) return 'untitled'
    const parts = String(id).split('-')
    if (parts.length <= 1) return id
    const slug = parts.slice(1).join('-')
    const decoded = slug.replace(/_/g, ' ').trim()
    return decoded.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : w).join(' ')
  }

  // Keyboard shortcuts: B = brush, E = eraser, [ = decrease brush, ] = increase brush
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'b' || e.key === 'B') setTool('brush')
      else if (e.key === 'e' || e.key === 'E') setTool('eraser')
      else if (e.key === '[') setBrush(b => Math.max(1, b - 1))
      else if (e.key === ']') setBrush(b => Math.min(64, b + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // grid lines
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
    const startY = Math.floor(-offsetY / zoom)
    const endY = Math.ceil((canvas.height - offsetY) / zoom)
    for (let y = startY; y <= endY; y++) {
      const py = y * zoom + offsetY
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(canvas.width, py)
      ctx.stroke()
    }

    // filled cells
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

    // hover preview
    if (hoverCell) {
      const [hx, hy] = hoverCell
      for (let dy = 0; dy < brush; dy++) {
        for (let dx = 0; dx < brush; dx++) {
          const x = hx + dx
          const y = hy + dy
          const px = x * zoom + offsetX
          const py = y * zoom + offsetY
          if (tool === 'eraser') {
            ctx.fillStyle = 'rgba(255,255,255,0.6)'
            ctx.fillRect(px + 0.5, py + 0.5, zoom - 1, zoom - 1)
            ctx.strokeStyle = 'rgba(220,0,0,0.9)'
            ctx.lineWidth = 1
            ctx.strokeRect(px + 0.5, py + 0.5, zoom - 1, zoom - 1)
          } else {
            ctx.fillStyle = `${color}`
            ctx.globalAlpha = 0.45
            ctx.fillRect(px + 0.5, py + 0.5, zoom - 1, zoom - 1)
            ctx.globalAlpha = 1
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'
            ctx.lineWidth = 0.8
            ctx.strokeRect(px + 0.5, py + 0.5, zoom - 1, zoom - 1)
          }
        }
      }
    }
  }, [grid, offsetX, offsetY, zoom, hoverCell, tool, color, brush])

  // window mouseup/touchend to clear drawing state
  useEffect(() => {
    function onWindowUp() {
      isDrawing.current = false
      panStart.current = null
      setHoverCell(null)
    }
    window.addEventListener('mouseup', onWindowUp)
    window.addEventListener('touchend', onWindowUp)
    return () => {
      window.removeEventListener('mouseup', onWindowUp)
      window.removeEventListener('touchend', onWindowUp)
    }
  }, [])

  function applyBrush(x: number, y: number, col: string | null) {
    setGrid(prev => {
      const copy = { ...prev }
      for (let dy = 0; dy < brush; dy++) {
        for (let dx = 0; dx < brush; dx++) {
          const key = `${x + dx},${y + dy}`
          if (col === null) delete copy[key]
          else copy[key] = col
        }
      }
      return copy
    })
  }

  function pixelToGrid(px: number, py: number) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (px - rect.left - offsetX) / zoom
    const y = (py - rect.top - offsetY) / zoom
    return [Math.floor(x), Math.floor(y)] as const
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const isTouch = (e as React.TouchEvent).touches !== undefined
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY
    const button = isTouch ? 0 : (e as React.MouseEvent).button
    if (button === 2) {
      panStart.current = { x: clientX, y: clientY, offsetX, offsetY }
      return
    }
    isDrawing.current = true
    const [x, y] = pixelToGrid(clientX, clientY)
    const col = tool === 'eraser' ? null : color
    applyBrush(x, y, col)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const isTouch = (e as React.TouchEvent).touches !== undefined
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY
    if (panStart.current) {
      const dx = clientX - panStart.current.x
      const dy = clientY - panStart.current.y
      setOffsetX(panStart.current.offsetX + dx)
      setOffsetY(panStart.current.offsetY + dy)
    } else if (isDrawing.current) {
      const [x, y] = pixelToGrid(clientX, clientY)
      const col = tool === 'eraser' ? null : color
      applyBrush(x, y, col)
      setHoverCell([x, y])
    } else {
      const [hx, hy] = pixelToGrid(clientX, clientY)
      setHoverCell([hx, hy])
    }
  }

  function handleMouseUp() {
    isDrawing.current = false
    panStart.current = null
    setHoverCell(null)
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const newZoom = Math.max(5, Math.min(200, zoom + (e.deltaY > 0 ? -2 : 2)))
    setZoom(newZoom)
  }

  function fitToContent() {
    const keys = Object.keys(grid)
    if (keys.length === 0) return
    const coords = keys.map(k => k.split(',').map(Number))
    const xs = coords.map(([x]) => x)
    const ys = coords.map(([, y]) => y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const rect = canvasRef.current!.getBoundingClientRect()
    setOffsetX(rect.width / 2 - centerX * zoom)
    setOffsetY(rect.height / 2 - centerY * zoom)
  }

  async function saveProject() {
    const body = { grid, name: projectName }
    if (!session) {
      if (confirm('Sign in to save this project to your account?')) signIn()
      return
    }
    if (projectId) {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (res.status === 401) { alert('Please sign in to update this project'); signIn(); return }
      if (json && json.id && json.id !== projectId) setProjectId(json.id)
      alert('Updated: ' + (json && json.id ? json.id : projectId))
    } else {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.status === 401) { alert('Please sign in to save projects'); signIn(); return }
      const json = await res.json()
      setProjectId(json.id)
      alert('Saved: ' + json.id)
    }
    fetchProjects()
  }

  async function loadProject(id: string) {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { alert('Failed to load'); return }
    const data = await res.json()
    let gridData: any = data.grid || {}
    if (Array.isArray(gridData)) {
      const converted: Grid = {}
      gridData.forEach((row: any[], y: number) => row.forEach((cell, x) => { if (cell) converted[`${x},${y}`] = cell }))
      gridData = converted
    }
    setGrid(gridData)
    setProjectName(data.name || 'Untitled')
    setProjectId(id)
    setTimeout(fitToContent, 50)
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project?')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.status === 401) { alert('Please sign in to delete projects'); signIn(); return }
    if (res.ok) { fetchProjects(); if (projectId === id) { setProjectId(null); setGrid({}); setProjectName('Untitled') } }
  }

  async function exportPDF() {
    const entries = Object.entries(grid)
    if (entries.length === 0) { alert('Nothing to export'); return }
    // Keep simple: reuse existing logic from JS version (omitted here for brevity)
    alert('Export PDF: not yet implemented in TSX (coming soon)')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="toolbar">
        <input type="text" placeholder="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} />
        <label>Brush: <input type="number" value={brush} onChange={e => setBrush(Number(e.target.value))} min={1} max={8} /></label>
        <label>Color: <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setTool('brush')} style={{ background: tool === 'brush' ? '#0056b3' : '#007bff', color: 'white', padding: '6px 8px', borderRadius: 4 }}>Brush</button>
          <button onClick={() => setTool('eraser')} style={{ background: tool === 'eraser' ? '#d9534f' : '#ff6b6b', color: 'white', padding: '6px 8px', borderRadius: 4 }}>Eraser</button>
        </div>
        <label>Zoom: <input type="range" value={zoom} onChange={e => setZoom(Number(e.target.value))} min={5} max={100} style={{ width: '100px' }} /></label>
        <span>{zoom}px/cell</span>
        <button onClick={() => { /* fitToContent placeholder */ }}>Fit to Content</button>
        <button onClick={() => { setProjectId(null); setProjectName('Untitled'); setGrid({}) }}>New</button>
        <button onClick={() => { /* saveProject placeholder */ }}>{projectId ? 'Update' : 'Save'}</button>
        <button onClick={() => { /* exportPDF placeholder */ }}>{'Export PDF'}</button>
        <div style={{ marginLeft: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          {session ? (
            <>
              <span style={{ fontSize: 12, color: '#333' }}>Signed in as {String(session?.user?.email ?? '')}</span>
              <button onClick={() => signOut()} style={{ padding: '6px 8px' }}>Sign out</button>
            </>
          ) : (
            <button onClick={() => signIn()} style={{ padding: '6px 8px' }}>Sign in</button>
          )}
        </div>
      </div>

      {projects.length > 0 && (
        <div className="projects-list">
          <h3>Projects</h3>
          <ul>
            {projects.map(p => (
              <li key={p.id}>
                <button onClick={() => {/* loadProject placeholder */ }}>{formatProjectDisplayName(p.id, p.name)}</button>
                <button onClick={() => {/* deleteProject placeholder */ }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <canvas ref={canvasRef} style={{ flex: 1, background: '#f5f5f5', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }} />
    </div>
  )
}
