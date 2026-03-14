import { useState, useEffect } from 'react'
import { API } from '../config'

// ── Məhsul kateqoriyaları ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'paxlava', label: 'Paxlava', icon: '🍯', color: '#f5a623',
    subs: [
      { id: 'badamli',  label: 'Badamlı Paxlava',       keys: ['mandeln','badaml','almond'] },
      { id: 'coconut',  label: 'Coconut Paxlava',        keys: ['coconut'] },
      { id: 'shokolad', label: 'Şokolad Paxlava',        keys: ['chocolate','shokolad','şokolad'] },
      { id: 'irevan',   label: 'İrəvan Kətəsi',          keys: ['irevan kete ','irevan kətə','irevan kete w'] },
      { id: 'irevanqoz',label: 'İrəvan Kətəsi Qozlu',    keys: ['walnut','qozlu','walnuts'] },
      { id: 'turkish',  label: 'Turkish Baklava',        keys: ['turkish','seashell'] },
      { id: 'mix',      label: 'Paxlava-Şəkərbura Mix',  keys: ['mix','miks'] },
      { id: 'digər',    label: 'Digər Paxlava',          keys: ['paxlava','paklava','baklava'] },
    ],
  },
  {
    id: 'sekerbura', label: 'Şəkərbura', icon: '🌙', color: '#a78bfa',
    subs: [
      { id: 'sekerbura', label: 'Şəkərbura', keys: ['shekerbura','şəkərbura','sekerbura'] },
    ],
  },
  {
    id: 'badambura', label: 'Badambura & Kətə', icon: '🥐', color: '#4ade80',
    subs: [
      { id: 'badambura', label: 'Badambura',       keys: ['badambura'] },
      { id: 'qarabag',   label: 'Qarabağ Kətəsi',  keys: ['karabakh','qarabağ','qarabag'] },
      { id: 'irevankt',  label: 'İrəvan Kətəsi',   keys: ['irevan'] },
    ],
  },
  {
    id: 'qogal', label: 'Qoğal', icon: '🍩', color: '#38bdf8',
    subs: [
      { id: 'sirin',  label: 'Şirin Qoğal', keys: ['sweet qogal','sweet qoğal','şirin'] },
      { id: 'savory', label: 'Şor Qoğal',   keys: ['salty','savory','şor','duzlu'] },
    ],
  },
]

// Qutu ölçüsündən ədəd hesabla
const BOX_UNITS = {
  paxlava:   { s:8,  m:16, l:26 },
  sekerbura: { s:6,  m:12, l:20 },
  badambura: { s:4,  m:8,  l:14 },
  qarabag:   { s:4,  m:8,  l:14 },
  irevankt:  { s:4,  m:8,  l:14 },
  qogal:     { s:6,  m:12, l:20 },
  mix:       { s:8,  m:16, l:26 },
}

function getCatType(catId, subId) {
  if (catId === 'paxlava') return subId === 'mix' ? 'mix' : 'paxlava'
  if (catId === 'sekerbura') return 'sekerbura'
  if (catId === 'badambura') {
    if (subId === 'qarabag') return 'qarabag'
    if (subId === 'irevankt') return 'irevankt'
    return 'badambura'
  }
  if (catId === 'qogal') return 'qogal'
  return 'paxlava'
}

