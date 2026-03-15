import { useState, useEffect } from 'react'
import { API } from '../config'

const PRODUCTS = [
  { id:'badamli',   label:'Badamlı Paxlava',      icon:'🍯', color:'#f5a623', keys:['mandeln','azerbaijani paxlava - baklava','azerbaijani paxlava mandeln','badaml'], s:8,  m:16, l:26 },
  { id:'coconut',   label:'Coconut Paxlava',       icon:'🍯', color:'#f5a623', keys:['coconut paxlava','coconut baklava'],                                              s:8,  m:16, l:26 },
  { id:'shokolad',  label:'Şokolad Paxlava',       icon:'🍯', color:'#f5a623', keys:['chocolate paxlava','chocolate baklava','şokolad'],                                s:8,  m:16, l:26 },
  { id:'turkish',   label:'Turkish Baklava',       icon:'🍯', color:'#f5a623', keys:['turkish baklava','seashell'],                                                     s:8,  m:16, l:26 },
  { id:'irevanqoz', label:'İrəvan Kətəsi Qozlu',   icon:'🍯', color:'#f5a623', keys:['irevan kete walnuts','irevan kete w','qozlu'],                                    s:8,  m:16, l:26 },
  { id:'irevan',    label:'İrəvan Kətəsi',          icon:'🍯', color:'#f5a623', keys:['irevan kete ','irevan kete -','irevan kətə'],                                     s:8,  m:16, l:26 },
  { id:'mix',       label:'Paxlava-Şəkərbura Mix',  icon:'🍯', color:'#f5a623', keys:['mix','miks'],                                                                     s:8,  m:16, l:26 },
  { id:'sekerbura', label:'Şəkərbura',              icon:'🌙', color:'#a78bfa', keys:['shekerbura','şəkərbura','sekerbura'],                                             s:6,  m:12, l:20 },
  { id:'badambura', label:'Badambura',              icon:'🥐', color:'#4ade80', keys:['badambura'],                                                                      s:4,  m:8,  l:14 },
  { id:'qarabag',   label:'Qarabağ Kətəsi',         icon:'🥐', color:'#4ade80', keys:['karabakh kete','qarabağ','qarabag'],                                              s:4,  m:8,  l:14 },
  { id:'sirin',     label:'Şirin Qoğal',            icon:'🍩', color:'#38bdf8', keys:['sweet qogal','sweet qoğal'],                                                     s:6,  m:12, l:20 },
  { id:'savory',    label:'Şor Qoğal',              icon:'🍩', color:'#38bdf8', keys:['salty qogal','savory qogal'],                                                    s:6,  m:12, l:20 },
]

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

function getSize(text) {
  const t = (text||'').toLowerCase()
  const m = t.match(/\((\d+)/)
  if (m) {
    const n = parseInt(m[1])
    if (n <= 8) return 's'
    if (n <= 16) return 'm'
    return 'l'
  }
  if (/s[\s-]?box/i.test(t)) return 's'
  if (/m[\s-]?box/i.test(t)) return 'm'
  if (/l[\s-]?box/i.test(t)) return 'l'
  return null
}

function processOrders(orders, date) {
  const filtered = date ? orders.filter(o => o.created_at === date) : orders
  const agg = {} // prodId → units

  function add(rawName, variantText, qty, direct) {
    const prod = findProduct(rawName)
    if (!prod) return
    if (!agg[prod.id]) agg[prod.id] = { ...prod, units: 0 }
    if (direct) {
      agg[prod.id].units += qty
    } else {
      const size = getSize(variantText)
      if (size) agg[prod.id].units += prod[size] * qty
    }
  }

  filtered.forEach(o => {
    o.items?.forEach(item => {
      if (item.is_custom_box && item.box_contents?.length) {
        item.box_contents.forEach(c => add(c.name, '', c.quantity, true))
      } else {
        add(item.name, `${item.name} ${item.variant||''}`, item.quantity, false)
      }
    })
  })

  return { agg, count: filtered.length }
}

function todayStr() { return new Date().toISOString().slice(0,10) }

export default function StatsPage() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selDate, setSelDate] = useState(todayStr())

  useEffect(() => {
    fetch(`${API}/orders`).then(r=>r.json())
      .then(d => setOrders(Array.isArray(d)?d:[]))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [])

  const availDates = [...new Set(orders.map(o=>o.created_at))].sort().reverse()
  const { agg, count } = processOrders(orders, selDate)

  // PRODUCTS sırasına görə göstər
  const items = PRODUCTS.map(p => agg[p.id]).filter(Boolean).filter(v => v.units > 0)
  const totalUnits = items.reduce((s,v) => s+v.units, 0)

  if (loading) return <div className="loading"><div className="spinner"/></div>

  return (
    <>
      <div className="refresh-row"><h2>📊 Statistika</h2></div>

      {/* Tarix seçimi */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {availDates.slice(0,14).map(d=>(
          <button key={d} onClick={()=>setSelDate(d)} style={{
            padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,
            cursor:'pointer',fontFamily:'var(--mono)',border:'1px solid',transition:'all .15s',
            background:d===selDate?'var(--accent)':'var(--surf2)',
            color:d===selDate?'#000':'var(--muted)',
            borderColor:d===selDate?'var(--accent)':'var(--border)',
          }}>
            {d===todayStr()?'🟢 Bu gün':d.slice(5).replace('-','/')}
          </button>
        ))}
        <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
          style={{background:'var(--surf2)',border:'1px solid var(--border)',color:'var(--text)',
            padding:'5px 10px',borderRadius:9,fontSize:12,fontFamily:'var(--mono)',outline:'none'}}/>
      </div>

      {!count ? (
        <div className="empty"><div className="empty-icon">📊</div><h3>{selDate} tarixli sifariş yoxdur</h3></div>
      ) : (
        <>
          {/* Xülasə */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[
              {label:'Sifariş',     value:count,      icon:'📦'},
              {label:'Ümumi ədəd',  value:totalUnits, icon:'🍬'},
            ].map(c=>(
              <div key={c.label} style={{background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:12,padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>{c.icon}</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:'var(--mono)',color:'var(--accent)'}}>{c.value}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Məhsul sırası */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:13,overflow:'hidden'}}>
            {items.map((v, idx) => (
              <div key={v.id} style={{
                display:'flex',alignItems:'center',gap:14,
                padding:'14px 20px',
                borderBottom: idx < items.length-1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{fontSize:22,flexShrink:0}}>{v.icon}</span>
                <span style={{fontSize:15,fontWeight:700,flex:1,color:'var(--text)'}}>{v.label}</span>
                <span style={{fontFamily:'var(--mono)',fontSize:22,fontWeight:800,color:v.color}}>
                  {v.units}
                </span>
                <span style={{fontSize:13,color:'var(--muted)',width:24}}>əd.</span>
              </div>
            ))}

            {/* Cəmi */}
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',
              background:'var(--surf2)',borderTop:'2px solid var(--border)'}}>
              <span style={{fontSize:22}}>🔢</span>
              <span style={{fontSize:15,fontWeight:800,flex:1}}>Cəmi</span>
              <span style={{fontFamily:'var(--mono)',fontSize:22,fontWeight:800,color:'var(--accent)'}}>
                {totalUnits}
              </span>
              <span style={{fontSize:13,color:'var(--muted)',width:24}}>əd.</span>
            </div>
          </div>
        </>
      )}
    </>
  )
}
