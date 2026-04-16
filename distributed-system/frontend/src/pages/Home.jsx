import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ClientCard from '../components/ClientCard';

export default function Home() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('http://localhost:54698/clients');
        if (res.ok) setClients(await res.json());
      } catch (e) {}
    };
    fetchClients();
    const int = setInterval(fetchClients, 3000);
    return () => clearInterval(int);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}
    >
      <h2 style={{ fontSize: '2.4rem', marginBottom: '40px', color: '#f1f5f9', fontWeight: '800', letterSpacing: '-0.025em' }}>Lab Monitor Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
        {clients.length === 0 ? <p style={{color: '#64748b', fontSize: '1.2rem', fontWeight: '500'}}>Connecting to lab network...</p> : 
          clients.map(c => <ClientCard key={c.machine_id} client={c} />)
        }
      </div>
    </motion.div>
  );
}
