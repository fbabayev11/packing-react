import { useState, useEffect, useMemo } from 'react'
import { API, FLAG } from '../config'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('az-AZ', { day:'2-digit', month:'2-digit' }) +
    ' ' + d.toLocaleTimeString('az-AZ', { hour:'2-digit', minute:'2-digit' })
}

function PayBadge({ val }) {
  const map = {
    paid:     { label:'Ödənilib',   color:'#4ade80', bg:'rgba(74,222,128,.1)',  bd:'rgba(74,222,128,.25)' },
    pending:  { label:'Gözlənilir', color:'#f5a623', bg:'rgba(245,166,35,.1)',  bd:'rgba(245,166,35,.25)' },
    refunded: { label:'Geri qaytarıldı', color:'#f87171', bg:'rgba(248,113,113,.1)', bd:'rgba(248,113,113,.25)' },
    partially_refunded: { label:'Qismən geri', color:'#f87171', bg:'rgba(248,113,113,.1)', bd:'rgba(248,113,113,.25)' },
    voided:   { label:'Ləğv edildi', color:'#666', bg:'rgba(100,100,100,.1)', bd:'rgba(100,100,100,.2)' },
  }
  const s = map[val] || { label: val, color:'#666', bg:'rgba(100,100,100,.1)', bd:'rgba(100,100,100,.2)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
      borderRadius:20, fontSize:11, fontWeight:600, color:s.color,
      background:s.bg, border:`1px solid ${s.bd}`, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color }} />
      {s.label}
    </span>
  )
}

function FulBadge({ val }) {
  const map = {
    fulfilled:   { label:'Göndərildi',   color:'#4ade80', bg:'rgba(74,222,128,.1)',  bd:'rgba(74,222,128,.25)' },
    unfulfilled: { label:'Göndərilmədi', color:'#f5a623', bg:'rgba(245,166,35,.1)',  bd:'rgba(245,166,35,.25)' },
    partial:     { label:'Qismən',       color:'#38bdf8', bg:'rgba(56,189,248,.1)',  bd:'rgba(56,189,248,.25)' },
    restocked:   { label:'Geri qoyuldu', color:'#666',    bg:'rgba(100,100,100,.1)', bd:'rgba(100,100,100,.2)' },
  }
  const s = map[val] || { label: val, color:'#666', bg:'rgba(100,100,100,.1)', bd:'rgba(100,100,100,.2)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
      borderRadius:20, fontSize:11, fontWeight:600, color:s.color,
      background:s.bg, border:`1px solid ${s.bd}`, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color }} />
      {s.label}
    </span>
  )
}

