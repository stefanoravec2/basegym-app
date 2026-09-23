export default function Info() {
  return (
    <div>
      <h2 className="display" style={{ fontSize: '22px', color: 'var(--green-dark)', marginBottom: '16px' }}>Informácie</h2>

      <div className="card" style={{ padding: '20px', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Cenník permanentiek</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { name: 'Gold', desc: 'neobmedzený počet tréningov', price: '80 €/mesiac', color: '#F4A81E' },
            { name: 'Silver', desc: '12 kreditov', price: '70 €/mesiac', color: '#9CA3AF' },
            { name: 'Basic kurz', desc: '8 kreditov', price: '80 €/mesiac', color: '#6FCF97' },
            { name: 'Jednorázový vstup', desc: '1 kredit', price: '12 €', color: 'var(--green)' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div style={{ width: '8px', height: '38px', borderRadius: '4px', background: p.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{p.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{p.desc}</div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--green-dark)', whiteSpace: 'nowrap' }}>{p.price}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Pravidlá prihlasovania</h3>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          Na tréning sa prihlás vopred cez appku. Jeden tréning stojí 1 kredit.<br/><br/>
          Odhlásiť sa je možné <b style={{ color: 'var(--text)' }}>najneskôr 30 minút</b> pred začiatkom tréningu — inak kredit prepadáva.<br/><br/>
          Kapacita je obmedzená. Ak je tréning plný, sleduj voľné miesta — keď sa niekto odhlási, miesto sa uvoľní.
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Otváracie hodiny</h3>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          Pondelok – Piatok: podľa rozvrhu tréningov<br/>
          Sobota – Nedeľa: podľa rozvrhu tréningov<br/><br/>
          Aktuálne termíny vždy vidíš v záložke Rezervácie.
        </div>
      </div>
    </div>
  )
}
