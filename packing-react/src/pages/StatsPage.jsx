import { useState, useEffect } from 'react'
import { API } from '../config'

// ── Hər məhsul üçün dəqiq qaydalar ──────────────────────────────────────────
const PRODUCTS = [
  // PAXLAVA
  { id:'badamli',    label:'Badamlı Paxlava',      cat:'paxlava',   keys:['mandeln','badaml','azerbaijani paxlava - baklava','azerbaijani paxlava mandeln'], s:8,  m:16, l:26 },
  { id:'coconut',    label:'Coconut Paxlava',       cat:'paxlava',   keys:['coconut paxlava','coconut baklava'],                                              s:8,  m:16, l:26 },
  { id:'shokolad',   label:'Şokolad Paxlava',       cat:'paxlava',   keys:['chocolate paxlava','chocolate baklava','şokolad'],                                s:8,  m:16, l:26 },
  { id:'turkish',    label:'Turkish Baklava',       cat:'paxlava',   keys:['turkish baklava','seashell'],                                                     s:8,  m:16, l:26 },
  { id:'irevan',     label:'İrəvan Kətəsi',         cat:'paxlava',   keys:['irevan kete ','irevan kete -','irevan kətə'],                                     s:8,  m:16, l:26 },
  { id:'irevanqoz',  label:'İrəvan Kətəsi Qozlu',   cat:'paxlava',   keys:['irevan kete w','irevan kete walnuts','qozlu'],                                    s:8,  m:16, l:26 },
  { id:'mix',        label:'Paxlava-Şəkərbura Mix', cat:'paxlava',   keys:['mix','miks'],                                                                     s:8,  m:16, l:26 },

  // ŞƏKƏRBURA
  { id:'sekerbura',  label:'Şəkərbura',             cat:'sekerbura', keys:['shekerbura','şəkərbura','sekerbura'],                                             s:6,  m:12, l:20 },

  // BADAMBURA & KƏTƏ
  { id:'badambura',  label:'Badambura',             cat:'badambura', keys:['badambura'],                                                                      s:4,  m:8,  l:14 },
  { id:'qarabag',    label:'Qarabağ Kətəsi',        cat:'badambura', keys:['karabakh kete','qarabağ','qarabag'],                                              s:4,  m:8,  l:14 },

  // QOĞAL
  { id:'sirin',      label:'Şirin Qoğal',           cat:'qogal',     keys:['sweet qogal','sweet qoğal'],                                                     s:6,  m:12, l:20 },
  { id:'savory',     label:'Şor Qoğal',             cat:'qogal',     keys:['salty qogal','savory qogal'],                                                    s:6,  m:12, l:20 },
]

const CATS = [
  { id:'paxlava',   label:'Paxlava',          icon:'🍯', color:'#f5a623' },
  { id:'sekerbura', label:'Şəkərbura',         icon:'🌙', color:'#a78bfa' },
  { id:'badambura', label:'Badambura & Kətə',  icon:'🥐', color:'#4ade80' },
  { id:'qogal',     label:'Qoğal',             icon:'🍩', color:'#38bdf8' },
]

// Məhsul adına uyğun qaydanı tap — ən uzun uyğunluq qalib gəlir
function findProduct(name) {
  const n = (name||'').toLowerCase().replace(/^customized box\s*[-–]\s*/i,'').trim()
  let best = null, bestLen = 0
  for (const p of PRODUCTS) {
    for (const k of p.keys) {
      if (n.includes(k.toLowerCase()) && k.length > bestLen) {
        best = p; bestLen = k.length
      }
    }
  }
  return best
}

