import { useState, useEffect } from 'react'
import { API } from '../config'

const PRODUCTS = [
  // Paxlava
  { id:'badamli',   name:'Badamlı Paxlava',       cat:'paxlava' },
  { id:'coconut',   name:'Coconut Paxlava',        cat:'paxlava' },
  { id:'shokolad',  name:'Şokolad Paxlava',        cat:'paxlava' },
  { id:'irevan',    name:'İrəvan Kətəsi',           cat:'paxlava' },
  { id:'irevanqoz', name:'İrəvan Kətəsi Qozlu',    cat:'paxlava' },
  { id:'mix',       name:'Paxlava-Şəkərbura Mix',  cat:'paxlava' },
  // Şəkərbura
  { id:'sekerbura', name:'Şəkərbura',              cat:'sekerbura' },
  // Badambura
  { id:'badambura', name:'Badambura',              cat:'badambura' },
  { id:'qarabag',   name:'Qarabağ Kətəsi',         cat:'badambura' },
  // Qoğal
  { id:'sirin',     name:'Şirin Qoğal',            cat:'qogal' },
  { id:'savory',    name:'Şor Qoğal',              cat:'qogal' },
]

const CAT_LABELS = { paxlava:'🍯 Paxlava', sekerbura:'🌙 Şəkərbura', badambura:'🥐 Badambura', qogal:'🍩 Qoğal' }
const STORAGE_KEY = 'manual_orders_v1'

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6) }
function todayStr() { return new Date().toISOString().slice(0,10) }

