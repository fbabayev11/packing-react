import { useState, useEffect, useMemo } from 'react'
import { API, FLAG } from '../config'

const STATUS_LABEL = {
  paid:           { label:'Ödənilib',     color:'#4ade80', bg:'rgba(74,222,128,.1)',  border:'rgba(74,222,128,.25)' },
  pending:        { label:'Gözlənilir',   color:'#f5a623', bg:'rgba(245,166,35,.1)',  border:'rgba(245,166,35,.25)' },
  refunded:       { label:'Geri qaytarıldı', color:'#f87171', bg:'rgba(248,113,113,.1)', border:'rgba(248,113,113,.25)' },
  partially_refunded: { label:'Qismən geri', color:'#f87171', bg:'rgba(248,113,113,.1)', border:'rgba(248,113,113,.25)' },
  voided:         { label:'Ləğv edildi',  color:'#666',    bg:'rgba(102,102,102,.1)', border:'rgba(102,102,102,.25)' },
}
const FULFILL_LABEL = {
  fulfilled:      { label:'Göndərildi',   color:'#4ade80', bg:'rgba(74,222,128,.1)',  border:'rgba(74,222,128,.25)' },
  unfulfilled:    { label:'Göndərilmədi', color:'#f5a623', bg:'rgba(245,166,35,.1)',  border:'rgba(245,166,35,.25)' },
  partial:        { label:'Qismən',       color:'#38bdf8', bg:'rgba(56,189,248,.1)',  border:'rgba(56,189,248,.25)' },
  restocked:      { label:'Geri qoyuldu', color:'#666',    bg:'rgba(102,102,102,.1)', border:'rgba(102,102,102,.25)' },
}

function Badge({ map, val }) {
  const s = map[val] || { label: val, color:'#666', bg:'rgba(102,102,102,.1)', border:'rgba(102,102,102,.2)' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
      color:s.color, background:s.bg, border:`1px solid ${s.border}`,
      whiteSpace:'nowrap'
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background:s.color,flexShrink:0}}/>
      {s.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('az-AZ', { day:'2-digit', month:'2-digit', year:'numeric' })
    + ' ' + d.toLocaleTimeString('az-AZ', { hour:'2-digit', minute:'2-digit' })
}