function getBoxSize(text) {
  const t = (text||'').toLowerCase()
  // ədəd mötərizədən tap
  const m = t.match(/\((\d+)/)
  if (m) {
    const n = parseInt(m[1])
    if (n <= 8)  return 's'
    if (n <= 16) return 'm'
    return 'l'
  }
  if (/\bs box\b|\bs qutu\b/.test(t)) return 's'
  if (/\bm box\b|\bm qutu\b/.test(t)) return 'm'
  if (/\bl box\b|\bl qutu\b/.test(t)) return 'l'
  return null
}

function findCatSub(name) {
  const n = (name||'').toLowerCase()
  for (const cat of CATEGORIES) {
    for (const sub of cat.subs) {
      if (sub.keys.some(k => n.includes(k.toLowerCase()))) {
        return { cat, sub }
      }
    }
  }
  return null
}

function processOrders(orders, date) {
  const filtered = date ? orders.filter(o => o.created_at === date) : orders

  // catId.subId → { label, units }
  const agg = {}

  function add(name, variantOrName, qty, isDirectUnit = false) {
    const clean = (name||'').replace(/^customized box\s*[-–]\s*/i,'').trim()
    const found = findCatSub(clean)
    if (!found) return

    const { cat, sub } = found
    const key = `${cat.id}.${sub.id}`
    if (!agg[key]) agg[key] = { cat, sub, units: 0 }

    if (isDirectUnit) {
      // Custom box içi — say birbaşa ədəddir
      agg[key].units += qty
    } else {
      // Normal sifariş — qutu ölçüsünə görə hesabla
      const size = getBoxSize(variantOrName || clean)
      if (size) {
        const type = getCatType(cat.id, sub.id)
        const table = BOX_UNITS[type] || BOX_UNITS.paxlava
        agg[key].units += table[size] * qty
      }
      // ölçü bilinmirsə say qeyd et (amma göstərmə)
    }
  }

  filtered.forEach(o => {
    o.items?.forEach(item => {
      if (item.is_custom_box && item.box_contents?.length) {
        // Custom box içi — ədədlər hazırdır
        item.box_contents.forEach(c => add(c.name, '', c.quantity, true))
      } else {
        // Normal — variant adında ölçü var
        const combined = `${item.name} ${item.variant||''}`
        add(item.name, combined, item.quantity, false)
      }
    })
  })

  return { agg, orderCount: filtered.length }
}

// ── UI ────────────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selDate, setSelDate]   = useState(todayStr())
  const [expanded, setExpanded] = useState({ paxlava:true, sekerbura:true, badambura:true, qogal:true })

  function todayStr() { return new Date().toISOString().slice(0,10) }

  useEffect(() => {
    fetch(`${API}/orders`).then(r=>r.json()).then(d=>{
      setOrders(Array.isArray(d)?d:[])
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const availDates = [...new Set(orders.map(o=>o.created_at))].sort().reverse()
  const { agg, orderCount } = processOrders(orders, selDate)

  const totalUnits = Object.values(agg).reduce((s,v)=>s+v.units,0)

  if (loading) return <div className="loading"><div className="spinner"/></div>

  return (
    <>
      <div className="refresh-row"><h2>📊 Statistika</h2></div>

      {/* Tarix seçimi */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {availDates.slice(0,10).map(d=>(
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
            padding:'5px 10px',borderRadius:9,fontSize:12,fontFamily:'var(--mono)',outline:'none'}}
        />
      </div>

      {!orderCount ? (
        <div className="empty"><div className="empty-icon">📊</div><h3>{selDate} tarixli sifariş yoxdur</h3></div>
      ) : (
        <>
          {/* Xülasə */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[
              {label:'Sifariş', value:orderCount, icon:'📦'},
              {label:'Ümumi Ədəd', value:totalUnits, icon:'🍬'},
            ].map(c=>(
              <div key={c.label} style={{background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:12,padding:'14px 18px',textAlign:'center'}}>
                <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
                <div style={{fontSize:26,fontWeight:800,fontFamily:'var(--mono)',color:'var(--accent)'}}>{c.value}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Kateqoriyalar */}
          {CATEGORIES.map(cat => {
            const catEntries = Object.entries(agg)
              .filter(([k,v]) => k.startsWith(cat.id+'.') && v.units > 0)
            if (!catEntries.length) return null
            const catTotal = catEntries.reduce((s,[,v])=>s+v.units,0)
            const isOpen = expanded[cat.id]
            const color = {paxlava:'#f5a623',sekerbura:'#a78bfa',badambura:'#4ade80',qogal:'#38bdf8'}[cat.id]

            return (
              <div key={cat.id} style={{background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:13,overflow:'hidden',marginBottom:10}}>
                <div onClick={()=>setExpanded(p=>({...p,[cat.id]:!p[cat.id]}))}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',cursor:'pointer',
                    borderBottom:isOpen?'1px solid var(--border)':'none'}}>
                  <span style={{fontSize:22}}>{cat.icon}</span>
                  <span style={{fontSize:15,fontWeight:800,flex:1}}>{cat.label}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:800,color}}>
                    {catTotal} əd.
                  </span>
                  <span style={{color:'var(--muted)',fontSize:11,marginLeft:8,display:'inline-block',
                    transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▼</span>
                </div>

                {isOpen && catEntries.map(([key, v]) => (
                  <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'12px 18px 12px 54px',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{v.sub.label}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color}}>
                      {v.units} <span style={{fontSize:12,color:'var(--muted)',fontWeight:400}}>əd.</span>
                    </span>
                  </div>
                ))}

                {isOpen && catEntries.length > 1 && (
                  <div style={{display:'flex',justifyContent:'space-between',padding:'11px 18px',
                    background:'var(--surf2)'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--muted)'}}>Cəmi</span>
                    <span style={{fontSize:16,fontWeight:800,fontFamily:'var(--mono)',color}}>
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
