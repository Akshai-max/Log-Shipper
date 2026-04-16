import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Monitor, Clock, LogIn } from 'lucide-react';
import { getDomainMeta } from '../utils/domainMap';

function TreeNode({ name, data, level = 0, isRoot = false }) {
  const [isOpen, setIsOpen] = useState(level === 0 || isRoot);

  const isLeaf = typeof data !== 'object' || data === null || !isNaN(data);

  if (isLeaf) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0', paddingLeft: `${(level + 1) * 20}px`, fontSize: '0.9rem', color: '#cbd5e1' }}>
        <Clock size={14} style={{ marginRight: '8px', color: '#10b981' }} />
        <span style={{ color: '#94a3b8', marginRight: '8px' }}>{name}:</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f8fafc' }}>{data}</span>
      </div>
    );
  }

  // Determine if it's a domain level node
  const isDomainNode = level === 1;
  const { label: domainLabel, icon: DomainIcon } = isDomainNode ? getDomainMeta(name) : { label: name, icon: null };

  return (
    <div style={{ marginBottom: '2px' }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', padding: '8px 0', paddingLeft: `${level * 20}px`, cursor: 'pointer', borderRadius: '4px', transition: 'background-color 0.2s' }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span style={{ display: 'flex', alignItems: 'center', width: '20px', color: '#64748b' }}>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        
        {isRoot ? (
          <Monitor size={18} style={{ marginRight: '8px', color: '#3b82f6' }} />
        ) : isDomainNode ? (
          <DomainIcon size={16} style={{ marginRight: '8px', color: '#8b5cf6' }} />
        ) : (
          <LogIn size={16} style={{ marginRight: '8px', color: '#64748b' }} />
        )}
        
        <span style={{ fontWeight: '500', fontSize: '0.95rem', color: '#f1f5f9' }}>
           {isDomainNode ? domainLabel : (name.length > 20 ? name.substring(0,20)+'...' : name)}
        </span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {Object.entries(data).map(([key, value]) => {
              if (key === 'alerts') return null; // Skip alerts in tree view
              return <TreeNode key={key} name={key} data={value} level={level + 1} />;
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TreeView({ treeData }) {
  if (!treeData || Object.keys(treeData).length === 0) {
    return <div style={{ color: '#94a3b8', padding: '20px', backgroundColor: '#1e293b', borderRadius: '12px' }}>No hierarchy data available.</div>;
  }

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #334155', paddingBottom: '12px', fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc' }}>
        Machine Hierarchy
      </h3>
      <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
        {Object.entries(treeData).map(([machineName, machineData]) => (
          <TreeNode key={machineName} name={machineName} data={machineData.domains} level={0} isRoot={true} />
        ))}
      </div>
    </div>
  );
}