function OrderRow({ o }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      {/* Əsas sıra */}
      <div
        onClick={() => setOpen(x => !x)}
        style={{
          display:'grid',
          gridTemplateColumns:'80px 1fr 100px 70px 120px 120px',
          padding:'12px 16px', alignItems:'center', cursor:'pointer',
          background: open ? 'rgba(245,166,35,.04)' : 'transparent',
          transition:'background .15s',
          gap: 8,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--surf2)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:'var(--accent)' }}>
          {o.name}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <span style={{ fontSize:18 }}>{FLAG(o.country_code)}</span>
          <span style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {o.customer || '—'}
          </span>
          <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{o.items_count} əd.</span>
        </div>
        <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)' }}>{formatDate(o.created_at)}</span>
        <span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', textAlign:'right' }}>
          €{parseFloat(o.total||0).toFixed(2)}
        </span>
        <PayBadge val={o.financial_status} />
        <FulBadge val={o.fulfillment_status} />
      </div>

      {/* Açılan panel */}
      {open && (
        <div style={{ padding:'0 16px 16px 16px', background:'rgba(245,166,35,.03)' }}>

          {/* Məhsullar */}
          <div style={{ marginBottom: o.tracking?.length ? 14 : 0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
              textTransform:'uppercase', letterSpacing:.5, padding:'10px 0 8px' }}>
              Məhsullar
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {(o.items||[]).map((item, i) => {
                const allRefunded = item.refunded_qty >= item.total_qty
                const allFulfilled = item.fulfilled_qty >= item.total_qty && !allRefunded
                const partial = item.fulfilled_qty > 0 && !allFulfilled && !allRefunded

                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 12px', borderRadius:10,
                    background: allRefunded ? 'rgba(248,113,113,.08)'
                      : allFulfilled ? 'rgba(74,222,128,.06)'
                      : 'var(--surf2)',
                    border: allRefunded ? '1px solid rgba(248,113,113,.2)'
                      : allFulfilled ? '1px solid rgba(74,222,128,.15)'
                      : '1px solid transparent',
                  }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>
                      {allRefunded ? '↩' : allFulfilled ? '✅' : partial ? '🔄' : '⏳'}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, fontWeight:600,
                        color: allRefunded ? 'var(--muted)' : 'var(--text)',
                        textDecoration: allRefunded ? 'line-through' : 'none',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>
                        {item.name}
                      </div>
                      {item.variant && (
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{item.variant}</div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:5, alignItems:'center', flexShrink:0 }}>
                      {item.fulfilled_qty > 0 && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600,
                          background:'rgba(74,222,128,.12)', color:'#4ade80', border:'1px solid rgba(74,222,128,.2)' }}>
                          ✓ {item.fulfilled_qty}
                        </span>
                      )}
                      {item.pending_qty > 0 && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600,
                          background:'rgba(245,166,35,.12)', color:'var(--accent)', border:'1px solid rgba(245,166,35,.2)' }}>
                          ⏳ {item.pending_qty}
                        </span>
                      )}
                      {item.refunded_qty > 0 && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600,
                          background:'rgba(248,113,113,.12)', color:'var(--red)', border:'1px solid rgba(248,113,113,.2)' }}>
                          ↩ {item.refunded_qty}
                        </span>
                      )}
                      <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>
                        /{item.total_qty}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* İzləmə kodları */}
          {o.tracking?.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                İzləmə Kodları
              </div>
              {o.tracking.map((t, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                  borderRadius:10, background:'rgba(56,189,248,.06)',
                  border:'1px solid rgba(56,189,248,.15)', marginBottom: i < o.tracking.length-1 ? 6 : 0,
                }}>
                  <span style={{ fontSize:16 }}>📦</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:'#38bdf8', flex:1 }}>
                    {t.number}
                  </span>
                  {t.company && <span style={{ fontSize:12, color:'var(--muted)' }}>{t.company}</span>}
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize:12, color:'var(--accent)', textDecoration:'none',
                        padding:'3px 10px', borderRadius:6,
                        background:'rgba(245,166,35,.1)', border:'1px solid rgba(245,166,35,.2)' }}>
                      İzlə →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AllOrdersPage() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [q, setQ]             = useState('')
  const [status, setStatus]   = useState('all')

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

  const counts = useMemo(() => ({
    all:         orders.length,
    unfulfilled: orders.filter(o => o.fulfillment_status === 'unfulfilled').length,
    fulfilled:   orders.filter(o => o.fulfillment_status === 'fulfilled').length,
    partial:     orders.filter(o => o.fulfillment_status === 'partial').length,
  }), [orders])

  const filtered = useMemo(() => {
    let list = orders
    if (status !== 'all') list = list.filter(o => o.fulfillment_status === status)
    if (q.trim()) {
      const ql = q.toLowerCase()
      list = list.filter(o =>
        o.name.toLowerCase().includes(ql) ||
        (o.customer||'').toLowerCase().includes(ql) ||
        (o.tracking||[]).some(t => t.number?.toLowerCase().includes(ql))
      )
    }
    return list
  }, [orders, q, status])

  return (
    <>
      <div className="refresh-row">
        <h2>🗂 Bütün Sifarişlər</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Yenilə</button>
      </div>

      {/* Status filter */}
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
        {[
          { id:'all',         label:`Hamısı (${counts.all})` },
          { id:'unfulfilled', label:`Göndərilmədi (${counts.unfulfilled})` },
          { id:'fulfilled',   label:`Göndərildi (${counts.fulfilled})` },
          { id:'partial',     label:`Qismən (${counts.partial})` },
        ].map(f => (
          <button key={f.id} onClick={() => setStatus(f.id)} style={{
            padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600,
            cursor:'pointer', border:'1px solid', transition:'all .15s', fontFamily:'var(--sans)',
            background: status===f.id ? 'var(--accent)' : 'var(--surf2)',
            color: status===f.id ? '#000' : 'var(--muted)',
            borderColor: status===f.id ? 'var(--accent)' : 'var(--border)',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Axtarış */}
      <div className="search-wrap" style={{ marginBottom:14 }}>
        <span className="s-ico">🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Sifariş no, müştəri, izləmə kodu..." />
        {q && <button className="clear-btn" onClick={() => setQ('')}>✕</button>}
      </div>

      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !filtered.length ? (
        <div className="empty"><div className="empty-icon">📋</div><h3>Sifariş tapılmadı</h3></div>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:13, overflow:'hidden' }}>
          {/* Başlıq */}
          <div style={{
            display:'grid', gridTemplateColumns:'80px 1fr 100px 70px 120px 120px',
            padding:'10px 16px', background:'var(--surf2)', borderBottom:'1px solid var(--border)',
            fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, gap:8,
          }}>
            <span>Sifariş</span>
            <span>Müştəri</span>
            <span>Tarix</span>
            <span style={{textAlign:'right'}}>Məbləğ</span>
            <span>Ödəniş</span>
            <span>Status</span>
          </div>
          {filtered.map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}
    </>
  )
}
