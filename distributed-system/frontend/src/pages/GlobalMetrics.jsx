import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, XAxis, CartesianGrid } from 'recharts';
import { Users, AlertTriangle } from 'lucide-react';
import { getDomainMeta } from '../utils/domainMap';

const COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf', '#fbbf24', '#34d399'];

export default function GlobalMetrics() {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, clientsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/clients')
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (clientsRes.ok) setClients(await clientsRes.json());
      } catch (e) {}
    };
    fetchData();
    const int = setInterval(fetchData, 3000);
    return () => clearInterval(int);
  }, []);

  if (!stats || !clients) return <div style={{textAlign: 'center', color: '#94a3b8', marginTop: '100px', fontSize: '1.2rem', fontWeight: '500'}}>Loading Lab Overview...</div>;

  const activeStudentsCount = clients.filter(c => c.status === 'active').length;
  const attentionStudentsCount = clients.filter(c => c.suspicious_score > 10).length;

  const topSites = Object.entries(stats.domains)
    .map(([name, val]) => ({name: getDomainMeta(name).label, value: val}))
    .sort((a,b)=>b.value-a.value)
    .slice(0, 5);

  const trendData = [
    {time:'10:00', activity: 20}, {time:'10:05', activity: 45}, 
    {time:'10:10', activity: 30}, {time:'10:15', activity: 60}
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ maxWidth: '1200px', margin: '0 auto', color: '#f1f5f9', padding: '40px 20px' }}
    >
      <h2 style={{ fontSize: '2.4rem', marginBottom: '40px', fontWeight: '800', letterSpacing: '-0.025em' }}>Lab Overview Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '32px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px', borderRadius: '50%', backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <Users size={48} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Active Students</div>
            <div style={{ fontSize: '4rem', fontWeight: '800', color: '#f8fafc', lineHeight: 1 }}>{activeStudentsCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px', borderRadius: '50%', backgroundColor: attentionStudentsCount > 0 ? '#f59e0b15' : '#10b98115', color: attentionStudentsCount > 0 ? '#f59e0b' : '#10b981' }}>
            <AlertTriangle size={48} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Needs Attention</div>
            <div style={{ fontSize: '4rem', fontWeight: '800', color: attentionStudentsCount > 0 ? '#f59e0b' : '#10b981', lineHeight: 1 }}>{attentionStudentsCount}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '32px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 24px 0', borderBottom: '1px solid #334155', paddingBottom: '16px', fontSize: '1.2rem', fontWeight: '600' }}>Most Used Platforms</h3>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topSites} cx="50%" cy="50%" outerRadius={120} innerRadius={70} dataKey="value" labelLine={false}>
                  {topSites.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#f8fafc', fontWeight: '500' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 24px 0', borderBottom: '1px solid #334155', paddingBottom: '16px', fontSize: '1.2rem', fontWeight: '600' }}>Overall Class Engagement</h3>
          <div style={{ height: '320px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={trendData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                 <XAxis dataKey="time" stroke="#64748b" axisLine={false} tickLine={false} />
                 <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#34d399', fontWeight: '600' }} labelStyle={{ color: '#94a3b8' }} />
                 <Line type="basis" dataKey="activity" stroke="#10b981" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 7}} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
