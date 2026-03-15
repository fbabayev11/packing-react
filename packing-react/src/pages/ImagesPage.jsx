import { useState, useEffect, useRef } from 'react'
import { API } from '../config'

export default function ImagesPage({ productNames: propNames }) {
  const [imgs, setImgs]         = useState({})
  const [loading, setLoading]   = useState(true)
  const [pending, setPending]   = useState([])
  const [curIdx, setCurIdx]     = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [chipQ, setChipQ]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [localNames, setLocalNames] = useState([])
  const fileRef = useRef()
  const dropRef = useRef()

  // productNames - prop gəlirsə istifadə et, yoxsa sifarişlərdən topla
  const productNames = (propNames && propNames.length > 0) ? propNames : localNames

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/product-images`)
      if (r.ok) setImgs(await r.json())
    } catch {}
    // Sifarişlərdən məhsul adlarını topla
    try {
      const r = await fetch(`${API}/orders`)
      if (r.ok) {
        const orders = await r.json()
        const s = new Set()
        orders.forEach(o => o.items?.forEach(i => {
          if (i.is_custom_box) (i.box_contents||[]).forEach(c => { if(c.name) s.add(c.name) })
          else if (i.name) s.add(i.name)
        }))
        setLocalNames([...s].sort())
      }
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function handleFiles(files) {
    const arr = [...files]; const result = []
    let done = 0
    arr.forEach(f => {
      const r = new FileReader()
      r.onload = e => {
        result.push({ dataUrl: e.target.result, name: f.name.replace(/\.[^.]+$/, '') })
        if (++done === arr.length) { setPending(result); setCurIdx(0); setSelected(new Set()); setChipQ(''); setShowModal(true) }
      }
      r.readAsDataURL(f)
    })
  }

  function toggleChip(name) {
    setSelected(prev => { const n = new Set(prev); n.has(name)?n.delete(name):n.add(name); return n })
  }
  const visibleChips = chipQ ? productNames.filter(n=>n.toLowerCase().includes(chipQ.toLowerCase())) : productNames
  const allVis = visibleChips.length > 0 && visibleChips.every(n => selected.has(n))

  function toggleAll() {
    setSelected(prev => {
      const n = new Set(prev)
      if (allVis) visibleChips.forEach(x => n.delete(x))
      else visibleChips.forEach(x => n.add(x))
      return n
    })
  }

  async function saveCurrent() {
    const p = pending[curIdx]
    for (const name of selected) {
      await fetch(`${API}/product-images`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, data: p.dataUrl })
      })
    }
    nextImg()
  }

  function nextImg() {
    const next = curIdx + 1
    if (next >= pending.length) {
      setShowModal(false); setPending([]); fileRef.current && (fileRef.current.value=''); load()
    } else {
      setCurIdx(next); setSelected(new Set()); setChipQ('')
    }
  }

  async function del(name) {
    if (!confirm(`"${name}" silinsin?`)) return
    await fetch(`${API}/product-images?name=${encodeURIComponent(name)}`, { method:'DELETE' })
    setImgs(prev => { const n={...prev}; delete n[name]; return n })
  }

  async function edit(name) {
    if (!imgs[name]) return
    setPending([{ dataUrl: imgs[name], name }])
    setCurIdx(0); setSelected(new Set([name])); setChipQ(''); setShowModal(true)
  }

  const curP = pending[curIdx]

  return (
    <>
      <div className="refresh-row">
        <h2>Məhsul Şəkilləri</h2>
        <div style={{fontSize:13,color:'var(--muted)'}}>Bir şəkil bir neçə məhsula uyğunlaşır</div>
      </div>

      <div
        className="img-upload-area"
        ref={dropRef}
        onClick={() => fileRef.current?.click()}
        onDragOver={e=>{e.preventDefault();dropRef.current?.classList.add('drag')}}
        onDragLeave={()=>dropRef.current?.classList.remove('drag')}
        onDrop={e=>{e.preventDefault();dropRef.current?.classList.remove('drag');handleFiles(e.dataTransfer.files)}}
      >
        <div className="img-upload-icon">📂</div>
        <div className="img-upload-title">Şəkil yükləmək üçün bura bas və ya sürüklə</div>
        <div className="img-upload-sub">JPG, PNG, WEBP</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)} />
      </div>

      {showModal && curP && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <img src={curP.dataUrl} style={{width:64,height:64,objectFit:'cover',borderRadius:10,flexShrink:0}} />
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:800,marginBottom:3}}>Hansı məhsullara aid?</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Seçilənlərin hamısına bu şəkil təyin ediləcək</div>
            </div>
            <div style={{fontSize:13,color:'var(--accent)',fontWeight:700}}>{selected.size ? `${selected.size} seçilib` : ''}</div>
          </div>
          <div className="prod-chip-search">
            <span style={{color:'var(--muted)',fontSize:13}}>🔍</span>
            <input value={chipQ} onChange={e=>setChipQ(e.target.value)} placeholder="Məhsul axtar..." />
            <button onClick={toggleAll} style={{
              background:`rgba(${allVis?'248,113,113':'245,166,35'},.1)`,
              border:`1px solid rgba(${allVis?'248,113,113':'245,166,35'},.25)`,
              color:allVis?'var(--red)':'var(--accent)',fontSize:11,fontWeight:700,
              padding:'4px 10px',borderRadius:6,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'var(--sans)'
            }}>{allVis?'✕ Ləğv et':'✓ Hamısını seç'}</button>
          </div>
          <div className="prod-chip-list" style={{maxHeight:200}}>
            {visibleChips.map(n => (
              <div key={n} className={`prod-chip${selected.has(n)?' sel':''}`} onClick={()=>toggleChip(n)}>{n}</div>
            ))}
          </div>
          <div style={{display:'flex',gap:8,marginTop:16,paddingTop:14,borderTop:'1px solid var(--border)'}}>
            <button className="btn btn-primary btn-sm" onClick={saveCurrent}>✓ Yadda saxla</button>
            <button className="btn btn-ghost btn-sm" onClick={nextImg}>Növbəti →</button>
            <button className="btn btn-ghost btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setShowModal(false);setPending([])}}>Ləğv et</button>
          </div>
          {pending.length > 1 && (
            <div style={{fontSize:11,color:'var(--muted)',marginTop:8,textAlign:'center'}}>
              {curIdx+1} / {pending.length} şəkil
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !Object.keys(imgs).length ? (
        <div className="empty"><div className="empty-icon">🖼</div><h3>Hələ şəkil yoxdur</h3></div>
      ) : (
        <div className="img-grid">
          {Object.entries(imgs).map(([name, url]) => (
            <div key={name} className="img-card">
              <img src={url} loading="lazy" />
              <div className="img-card-body">
                <div className="img-card-name" title={name}>{name}</div>
                <div className="img-card-actions">
                  <button className="img-card-edit" onClick={()=>edit(name)}>✏ Redakt</button>
                  <button className="img-card-del" onClick={()=>del(name)}>🗑 Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
