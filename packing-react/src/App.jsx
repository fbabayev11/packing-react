import { useState, useEffect, useMemo } from 'react'
import { API } from './config'
import ConfigPage from './pages/ConfigPage'
import OrdersPage from './pages/OrdersPage'
import ArchivePage from './pages/ArchivePage'
import ImagesPage from './pages/ImagesPage'
import StatsPage from './pages/StatsPage'
import ManualOrdersPage from './pages/ManualOrdersPage'

const TABS = [
  { id:'orders',  label:'Sifarişlər',        icon:'📦' },
  { id:'manual',  label:'Manual Sifarişlər', icon:'💬' },
  { id:'stats',   label:'Statistika',        icon:'📊' },
  { id:'images',  label:'Şəkillər',          icon:'🖼' },
  { id:'settings',label:'API Key',           icon:'🔑' },
]

export default function App() {
  const [tab, setTab]           = useState('orders')
  const [shopName, setShopName] = useState('')
  const [configured, setConfigured] = useState(null)
  const [orders, setOrders]     = useState([])

  useEffect(() => {
    fetch(`${API}/config`).then(r=>r.json()).then(d=>{
      setConfigured(d.configured)
      if (d.configured) setShopName(d.shop_name || d.shop)
    }).catch(()=>setConfigured(false))
  }, [])

  const productNames = useMemo(() => {
    const s = new Set()
    orders.forEach(o => o.items?.forEach(i => {
      if (i.is_custom_box) (i.box_contents||[]).forEach(c => { if(c.name) s.add(c.name) })
      else if (i.name) s.add(i.name)
    }))
    return [...s].sort()
  }, [orders])

  if (configured === null) return (
    <div className="loading" style={{paddingTop:120}}>
      <div className="spinner" />
    </div>
  )

  if (!configured && tab !== 'settings') return (
    <AppShell tab={tab} setTab={setTab} shopName={shopName}>
      <ConfigPage onSave={name => { setShopName(name); setConfigured(true) }} />
    </AppShell>
  )

  return (
    <AppShell tab={tab} setTab={setTab} shopName={shopName}>
      {tab === 'orders'   && <OrdersPage />}
      {tab === 'manual'   && <ManualOrdersPage />}
      {tab === 'stats'    && <StatsPage />}
      {tab === 'images'   && <ImagesPage productNames={productNames} />}
      {tab === 'settings' && (
        <ConfigPage onSave={name => { setShopName(name); setConfigured(true); setTab('orders') }} />
      )}
    </AppShell>
  )
}

function AppShell({ tab, setTab, shopName, children }) {
  return (
    <>
      <header>
        <div className="logo">
          <div className="logo-icon">📦</div>
          <span className="logo-text">Qablaşdırma</span>
        </div>
        {/* Profil placeholder */}
        <div onClick={() => {}} style={{
          width:36, height:36, borderRadius:'50%',
          background:'linear-gradient(135deg,#f5a623,#e8965a)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:16, cursor:'pointer', flexShrink:0,
          border:'2px solid rgba(245,166,35,.3)',
        }} title="Profil (tezliklə)">
          👤
        </div>
      </header>

      {/* Tabs - aşağıda mobil nav */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <main>{children}</main>
    </>
  )
}