// Variant mətndən qutu ölçüsünü tap
function getSize(text) {
  const t = (text||'').toLowerCase()
  const m = t.match(/\((\d+)/)
  if (m) {
    const n = parseInt(m[1])
    if (n <= 8)  return 's'
    if (n <= 16) return 'm'
    return 'l'
  }
  if (/\bs[\s_-]?box\b/.test(t) || / s box/i.test(t)) return 's'
  if (/\bm[\s_-]?box\b/.test(t) || / m box/i.test(t)) return 'm'
  if (/\bl[\s_-]?box\b/.test(t) || / l box/i.test(t)) return 'l'
  return null
}

function calcUnits(prod, variantText, qty) {
  const size = getSize(variantText)
  if (!size) return 0
  const base = { s: prod.s, m: prod.m, l: prod.l }[size]
  return base * qty
}

function processOrders(orders, date) {
  const filtered = date ? orders.filter(o => o.created_at === date) : orders

  // prodId → { label, cat, units }
  const agg = {}

  function add(rawName, variantOrFull, qty, directUnits) {
    const prod = findProduct(rawName)
    if (!prod) return
    if (!agg[prod.id]) agg[prod.id] = { label: prod.label, cat: prod.cat, units: 0 }
    if (directUnits) {
      agg[prod.id].units += qty
    } else {
      agg[prod.id].units += calcUnits(prod, variantOrFull, qty)
    }
  }

  filtered.forEach(o => {
    o.items?.forEach(item => {
      if (item.is_custom_box && item.box_contents?.length) {
        // Custom box — ədədlər artıq hazırdır
        item.box_contents.forEach(c => add(c.name, '', c.quantity, true))
      } else {
        // Normal — variant + ad birləşdir
        const full = `${item.name} ${item.variant||''}`
        add(item.name, full, item.quantity, false)
      }
    })
  })

  return { agg, count: filtered.length }
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function StatsPage() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selDate, setSelDate]   = useState(todayStr())
  const [expanded, setExpanded] = useState({ paxlava:true, sekerbura:true, badambura:true, qogal:true })

  useEffect(() => {
    fetch(`${API}/orders`).then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const availDates = [...new Set(orders.map(o => o.created_at))].sort().reverse()
  const { agg, count } = processOrders(orders, selDate)

  const totalUnits = Object.values(agg).reduce((s, v) => s + v.units, 0)

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <>
      <div className="refresh-row"><h2>📊 Statistika</h2></div>

      {/* Tarix düymələri */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {availDates.slice(0, 14).map(d => (
          <button key={d} onClick={() => setSelDate(d)} style={{
            padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:'var(--mono)', border:'1px solid', transition:'all .15s',
            background: d === selDate ? 'var(--accent)' : 'var(--surf2)',
            color: d === selDate ? '#000' : 'var(--muted)',
            borderColor: d === selDate ? 'var(--accent)' : 'var(--border)',
          }}>
            {d === todayStr() ? '🟢 Bu gün' : d.slice(5).replace('-', '/')}
          </button>
        ))}
        <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
          style={{ background:'var(--surf2)', border:'1px solid var(--border)', color:'var(--text)',
            padding:'5px 10px', borderRadius:9, fontSize:12, fontFamily:'var(--mono)', outline:'none' }} />
      </div>

      {!count ? (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <h3>{selDate} tarixli sifariş yoxdur</h3>
        </div>
      ) : (
        <>
          {/* Xülasə */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { label:'Sifariş sayı', value:count,      icon:'📦' },
              { label:'Ümumi ədəd',   value:totalUnits, icon:'🍬' },
            ].map(c => (
              <div key={c.label} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:12, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{c.icon}</div>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:'var(--mono)', color:'var(--accent)' }}>{c.value}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Kateqoriyalar */}
          {CATS.map(cat => {
            const items = Object.entries(agg).filter(([, v]) => v.cat === cat.id && v.units > 0)
            if (!items.length) return null
            const catTotal = items.reduce((s, [, v]) => s + v.units, 0)
            const isOpen = expanded[cat.id]

            return (
              <div key={cat.id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:13, overflow:'hidden', marginBottom:10 }}>

                {/* Başlıq */}
                <div onClick={() => setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
                    cursor:'pointer', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:22 }}>{cat.icon}</span>
                  <span style={{ fontSize:15, fontWeight:800, flex:1 }}>{cat.label}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:cat.color }}>
                    {catTotal} əd.
                  </span>
                  <span style={{ color:'var(--muted)', fontSize:11, marginLeft:8, display:'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▼</span>
                </div>

                {/* Alt məhsullar */}
                {isOpen && items.map(([id, v]) => (
                  <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'11px 18px 11px 54px', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>{v.label}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color:cat.color }}>
                      {v.units} <span style={{ fontSize:12, color:'var(--muted)', fontWeight:400 }}>əd.</span>
                    </span>
                  </div>
                ))}

                {/* Cəmi (birdən çox məhsul varsa) */}
                {isOpen && items.length > 1 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 18px',
                    background:'var(--surf2)' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--muted)' }}>Cəmi</span>
                    <span style={{ fontSize:16, fontWeight:800, fontFamily:'var(--mono)', color:cat.color }}>
                      {catTotal} əd.
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}
