const MANUAL_KEY = 'manual_orders_v1'
function loadManual() {
  try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]') } catch { return [] }
}
function saveManual(data) { localStorage.setItem(MANUAL_KEY, JSON.stringify(data)) }

export default function ManualOrderCard({ order: o, onRefresh }) {
  function archive() {
    const all = loadManual().map(x => x.id === o.id ? { ...x, archived: true } : x)
    saveManual(all); onRefresh()
  }

  const totalItems = o.items.reduce((s,i)=>s+i.qty,0)

  return (
    <div className="order-card" style={{borderColor:'rgba(37,211,102,.25)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600,color:'#25d366',minWidth:44}}>
          {o.orderNum||'M—'}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:8}}>
            {o.customer||'Müştəri'}
            <span style={{fontSize:11,padding:'2px 7px',borderRadius:10,background:'rgba(37,211,102,.12)',
              color:'#25d366',border:'1px solid rgba(37,211,102,.25)',fontWeight:600}}>WA</span>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
            {o.phone && <span style={{marginRight:8}}>📞 {o.phone}</span>}
            {o.date}
          </div>
        </div>
        <div className="order-count">📦 {totalItems} əd.</div>
      </div>

      <div style={{padding:'0 18px 14px',borderTop:'1px solid var(--border)'}}>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
          {o.items.map(i=>(
            <div key={i.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',
              borderRadius:20,background:'var(--surf2)',border:'1px solid var(--border)'}}>
              <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--accent)',fontSize:14}}>{i.qty}×</span>
              <span style={{fontSize:13,fontWeight:600}}>{i.name}</span>
            </div>
          ))}
        </div>
        {o.note && <div className="order-note" style={{marginTop:10}}>📝 {o.note}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
          <button className="btn btn-green btn-sm" onClick={archive}>✓ Qablaşdırıldı, Arxivlə</button>
        </div>
      </div>
    </div>
  )
}
