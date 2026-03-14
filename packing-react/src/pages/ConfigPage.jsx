import { useState } from 'react'
import { API } from '../config'

export default function ConfigPage({ onSave }) {
  const [shop, setShop]   = useState('')
  const [token, setToken] = useState('')
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!shop || !token) { setErr('Hər iki sahəni doldurun'); return }
    setErr(''); setLoading(true)
    try {
      const r = await fetch(`${API}/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, token })
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.detail || 'Xəta'); return }
      onSave(d.shop_name || shop)
    } catch {
      setErr('Backend cavab vermir')
    } finally { setLoading(false) }
  }

  return (
    <div className="config-panel">
      <h2>🔑 Shopify Bağlantısı</h2>
      <p>Mağazanızı bir dəfə qoşun, sifarişlər avtomatik gəlsin.</p>
      <div className="field">
        <label>Shop URL</label>
        <input value={shop} onChange={e=>setShop(e.target.value)} placeholder="sirinnur.myshopify.com" />
      </div>
      <div className="field">
        <label>Admin API Access Token</label>
        <input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="shpat_xxxxxxxxxxxxx" />
        <div className="hint">Shopify Admin → Settings → Apps → Develop apps<br/>API scopes: <code>read_orders</code></div>
      </div>
      {err && <div className="error-bar">{err}</div>}
      <div style={{display:'flex',gap:10,marginTop:8}}>
        <button className="btn btn-primary" onClick={save} disabled={loading}>
          {loading ? 'Yoxlanır...' : 'Qoş'}
        </button>
      </div>
    </div>
  )
}
