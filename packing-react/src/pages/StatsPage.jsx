import { useState, useEffect } from 'react'
import { API } from '../config'

// ── Kateqoriya qaydaları ──────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'paxlava',
    label: 'Paxlava',
    icon: '🍯',
    color: '#f5a623',
    subs: [
      { id: 'badamli',   label: 'Badamlı Paxlava',        keys: ['badaml','almond'] },
      { id: 'coconut',   label: 'Coconut Paxlava',         keys: ['coconut','kokos'] },
      { id: 'shokolad',  label: 'Şokolad Paxlava',         keys: ['shokolad','şokolad','chocolate'] },
      { id: 'irevan',    label: 'İrəvan Kətəsi',           keys: ['irevan','irəvan','kete','kətəsi'] },
      { id: 'irevanqoz', label: 'İrəvan Kətəsi Qozlu',     keys: ['qozlu','walnut'] },
      { id: 'mix',       label: 'Paxlava-Şəkərbura Mix',   keys: ['mix','miks'] },
    ],
    sBoxUnits: 8, mBoxUnits: 16, lBoxUnits: 24, lBonus: 2,
    fallbackKeys: ['paxlava','baklava'],
  },
  {
    id: 'sekerbura',
    label: 'Şəkərbura',
    icon: '🌙',
    color: '#a78bfa',
    subs: [
      { id: 'sekerbura', label: 'Şəkərbura', keys: ['şəkərbura','sekerbura','shekerbura'] },
    ],
    sBoxUnits: 6, mBoxUnits: 12, lBoxUnits: 18, lBonus: 2,
    fallbackKeys: ['şəkərbura','sekerbura','shekerbura'],
  },
  {
    id: 'badambura',
    label: 'Badambura & Kətə',
    icon: '🥐',
    color: '#4ade80',
    subs: [
      { id: 'badambura', label: 'Badambura',      keys: ['badambura'] },
      { id: 'qarabag',   label: 'Qarabağ Kətəsi', keys: ['qarabağ','qarabag'] },
    ],
    sBoxUnits: 4, mBoxUnits: 8, lBoxUnits: 12, lBonus: 2,
    fallbackKeys: ['badambura','qarabağ','qarabag'],
  },
  {
    id: 'qogal',
    label: 'Qoğal',
    icon: '🍩',
    color: '#38bdf8',
    subs: [
      { id: 'sirin',  label: 'Şirin Qoğal', keys: ['sweet','şirin','sirin'] },
      { id: 'savory', label: 'Şor Qoğal',   keys: ['savory','şor','shor','duzlu'] },
    ],
    sBoxUnits: 6, mBoxUnits: 12, lBoxUnits: 18, lBonus: 2,
    fallbackKeys: ['qogal','qoğal'],
  },
]

