import { useState, useEffect, useRef } from 'react'
import { API } from '../config'

export default function ImagesPage() {
  const [imgs, setImgs]           = useState({})
  const [productNames, setProductNames] = useState([])
  const [loadingPage, setLoadingPage]   = useState(true)
  const [pending, setPending]     = useState([])
  const [curIdx, setCurIdx]       = useState(0)
  const [selected, setSelected]   = useState(new Set())
  const [chipQ, setChipQ]         = useState('')
  const [showModal, setShowModal] = useState(false)
  const fileRef = useRef()
  const dropRef = useRef()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoadingPage(true)
    await Promise.all([loadImgs(), loadNames()])
    setLoadingPage(false)
  }

  async function loadImgs() {
    try {
      const r = await fetch(`${API}/product-images`)
      if (r.ok) setImgs(await r.json())
    } catch {}
  }

  async function loadNames() {
    try {
      const r = await fetch(`${API}/orders`)
      if (!r.ok) return
      const orders = await r.json()
      const s = new Set()
      orders.forEach(o => o.items?.forEach(i => {
        if (i.is_custom_box) (i.box_contents||[]).forEach(c => { if(c.name) s.add(c.name) })
        else if (i.name) s.add(i.name)
      }))
      setProductNames([...s].sort())
    } catch {}
  }

  // Şəkil seçim
  function handleFiles(files) {
    const arr = [...files]
    const result = []
    let done = 0
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => {
        result.push({ dataUrl: e.target.result })
        if (++done === arr.length) {
          setPending(result)
          setCurIdx(0)
          setSelected(new Set())
          setChipQ('')
          setShowModal(true)
        }
      }
      reader.readAsDataURL(f)
    })
  }

  // Chip seçim
  const visibleChips = chipQ.trim()
    ? productNames.filter(n => n.toLowerCase().includes(chipQ.toLowerCase()))
    : productNames

  const allVis = visibleChips.length > 0 && visibleChips.every(n => selected.has(n))

  function toggleChip(name) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allVis) visibleChips.forEach(n => next.delete(n))
      else visibleChips.forEach(n => next.add(n))
      return next
    })
  }

  // Saxla
  async function saveCurrent() {
    const p = pending[curIdx]
    for (const name of selected) {
      await fetch(`${API}/product-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data: p.dataUrl })
      })
    }
    goNext()
  }

  function goNext() {
    const next = curIdx + 1
    if (next >= pending.length) {
      setShowModal(false)
      setPending([])
      if (fileRef.current) fileRef.current.value = ''
      loadImgs()
    } else {
      setCurIdx(next)
      setSelected(new Set())
      setChipQ('')
    }
  }

  // Redakt
  async function edit(name) {
    if (!imgs[name]) return
    setPending([{ dataUrl: imgs[name] }])
    setCurIdx(0)
    setSelected(new Set([name]))
    setChipQ('')
    setShowModal(true)
  }

  // Sil
  async function del(name) {
    if (!confirm(`"${name}" silinsin?`)) return
    await fetch(`${API}/product-images?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    setImgs(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const curP = pending[curIdx]

  return (
    <>
      <div className="refresh-row">
        <h2>Məhsul Şəkilləri</h2>
        <button className="btn btn-ghost btn-sm" onClick={loadAll}>↻ Yenilə</button>
      </div>

      {/* Yükləmə sahəsi */}
      <div
        className="img-upload-area"
        ref={dropRef}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('drag') }}
        onDragLeave={() => dropRef.current?.classList.remove('drag')}
        onDrop={e => { e.preventDefault(); dropRef.current?.classList.remove('drag'); handleFiles(e.dataTransfer.files) }}
      >
        <div className="img-upload-icon">📂</div>
        <div className="img-upload-title">Şəkil yükləmək üçün bura bas və ya sürüklə</div>
        <div className="img-upload-sub">JPG, PNG, WEBP — bir neçəsini birdən seçmək olar</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Modal */}
      {showModal && curP && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
          zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#181818', border: '1px solid #333', borderRadius: 16,
            padding: 20, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto'
          }}>
            {/* Başlıq */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <img src={curP.dataUrl} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Hansı məhsullara aid?</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Seçilənlərin hamısına bu şəkil veriləcək</div>
              </div>
              {selected.size > 0 && (
                <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {selected.size} seçilib
                </div>
              )}
            </div>

            {/* Axtarış */}
            <div className="prod-chip-search" style={{ marginBottom: 8 }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>🔍</span>
              <input
                value={chipQ}
                onChange={e => setChipQ(e.target.value)}
                placeholder="Məhsul axtar... (məs: paxlava)"
                autoFocus
              />
              {visibleChips.length > 1 && (
                <button onClick={toggleAll} style={{
                  background: `rgba(${allVis ? '248,113,113' : '245,166,35'},.12)`,
                  border: `1px solid rgba(${allVis ? '248,113,113' : '245,166,35'},.3)`,
                  color: allVis ? 'var(--red)' : 'var(--accent)',
                  fontSize: 11, fontWeight: 700, padding: '4px 10px',
                  borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--sans)'
                }}>
                  {allVis ? '✕ Ləğv et' : `✓ Hamısını seç (${visibleChips.length})`}
                </button>
              )}
            </div>

            {/* Chip siyahısı */}
            {loadingPage ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                Məhsullar yüklənir...
              </div>
            ) : productNames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
                ⚠ Sifarişlərdən məhsul adı tapılmadı.<br />
                Əvvəlcə Sifarişlər tabına keç, sonra qayıt.
              </div>
            ) : visibleChips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--muted)', fontSize: 13 }}>
                "{chipQ}" adında məhsul tapılmadı
              </div>
            ) : (
              <div className="prod-chip-list" style={{ maxHeight: 220, marginBottom: 4 }}>
                {visibleChips.map(n => (
                  <div
                    key={n}
                    className={`prod-chip${selected.has(n) ? ' sel' : ''}`}
                    onClick={() => toggleChip(n)}
                  >
                    {n}
                  </div>
                ))}
              </div>
            )}

            {/* Düymələr */}
            <div style={{
              display: 'flex', gap: 8, marginTop: 14,
              paddingTop: 14, borderTop: '1px solid var(--border)'
            }}>
              <button className="btn btn-primary btn-sm" onClick={saveCurrent}
                disabled={selected.size === 0}
                style={{ opacity: selected.size === 0 ? .5 : 1 }}>
                ✓ Yadda saxla
              </button>
              <button className="btn btn-ghost btn-sm" onClick={goNext}>Keç →</button>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}
                onClick={() => { setShowModal(false); setPending([]) }}>
                Ləğv et
              </button>
            </div>

            {pending.length > 1 && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                {curIdx + 1} / {pending.length} şəkil
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mövcud şəkillər */}
      {loadingPage ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !Object.keys(imgs).length ? (
        <div className="empty">
          <div className="empty-icon">🖼</div>
          <h3>Hələ şəkil yoxdur</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Yuxarıdan şəkil yüklə</p>
        </div>
      ) : (
        <div className="img-grid">
          {Object.entries(imgs).map(([name, url]) => (
            <div key={name} className="img-card">
              <img src={url} loading="lazy" alt={name} />
              <div className="img-card-body">
                <div className="img-card-name" title={name}>{name}</div>
                <div className="img-card-actions">
                  <button className="img-card-edit" onClick={() => edit(name)}>✏ Redakt</button>
                  <button className="img-card-del" onClick={() => del(name)}>🗑 Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
