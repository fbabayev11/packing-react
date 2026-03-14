import { useState, useEffect, useMemo } from 'react'
import { API } from '../config'
import OrderCard from '../components/OrderCard'
import ManualOrderCard from '../components/ManualOrderCard'
import Calendar from '../components/Calendar'
import StockFilter from '../components/StockFilter'
import SortMenu from '../components/SortMenu'

const MANUAL_KEY = 'manual_orders_v1'
function loadManual() {
  try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]') } catch { return [] }
}

export default function OrdersPage() {
  const [orders, setOrders]       = useState([])
  const [manualOrders, setManualOrders] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [lastRef, setLastRef]   = useState('')
  const [q, setQ]               = useState('')
  const [selDate, setSelDate]   = useState(null)
  const [noteOnly, setNoteOnly] = useState(false)
  const [sortMode, setSortMode] = useState('date-desc')
  const [excluded, setExcluded] = useState([])

  function loadManualOrders() {
    setManualOrders(loadManual().filter(o => !o.archived))
  }

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/orders`)
      if (!r.ok) { setError('Sifarişlər yüklənmədi'); return }
      setOrders(await r.json())
      setLastRef(new Date().toLocaleTimeString('az-AZ'))
    } catch { setError('Backend cavab vermir') }
    setLoading(false)
  }

  useEffect(() => { load(); loadManualOrders() }, [])
  useEffect(() => {
    const id = setInterval(load, 120000)
    return () => clearInterval(id)
  }, [])

  async function archive(id, name, e) {
    e.stopPropagation()
    const card = document.getElementById(`card-${id}`)
    if (card) card.classList.add('fulfilling')
    try {
      await fetch(`${API}/fulfill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: id, order_name: name })
      })
      setTimeout(() => setOrders(prev => prev.filter(o => o.id !== id)), 360)
    } catch { alert('Backend cavab vermir') }
  }

  const productNames = useMemo(() => {
    const s = new Set()
    orders.forEach(o => o.items.forEach(i => {
      if (i.is_custom_box) (i.box_contents||[]).forEach(c => { if(c.name) s.add(c.name) })
      else if (i.name) s.add(i.name)
    }))
    return [...s].sort()
  }, [orders])

  const orderDays = useMemo(() => orders.map(o => o.created_at), [orders])

  const filtered = useMemo(() => {
    let list = orders.filter(o => {
      if (selDate && o.created_at !== selDate) return false
      if (noteOnly && !o.note) return false
      if (q) {
        const ql = q.toLowerCase()
        const match = o.name.toLowerCase().includes(ql) ||
          (o.customer||'').toLowerCase().includes(ql) ||
          o.items.some(i => i.name.toLowerCase().includes(ql)) ||
          o.items.some(i => (i.box_contents||[]).some(c => c.name.toLowerCase().includes(ql)))
        if (!match) return false
      }
      if (excluded.length) {
        const names = []
        o.items.forEach(i => {
          if (i.is_custom_box) (i.box_contents||[]).forEach(c => names.push(c.name.toLowerCase()))
          else names.push(i.name.toLowerCase())
        })
        if (excluded.some(ex => names.some(n => n.includes(ex.toLowerCase())))) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      if (sortMode==='date-desc') return b.created_at.localeCompare(a.created_at)||b.id-a.id
      if (sortMode==='date-asc')  return a.created_at.localeCompare(b.created_at)||a.id-b.id
      if (sortMode==='qty-asc')   return a.total_items-b.total_items
      if (sortMode==='qty-desc')  return b.total_items-a.total_items
      if (sortMode==='name-asc')  return (a.customer||a.name).localeCompare(b.customer||b.name)
      if (sortMode==='name-desc') return (b.customer||b.name).localeCompare(a.customer||a.name)
      return 0
    })
  }, [orders, q, selDate, noteOnly, excluded, sortMode])

  return (
    <>
      <div className="refresh-row">
        <h2>Göndərilməli Sifarişlər</h2>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="last-refresh">{lastRef}</span>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Yenilə</button>
        </div>
      </div>

      <div className="filter-row">
        <div className="search-wrap">
          <span className="s-ico">🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Sifariş no və ya ad axtar..." />
          {q && <button className="clear-btn" onClick={()=>setQ('')}>✕</button>}
        </div>
        <Calendar selDate={selDate} onSelect={setSelDate} orderDays={orderDays} />
        <button className={`flt-btn${noteOnly?' on':''}`} onClick={()=>setNoteOnly(n=>!n)}>
          📝 Yalnız qeydlilər
        </button>
        <StockFilter excluded={excluded} onChange={setExcluded} productNames={productNames} />
        <SortMenu value={sortMode} onChange={setSortMode} />
      </div>

      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /><div>Sifarişlər yüklənir...</div></div>
      ) : !filtered.length ? (
        <div className="empty">
          <div className="empty-icon">{selDate||noteOnly||q||excluded.length ? '🔍' : '✅'}</div>
          <h3>{selDate ? `${selDate} tarixli sifariş tapılmadı`
              : noteOnly ? 'Qeydli sifariş yoxdur'
              : q ? `"${q}" tapılmadı`
              : excluded.length ? 'Bu məhsulları içərməyən sifariş yoxdur'
              : 'Göndərilməli sifariş yoxdur ✅'}</h3>
        </div>
      ) : (
        <div className="orders-grid">
          {filtered.map(o => <OrderCard key={o.id} order={o} onArchive={archive} />)}
          {manualOrders.length > 0 && (
            <>
              <div style={{display:'flex',alignItems:'center',gap:10,margin:'6px 0 2px'}}>
                <div style={{flex:1,height:1,background:'var(--border)'}}/>
                <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',whiteSpace:'nowrap'}}>
                  💬 WhatsApp ({manualOrders.length})
                </span>
                <div style={{flex:1,height:1,background:'var(--border)'}}/>
              </div>
              {manualOrders.map(o => (
                <ManualOrderCard key={o.id} order={o} onRefresh={loadManualOrders} />
              ))}
            </>
          )}
        </div>
      )}
    </>
  )
}
