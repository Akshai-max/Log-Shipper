import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { User, ShieldCheck, Activity, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import TreeView from '../components/TreeView';
import { getDomainMeta } from '../utils/domainMap';

const COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf', '#fbbf24', '#34d399'];

const formatName = (email) => {
  if (!email || email === 'unknown') return null;
  const local = email.split('@')[0].replace(/[._-]/g, ' ').replace(/[0-9]/g, '');
  return local.split(' ').filter(w => w).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || email;
};

export default function ClientDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`http://localhost:54698/client/${id}`);
        if(res.ok) setData(await res.json());
      } catch (e) {}
    };
    fetchDetail();
    const int = setInterval(fetchDetail, 3000);
    return () => clearInterval(int);
  }, [id]);

  if (!data) return <div style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8', fontSize: '1.2rem', fontWeight: '500'}}>Connecting to student monitor...</div>;

  const isSuspicious = data.alerts.length > 0;
  const latestDomain = data.activity_timeline.length > 0 ? data.activity_timeline[data.activity_timeline.length - 1].domain : "Unknown";
  
  const timeData = Object.entries(data.domains).map(([name, stats]) => ({ name, value: stats.time_spent })).filter(d => d.value > 0);
  const switchData = Object.entries(data.domains).map(([name, stats]) => ({ name, switches: stats.tab_switch_count })).filter(d => d.switches > 0);

  const insights = [];
  if (switchData.reduce((acc, curr) => acc + curr.switches, 0) > 30) {
    insights.push("Student is frequently switching between websites.");
  }
  if (timeData.length > 0) {
    const topSite = [...timeData].sort((a,b) => b.value - a.value)[0].name;
    const { label } = getDomainMeta(topSite);
    insights.push(`Most of their time is spent on ${label}.`);
  }
  if (data.activity_timeline.length < 5) {
    insights.push("Low activity detected recently.");
  } else {
    insights.push("Normal consistent activity.");
  }

  const { label: latestLabel, icon: LatestIcon } = getDomainMeta(latestDomain);
  const fakeTree = { [id]: { domains: data.domains, alerts: data.alerts } };
  const displayName = data.user_name && data.user_name !== "Unknown User" ? data.user_name : formatName(data.user);
  
  const riskFactors = data.risk_factors || [];

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ maxWidth: '1200px', margin: '0 auto', color: '#f1f5f9', padding: '40px 20px' }}
    >
      <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px', fontWeight: '600', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
        ← Back to Overview
      </Link>
      
      {/* SECTION 1: TOP PANEL */}
      <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: isSuspicious ? '8px solid #ef4444' : '8px solid #10b981', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2.4rem', display: 'flex', alignItems: 'center', gap: '16px', fontWeight: '800', letterSpacing: '-0.025em' }}>
            <User size={36} className="text-slate-400" /> 
            {displayName ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{displayName}</span>
                <span style={{ fontSize: '1rem', color: '#64748b', fontFamily: 'monospace' }}>Device ID: {data.device_id || id.substring(0, 12) + '...'}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>Client Detail</span>
                <span style={{ fontSize: '1rem', color: '#64748b', fontFamily: 'monospace' }}>Device ID: {data.device_id || id.substring(0, 12)}</span>
              </div>
            )}
          </h2>
          <div style={{ marginTop: '16px', fontSize: '1.2rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', backgroundColor: '#3b82f622', borderRadius: '8px', color: '#3b82f6' }}>
              <LatestIcon size={20} />
            </div>
            <span>Currently working on: <strong style={{ color: '#f8fafc' }}>{latestLabel}</strong></span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '30px', backgroundColor: isSuspicious ? '#7f1d1d' : '#064e3b', color: isSuspicious ? '#fca5a5' : '#6ee7b7', fontWeight: '700', fontSize: '1.1rem', letterSpacing: '0.025em' }}>
             <ShieldCheck size={24} /> {isSuspicious ? 'Suspicious Behavior' : 'Normal Operations'}
          </div>
        </div>
      </div>

      {/* SECTION 2: CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '32px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 24px 0', borderBottom: '1px solid #334155', paddingBottom: '16px', fontSize: '1.2rem', fontWeight: '600' }}>Where time was spent</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={timeData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} dataKey="value" labelLine={false}>
                  {timeData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#f8fafc', fontWeight: '500' }} formatter={(value, name) => [formatDuration(value), getDomainMeta(name).label]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 24px 0', borderBottom: '1px solid #334155', paddingBottom: '16px', fontSize: '1.2rem', fontWeight: '600' }}>Platform Switching Frequency</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={switchData}>
                <XAxis dataKey="name" stroke="#64748b" tickFormatter={(name) => getDomainMeta(name).label.substring(0,10)} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#60a5fa', fontWeight: '600' }} labelStyle={{ color: '#94a3b8' }} labelFormatter={(label) => getDomainMeta(label).label} />
                <Bar dataKey="switches" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: RISK ASSESSMENT */}
      <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 24px 0', borderBottom: '1px solid #334155', paddingBottom: '16px', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={22} className={isSuspicious ? "text-red-400" : "text-green-400"} /> 
          Suspicious Activity Summary
        </h3>
        {riskFactors.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {riskFactors.map((factor, i) => (
              <div key={i} style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#ef444410', border: '1px solid #ef444433', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <span style={{ fontWeight: '500' }}>{factor}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No significant risk factors detected for this device. Interaction appears normal.</p>
        )}
      </div>

      {/* SECTION 4: TIMELINE AND TREE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '32px', marginBottom: '32px' }}>
        <TreeView treeData={fakeTree} />
        
        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={22} className="text-blue-400"/> Recent Activity Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '420px', paddingRight: '8px' }}>
            {[...data.activity_timeline].reverse().map((evt, i) => {
              const { label, icon: EvtIcon } = getDomainMeta(evt.domain);
              const isSwitch = evt.event === 'tab_switch';
              return (
              <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '16px', borderRadius: '12px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: isSwitch ? '#3b82f615' : '#10b98115', color: isSwitch ? '#3b82f6' : '#10b981' }}>
                  <EvtIcon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#f8fafc' }}>{label}</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{new Date(evt.time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
                    {isSwitch ? 'Moved focus to this platform' : 'Actively working'}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