function getBoxSize(text) {
  const t = (text||'').toLowerCase()
  if (/\bs\s*box\b|\bs\s*qutu|\(4\s*p|\(6\s*p|\(8\s*p/.test(t)) return 's'
  if (/\bm\s*box\b|\bm\s*qutu|\(12|\(16/.test(t)) return 'm'
  if (/\bl\s*box\b|\bl\s*qutu|\(18|\(24/.test(t)) return 'l'
  if (/ s /i.test(' '+t+' ') && !t.includes('sweet')) return 's'
  if (/ m /i.test(' '+t+' ')) return 'm'
  if (/ l /i.test(' '+t+' ')) return 'l'
  return null
}

function findCategory(name) {
  const n = (name||'').toLowerCase().replace(/^customized box\s*[-–]\s*/i,'')
  for (const cat of CATEGORIES) {
    for (const sub of cat.subs) {
      if (sub.keys.some(k => n.includes(k))) return { cat, sub }
    }
    if (cat.fallbackKeys.some(k => n.includes(k))) return { cat, sub: null }
  }
  return null
}

function calcUnits(cat, variant, qty) {
  const size = getBoxSize(variant)
  if (!size) return 0
  const base = cat[`${size}BoxUnits`]
  const bonus = size === 'l' ? cat.lBonus : 0
  return (base + bonus) * qty
}

function processOrders(orders, date) {
  const filtered = date ? orders.filter(o => o.created_at === date) : orders

  // catId → subId → { boxes, units }
  const result = {}
  CATEGORIES.forEach(cat => { result[cat.id] = {} })

  filtered.forEach(o => {
    const items = []
    o.items?.forEach(item => {
      if (item.is_custom_box && item.box_contents?.length) {
        item.box_contents.forEach(c => items.push({ name: c.name, variant: '', qty: c.quantity }))
      } else {
        items.push({ name: item.name, variant: item.variant||'', qty: item.quantity })
      }
    })

    items.forEach(({ name, variant, qty }) => {
      const found = findCategory(name)
      if (!found) return
      const { cat, sub } = found
      const subId = sub ? sub.id : cat.subs[0]?.id || 'other'
      const subLabel = sub ? sub.label : cat.label
      if (!result[cat.id][subId]) result[cat.id][subId] = { label: subLabel, boxes: 0, units: 0 }
      result[cat.id][subId].boxes += qty
      result[cat.id][subId].units += calcUnits(cat, variant || name, qty)
    })
  })

  return { result, orderCount: filtered.length }
}

// ── Komponent ──────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selDate, setSelDate]   = useState(todayStr())
  const [expanded, setExpanded] = useState({})

  function todayStr() { return new Date().toISOString().slice(0,10) }

  useEffect(() => {
    fetch(`${API}/orders`).then(r=>r.json()).then(d=>{
      setOrders(Array.isArray(d)?d:[])
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  // Mövcud günlər
  const availDates = [...new Set(orders.map(o=>o.created_at))].sort().reverse()

  const { result, orderCount } = processOrders(orders, selDate)

  const totalUnits = CATEGORIES.reduce((s, cat) =>
    s + Object.values(result[cat.id]).reduce((ss,v) => ss+v.units, 0), 0)
  const totalBoxes = CATEGORIES.reduce((s, cat) =>
    s + Object.values(result[cat.id]).reduce((ss,v) => ss+v.boxes, 0), 0)

  if (loading) return <div className="loading"><div className="spinner"/></div>

  return (
    <>
      {/* Header */}
      <div className="refresh-row" style={{marginBottom:16}}>
        <h2>📊 Statistika</h2>
      </div>

      {/* Tarix seçimi */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>Tarix:</span>
        {availDates.slice(0,14).map(d => (
          <button key={d} onClick={()=>setSelDate(d)} style={{
            padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
            fontFamily:'var(--mono)',border:'1px solid',transition:'all .15s',
            background: d===selDate ? 'var(--accent)' : 'var(--surf2)',
            color: d===selDate ? '#000' : 'var(--muted)',
            borderColor: d===selDate ? 'var(--accent)' : 'var(--border)',
          }}>
            {d === todayStr() ? '🟢 Bu gün' : d.slice(5).replace('-','/')}
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
          {/* Xülasə kartları */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
            {[
              {label:'Sifariş', value:orderCount, icon:'📦'},
              {label:'Qutu',    value:totalBoxes,  icon:'🗃'},
              {label:'Ədəd',    value:totalUnits,  icon:'🍬'},
            ].map(c=>(
              <div key={c.label} style={{background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:12,padding:'16px 18px',textAlign:'center'}}>
                <div style={{fontSize:26,marginBottom:6}}>{c.icon}</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:'var(--mono)',color:'var(--accent)'}}>{c.value}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Kateqoriya kartları */}
          {CATEGORIES.map(cat => {
            const subs = Object.entries(result[cat.id]).filter(([,v])=>v.boxes>0)
            if (!subs.length) return null
            const catTotal = subs.reduce((s,[,v])=>s+v.units,0)
            const catBoxes = subs.reduce((s,[,v])=>s+v.boxes,0)
            const isOpen = expanded[cat.id]

            return (
              <div key={cat.id} style={{background:'var(--surface)',border:`1px solid var(--border)`,
                borderRadius:13,overflow:'hidden',marginBottom:10}}>
                {/* Kateqoriya başlığı */}
                <div onClick={()=>setExpanded(p=>({...p,[cat.id]:!p[cat.id]}))}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',
                    cursor:'pointer',borderBottom: isOpen?'1px solid var(--border)':'none'}}>
                  <span style={{fontSize:22}}>{cat.icon}</span>
                  <span style={{fontSize:15,fontWeight:800,flex:1}}>{cat.label}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:cat.color}}>
                    {catTotal} əd.
                  </span>
                  <span style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--mono)',marginLeft:4}}>
                    ({catBoxes} qutu)
                  </span>
                  <span style={{color:'var(--muted)',fontSize:11,marginLeft:8,transition:'transform .2s',
                    display:'inline-block',transform:isOpen?'rotate(180deg)':'none'}}>▼</span>
                </div>

                {/* Alt məhsullar */}
                {isOpen && (
                  <div>
                    {subs.map(([subId, v]) => (
                      <div key={subId} style={{display:'flex',alignItems:'center',gap:14,
                        padding:'11px 18px',borderBottom:'1px solid var(--border)'}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:600}}>{v.label}</div>
                          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                            {v.boxes} qutu
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:20,fontWeight:800,fontFamily:'var(--mono)',color:cat.color}}>
                            {v.units}
                          </div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>ədəd</div>
                        </div>
                      </div>
                    ))}
                    {/* Cəmi */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'11px 18px',background:'var(--surf2)'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'var(--muted)'}}>Cəmi</span>
                      <span style={{fontSize:16,fontWeight:800,fontFamily:'var(--mono)',color:cat.color}}>
                        {catTotal} ədəd
                      </span>
                    </div>
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
