import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDomainMeta } from '../utils/domainMap';

export default function ClientCard({ client }) {
  const navigate = useNavigate();
  
  const isSuspicious = client.suspicious_score > 30;
  const needsAttention = client.suspicious_score > 10 && client.suspicious_score <= 30;
  const isOffline = (Date.now() / 1000 - client.last_seen) > 60;
  
  let statusColor = "#22c55e"; // Green
  let statusText = "Normal";
  
  if (isOffline) {
    statusColor = "#6b7280"; // Gray
    statusText = "Offline";
  } else if (isSuspicious) {
    statusColor = "#ef4444"; // Red
    statusText = "Suspicious";
  } else if (needsAttention) {
    statusColor = "#f59e0b"; // Yellow
    statusText = "Needs Attention";
  }

  const lastEventDomain = client.latest_activity || "";
  const { label: activityLabel, icon: ActivityIcon } = getDomainMeta(lastEventDomain);

  return (
    <motion.div 
      whileHover={{ y: -4, boxShadow: `0px 12px 24px -8px ${statusColor}40` }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="cursor-pointer bg-[#1e293b] rounded-2xl text-slate-50 border border-slate-700 relative overflow-hidden"
      onClick={() => navigate(`/client/${client.machine_id}`)}
      style={{
        padding: '24px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        borderTop: `4px solid ${statusColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: '700' }}>
          <Monitor size={22} style={{ color: '#94a3b8' }} />
          {client.machine_id}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px', borderRadius: '20px', backgroundColor: `${statusColor}15`, color: statusColor }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
          {statusText}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <ActivityIcon size={20} />
          </div>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Current Activity</span>
            <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '1.1rem' }}>{lastEventDomain ? activityLabel : "Idle"}</span>
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <Clock size={16} style={{ color: '#64748b' }} />
            <span>{new Date(client.last_seen * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} style={{ color: isSuspicious ? "#ef4444" : (needsAttention ? "#f59e0b" : "#64748b") }} />
            <span style={{ fontWeight: '600', color: isSuspicious ? "#ef4444" : (needsAttention ? "#f59e0b" : "#94a3b8") }}>{client.suspicious_score}% Risk</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