export default function AllOrdersPage() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [q, setQ]               = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedTracking, setExpandedTracking] = useState(new Set())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/all-orders`)
      if (!r.ok) { setError('Yüklənmədi'); return }
      setOrders(await r.json())
    } catch { setError('Backend cavab vermir') }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let list = orders
    if (filterStatus !== 'all')
      list = list.filter(o => o.fulfillment_status === filterStatus)
    if (q.trim()) {
      const ql = q.toLowerCase()
      list = list.filter(o =>
        o.name.toLowerCase().includes(ql) ||
        (o.customer||'').toLowerCase().includes(ql) ||
        o.tracking.some(t => t.number.toLowerCase().includes(ql))
      )
    }
    return list
  }, [orders, q, filterStatus])

  const counts = useMemo(() => ({
    all:         orders.length,
    unfulfilled: orders.filter(o=>o.fulfillment_status==='unfulfilled').length,
    fulfilled:   orders.filter(o=>o.fulfillment_status==='fulfilled').length,
    partial:     orders.filter(o=>o.fulfillment_status==='partial').length,
  }), [orders])

  function toggleTracking(id) {
    setExpandedTracking(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  return (
    <>
      <div className="refresh-row">
        <h2>🗂 Bütün Sifarişlər</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Yenilə</button>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
        {[
          { id:'all',         label:`Hamısı (${counts.all})` },
          { id:'unfulfilled', label:`Göndərilmədi (${counts.unfulfilled})` },
          { id:'fulfilled',   label:`Göndərildi (${counts.fulfilled})` },
          { id:'partial',     label:`Qismən (${counts.partial})` },
        ].map(f=>(
          <button key={f.id} onClick={()=>setFilterStatus(f.id)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600,
            cursor:'pointer', border:'1px solid', transition:'all .15s', fontFamily:'var(--sans)',
            background: filterStatus===f.id ? 'var(--accent)' : 'var(--surf2)',
            color: filterStatus===f.id ? '#000' : 'var(--muted)',
            borderColor: filterStatus===f.id ? 'var(--accent)' : 'var(--border)',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Axtarış */}
      <div className="search-wrap" style={{marginBottom:14}}>
        <span className="s-ico">🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Sifariş no, müştəri, izləmə kodu..." />
        {q && <button className="clear-btn" onClick={()=>setQ('')}>✕</button>}
      </div>

      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner"/></div>
      ) : !filtered.length ? (
        <div className="empty"><div className="empty-icon">📋</div><h3>Sifariş tapılmadı</h3></div>
      ) : (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:13,overflow:'hidden'}}>
          {/* Cədvəl başlığı */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'90px 1fr 110px 80px 110px 110px 60px',
            padding:'10px 16px',
            background:'var(--surf2)',
            borderBottom:'1px solid var(--border)',
            fontSize:11, fontWeight:700, color:'var(--muted)',
            textTransform:'uppercase', letterSpacing:.5,
          }}>
            <span>Sifariş</span>
            <span>Müştəri</span>
            <span>Tarix</span>
            <span style={{textAlign:'right'}}>Məbləğ</span>
            <span>Ödəniş</span>
            <span>Status</span>
            <span style={{textAlign:'center'}}>İzləmə</span>
          </div>

          {/* Sıralar */}
          {filtered.map((o, idx) => (
            <div key={o.id}>
              <div style={{
                display:'grid',
                gridTemplateColumns:'90px 1fr 110px 80px 110px 110px 60px',
                padding:'12px 16px',
                borderBottom: idx < filtered.length-1 ? '1px solid var(--border)' : 'none',
                alignItems:'center',
                transition:'background .15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surf2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {/* Sifariş no */}
                <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600,color:'var(--accent)'}}>
                  {o.name}
                </span>

                {/* Müştəri */}
                <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                  <span style={{fontSize:18}}>{FLAG(o.country_code)}</span>
                  <span style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {o.customer || '—'}
                  </span>
                  <span style={{fontSize:11,color:'var(--muted)',flexShrink:0}}>
                    {o.items_count} əd.
                  </span>
                </div>

                {/* Tarix */}
                <span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--mono)'}}>
                  {formatDate(o.created_at)}
                </span>

                {/* Məbləğ */}
                <span style={{fontSize:13,fontWeight:700,textAlign:'right',fontFamily:'var(--mono)'}}>
                  €{parseFloat(o.total).toFixed(2)}
                </span>

                {/* Ödəniş */}
                <Badge map={STATUS_LABEL} val={o.financial_status} />

                {/* Fulfillment */}
                <Badge map={FULFILL_LABEL} val={o.fulfillment_status} />

                {/* İzləmə */}
                <div style={{textAlign:'center'}}>
                  {o.tracking.length > 0 ? (
                    <button onClick={()=>toggleTracking(o.id)} style={{
                      background:'rgba(56,189,248,.12)', border:'1px solid rgba(56,189,248,.25)',
                      color:'#38bdf8', fontSize:11, fontWeight:700, padding:'4px 8px',
                      borderRadius:6, cursor:'pointer', fontFamily:'var(--sans)',
                    }}>
                      {o.tracking.length} kod
                    </button>
                  ) : (
                    <span style={{fontSize:11,color:'var(--border)'}}>—</span>
                  )}
                </div>
              </div>

              {/* İzləmə paneli */}
              {expandedTracking.has(o.id) && o.tracking.length > 0 && (
                <div style={{
                  padding:'12px 16px 14px 120px',
                  borderBottom: idx < filtered.length-1 ? '1px solid var(--border)' : 'none',
                  background:'rgba(56,189,248,.04)',
                }}>
                  {o.tracking.map((t,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<o.tracking.length-1?8:0}}>
                      <span style={{fontSize:13}}>📦</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:'#38bdf8'}}>
                        {t.number}
                      </span>
                      {t.company && (
                        <span style={{fontSize:12,color:'var(--muted)'}}>{t.company}</span>
                      )}
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noreferrer" style={{
                          fontSize:11,color:'var(--accent)',marginLeft:'auto',
                          textDecoration:'none',padding:'3px 8px',borderRadius:6,
                          background:'rgba(245,166,35,.1)',border:'1px solid rgba(245,166,35,.2)',
                        }}>İzlə →</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
