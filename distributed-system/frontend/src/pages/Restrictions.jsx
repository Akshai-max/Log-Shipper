import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Plus, Globe, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function Restrictions() {
  const [restrictions, setRestrictions] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:54698';

  const fetchRestrictions = async () => {
    try {
      const res = await fetch(`${API_BASE}/restrictions`);
      if (res.ok) setRestrictions(await res.json());
      setError(null);
    } catch (e) {
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    let domain = newDomain.toLowerCase().trim();
    if (!domain) return;
    
    // Quick normalization: remove protocols and paths
    if (domain.includes('://')) domain = domain.split('://')[1];
    if (domain.includes('/')) domain = domain.split('/')[0];
    if (domain.startsWith('www.')) domain = domain.substring(4);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/restrictions/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data.restricted_domains);
        setNewDomain('');
      }
    } catch (e) {
      setError("Failed to add restriction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (domain) => {
    try {
      const res = await fetch(`${API_BASE}/restrictions/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data.restricted_domains);
      }
    } catch (e) {
      setError("Failed to remove restriction.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ padding: '12px', backgroundColor: '#ef444422', borderRadius: '14px', color: '#ef4444' }}>
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#f8fafc', fontWeight: '800', letterSpacing: '-0.025em' }}>Access Control</h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '1.1rem' }}>Restrict websites and their subdomains across the lab.</p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#ef444415', border: '1px solid #ef444433', padding: '16px', borderRadius: '12px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <AlertCircle size={20} />
            {error}
        </div>
      )}

      <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '20px', border: '1px solid #334155', marginBottom: '32px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Globe size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="e.g., youtube.com" 
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 48px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            disabled={submitting}
            type="submit" 
            style={{ padding: '0 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'filter 0.2s' }}
            onMouseEnter={(e) => e.target.style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            Restricted Website
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Active Restrictions ({restrictions.length})</h3>
        
        {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} /></div>
        ) : (
            <AnimatePresence>
                {restrictions.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed #334155', borderRadius: '20px', color: '#64748b' }}>
                        No domains are currently restricted.
                    </div>
                ) : (
                    restrictions.map((domain) => (
                        <motion.div 
                            key={domain}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: '16px 24px', borderRadius: '14px', border: '1px solid #334155' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f1f5f9' }}>{domain}</span>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', backgroundColor: '#0f172a', padding: '4px 10px', borderRadius: '6px' }}>+ all subdomains</span>
                            </div>
                            <button 
                                onClick={() => handleRemove(domain)}
                                style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                            >
                                <Trash2 size={20} />
                            </button>
                        </motion.div>
                    ))
                )}
            </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