export default function ManualOrdersPage() {
  const [orders, setOrders]   = useState(loadLocal)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]   = useState(null)

  // Form state
  const [customer, setCustomer] = useState('')
  const [phone, setPhone]       = useState('')
  const [note, setNote]         = useState('')
  const [items, setItems]       = useState({}) // productId → qty
  const [tab, setTab]           = useState('active')

  useEffect(() => saveLocal(orders), [orders])

  function openNew() {
    setEditId(null); setCustomer(''); setPhone(''); setNote(''); setItems({})
    setShowForm(true)
  }

  function openEdit(o) {
    setEditId(o.id); setCustomer(o.customer||''); setPhone(o.phone||'')
    setNote(o.note||'')
    const its = {}
    o.items.forEach(i => { its[i.id] = i.qty })
    setItems(its); setShowForm(true)
  }

  function setQty(id, val) {
    const n = parseInt(val) || 0
    setItems(prev => ({ ...prev, [id]: n > 0 ? n : undefined }))
  }

  function save() {
    const orderItems = PRODUCTS
      .filter(p => items[p.id] > 0)
      .map(p => ({ id: p.id, name: p.name, qty: items[p.id] }))
    if (!customer.trim() && !orderItems.length) return

    const order = {
      id: editId || newId(),
      customer: customer.trim(),
      phone: phone.trim(),
      note: note.trim(),
      items: orderItems,
      date: todayStr(),
      archived: false,
      source: 'whatsapp',
    }

    if (editId) {
      setOrders(prev => prev.map(o => o.id === editId ? order : o))
    } else {
      setOrders(prev => [order, ...prev])
    }
    setShowForm(false)
  }

  function archive(id) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, archived: true } : o))
  }

  function deleteOrder(id) {
    if (!confirm('Silinsin?')) return
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  function restore(id) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, archived: false } : o))
  }

  const active   = orders.filter(o => !o.archived)
  const archived = orders.filter(o =>  o.archived)
  const shown    = tab === 'active' ? active : archived

  const totalItems = (o) => o.items.reduce((s,i)=>s+i.qty,0)

  const cats = [...new Set(PRODUCTS.map(p=>p.cat))]

  return (
    <>
      <div className="refresh-row">
        <h2>💬 WhatsApp Sifarişlər</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Yeni Sifariş</button>
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:4,marginBottom:14}}>
        {[
          {id:'active',  label:`Aktiv (${active.length})`},
          {id:'archive', label:`Arxiv (${archived.length})`},
        ].map(t=>(
          <button key={t.id} className={`tab${tab===t.id?' active':''}`}
            style={{borderBottom:'2px solid',borderColor:tab===t.id?'var(--accent)':'transparent'}}
            onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,
            padding:24,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h3 style={{fontSize:16,fontWeight:800}}>{editId ? 'Sifarişi Redaktə Et' : 'Yeni Sifariş'}</h3>
              <button className="clear-btn" style={{fontSize:18}} onClick={()=>setShowForm(false)}>✕</button>
            </div>

            {/* Müştəri */}
            <div className="field">
              <label>Ad</label>
              <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Müştəri adı" />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+49 xxx xxx xx xx" />
            </div>

            {/* Məhsullar */}
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>
              Məhsullar
            </div>
            {cats.map(cat => (
              <div key={cat} style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:6}}>
                  {CAT_LABELS[cat]}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {PRODUCTS.filter(p=>p.cat===cat).map(p=>(
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,
                      padding:'8px 12px',borderRadius:9,background:'var(--surf2)'}}>
                      <span style={{flex:1,fontSize:13,fontWeight:600}}>{p.name}</span>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <button onClick={()=>setQty(p.id,(items[p.id]||0)-1)}
                          style={{width:28,height:28,borderRadius:7,border:'1px solid var(--border)',
                            background:'var(--surf3)',color:'var(--text)',cursor:'pointer',fontSize:16,
                            display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                        <span style={{minWidth:24,textAlign:'center',fontFamily:'var(--mono)',
                          fontSize:15,fontWeight:700,color:items[p.id]>0?'var(--accent)':'var(--muted)'}}>
                          {items[p.id]||0}
                        </span>
                        <button onClick={()=>setQty(p.id,(items[p.id]||0)+1)}
                          style={{width:28,height:28,borderRadius:7,border:'1px solid var(--border)',
                            background:'var(--surf3)',color:'var(--text)',cursor:'pointer',fontSize:16,
                            display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="field" style={{marginTop:4}}>
              <label>Qeyd</label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Çatdırılma, ünvan və s." />
            </div>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="btn btn-primary" onClick={save} style={{flex:1}}>
                {editId ? 'Yadda saxla' : '+ Əlavə et'}
              </button>
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)}>Ləğv et</button>
            </div>
          </div>
        </div>
      )}

      {/* Sifariş kartları */}
      {!shown.length ? (
        <div className="empty">
          <div className="empty-icon">💬</div>
          <h3>{tab==='active'?'Aktiv sifariş yoxdur':'Arxiv boşdur'}</h3>
        </div>
      ) : (
        <div className="orders-grid">
          {shown.map(o => (
            <div key={o.id} className="order-card" style={{opacity:o.archived?.5:1}}>
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#25d366',flexShrink:0,
                  boxShadow:'0 0 6px rgba(37,211,102,.6)'}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700}}>{o.customer || 'Müştəri'}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                    {o.phone && <span style={{marginRight:8}}>📞 {o.phone}</span>}
                    {o.date}
                  </div>
                </div>
                <div className="order-count">{totalItems(o)} əd.</div>
                <div style={{display:'flex',gap:6}}>
                  {!o.archived && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(o)}>✏</button>
                      <button className="btn btn-green btn-sm" onClick={()=>archive(o.id)}>✓</button>
                    </>
                  )}
                  {o.archived && (
                    <button className="btn btn-ghost btn-sm" onClick={()=>restore(o.id)}>↩</button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}}
                    onClick={()=>deleteOrder(o.id)}>🗑</button>
                </div>
              </div>

              {/* Məhsullar */}
              <div style={{padding:'0 18px 14px',borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                  {o.items.map(i=>(
                    <div key={i.id} style={{display:'flex',alignItems:'center',gap:6,
                      padding:'5px 12px',borderRadius:20,background:'var(--surf2)',
                      border:'1px solid var(--border)'}}>
                      <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--accent)',fontSize:14}}>
                        {i.qty}×
                      </span>
                      <span style={{fontSize:13,fontWeight:600}}>{i.name}</span>
                    </div>
                  ))}
                </div>
                {o.note && (
                  <div className="order-note" style={{marginTop:10}}>📝 {o.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
