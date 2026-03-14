import { useState, useEffect } from 'react'
import { API } from '../config'

// ── Qutu içi ədəd qaydaları ───────────────────────────────────────────────────
// variant adında "S Box", "M Box", "L Box" axtarır
// L Box üçün bonus ədəd də əlavə olunur

const BOX_RULES = [
  // Qoğal (şor və şirin)
  { match: ['qogal','qoqal'], s:6, m:12, l:18, lbonus:2 },
  // Paxlava (badamlı, coconut, şokolad, irəvan kətəsi, irəvan kətəsi qozlu)
  { match: ['paxlava','baklava','kətəsi','kete','coconut','badaml','shokolad','şokolad'], s:8, m:16, l:24, lbonus:2 },
  // Şəkərbura
  { match: ['şəkərbura','sekerbura','shekerbura'], s:6, m:12, l:18, lbonus:2 },
  // Badambura, Qarabağ kətəsi
  { match: ['badambura','qarabağ','qarabag'], s:4, m:8, l:12, lbonus:2 },
  // Paxlava-Şəkərbura Mix
  { match: ['mix','miks'], s:8, m:16, l:24, lbonus:2 },
]

function getBoxSize(variantOrName) {
  const v = (variantOrName||'').toLowerCase()
  if (v.includes(' s ') || v.includes('s box') || v.startsWith('s ') || v.endsWith(' s')) return 's'
  if (v.includes(' m ') || v.includes('m box') || v.startsWith('m ') || v.endsWith(' m')) return 'm'
  if (v.includes(' l ') || v.includes('l box') || v.startsWith('l ') || v.endsWith(' l')) return 'l'
  // ədəd yoxlamaq üçün
  if (v.includes('(4') || v.includes('(6') || v.includes('(8')) return 's'
  if (v.includes('(12') || v.includes('(16')) return 'm'
  if (v.includes('(18') || v.includes('(24')) return 'l'
  return null
}

function getRule(name) {
  const n = (name||'').toLowerCase()
  for (const r of BOX_RULES) {
    if (r.match.some(k => n.includes(k))) return r
  }
  return null
}

function calcUnits(name, variant, qty) {
  const rule = getRule(name)
  if (!rule) return null
  const size = getBoxSize(variant || name)
  if (!size) return null
  const base = rule[size]
  const bonus = size === 'l' ? rule.lbonus : 0
  return (base + bonus) * qty
}

function collectProductName(name) {
  // "Customized Box - Paxlava Mandeln" → "Paxlava Mandeln"
  return name.replace(/^customized box\s*[-–]\s*/i, '').trim()
}

// ── Ana komponent ─────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate]       = useState(today())

  function today() {
    return new Date().toISOString().slice(0,10)
  }

  useEffect(() => {
    fetch(`${API}/orders`).then(r=>r.json()).then(d=>{
      setOrders(Array.isArray(d)?d:[])
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  // Seçilən günün sifarişlərini süzgəcdən keçir
  const dayOrders = orders.filter(o => o.created_at === date)

  // Hər məhsul üçün: {name → {boxes: qty, units: count}}
  const stats = {}

  function addStat(rawName, variant, qty) {
    const name = collectProductName(rawName)
    if (!stats[name]) stats[name] = { boxes: 0, units: 0, unknown: 0 }
    stats[name].boxes += qty
    const u = calcUnits(name, variant, qty)
    if (u !== null) stats[name].units += u
    else stats[name].unknown += qty
  }

  dayOrders.forEach(o => {
    o.items?.forEach(item => {
      if (item.is_custom_box && item.box_contents?.length) {
        item.box_contents.forEach(c => addStat(c.name, '', c.quantity))
      } else {
        addStat(item.name, item.variant || '', item.quantity)
      }
    })
  })

  const entries = Object.entries(stats).sort((a,b) => b[1].units - a[1].units)

  const totalBoxes = entries.reduce((s,[,v]) => s+v.boxes, 0)
  const totalUnits = entries.reduce((s,[,v]) => s+v.units, 0)

  return (
    <>
      <div className="refresh-row">
        <h2>Günlük Statistika</h2>
        <input
          type="date"
          value={date}
          onChange={e=>setDate(e.target.value)}
          style={{
            background:'var(--surf2)',border:'1px solid var(--border)',
            color:'var(--text)',padding:'7px 12px',borderRadius:9,
            fontSize:13,fontFamily:'var(--mono)',outline:'none',cursor:'pointer'
          }}
        />
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"/></div>
      ) : !dayOrders.length ? (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <h3>{date} tarixli sifariş yoxdur</h3>
        </div>
      ) : (
        <>
          {/* Ümumi xülasə */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
            {[
              { label:'Sifariş', value: dayOrders.length, icon:'📦' },
              { label:'Qutu',    value: totalBoxes,        icon:'🗃' },
              { label:'Ədəd',    value: totalUnits,        icon:'🍬' },
            ].map(c => (
              <div key={c.label} style={{
                background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:12,padding:'16px 18px',textAlign:'center'
              }}>
                <div style={{fontSize:26,marginBottom:6}}>{c.icon}</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:'var(--mono)',color:'var(--accent)'}}>{c.value}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Məhsul cədvəli */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:13,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14,fontWeight:700}}>Məhsul Bölgüsü</span>
              <span style={{fontSize:12,color:'var(--muted)',marginLeft:'auto'}}>{date}</span>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'var(--surf2)'}}>
                  {['Məhsul','Qutu','Ədəd','Pay'].map(h => (
                    <th key={h} style={{
                      padding:'10px 18px',textAlign: h==='Məhsul'?'left':'right',
                      fontSize:11,fontWeight:700,color:'var(--muted)',
                      textTransform:'uppercase',letterSpacing:.5
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(([name, v]) => {
                  const pct = totalUnits ? Math.round(v.units/totalUnits*100) : 0
                  return (
                    <tr key={name} style={{borderTop:'1px solid var(--border)'}}>
                      <td style={{padding:'12px 18px'}}>
                        <div style={{fontSize:14,fontWeight:600}}>{name}</div>
                        {v.unknown > 0 && (
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                            ⚠ {v.unknown} qutu ölçüsü bilinmir
                          </div>
                        )}
                      </td>
                      <td style={{padding:'12px 18px',textAlign:'right',fontFamily:'var(--mono)',fontSize:14,color:'var(--muted)'}}>
                        {v.boxes}
                      </td>
                      <td style={{padding:'12px 18px',textAlign:'right'}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:700,color:'var(--accent)'}}>
                          {v.units}
                        </span>
                      </td>
                      <td style={{padding:'12px 18px',textAlign:'right',minWidth:100}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end'}}>
                          <div style={{width:60,height:6,background:'var(--surf3)',borderRadius:3,overflow:'hidden'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:'var(--accent)',borderRadius:3}}/>
                          </div>
                          <span style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--mono)',width:32,textAlign:'right'}}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{borderTop:'2px solid var(--border)',background:'var(--surf2)'}}>
                  <td style={{padding:'12px 18px',fontWeight:700,fontSize:14}}>Cəmi</td>
                  <td style={{padding:'12px 18px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:700}}>{totalBoxes}</td>
                  <td style={{padding:'12px 18px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,color:'var(--accent)',fontSize:16}}>{totalUnits}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  )
}
