import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Monitor, Globe, Activity } from 'lucide-react';

export default function TreeNode({ name, data, level = 0 }) {
  const [isOpen, setIsOpen] = useState(level === 0);

  const isLeaf = typeof data !== 'object' || data === null || !isNaN(data);
  const isMachine = level === 0;

  if (isLeaf) {
    return (
      <div className="tree-leaf" style={{ paddingLeft: `${ level * 20 }px` }}>
        <Activity size={14} className="icon leaf-icon" />
        <span className="leaf-name">{name}:</span>
        <span className="leaf-value">{data}</span>
      </div>
    );
  }

  return (
    <div className="tree-node-container">
      <div 
        className="tree-node" 
        style={{ paddingLeft: `${ level * 20 }px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="node-toggle">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        {isMachine ? <Monitor size={16} className="icon machine-icon" /> : <Globe size={16} className="icon domain-icon" />}
        <span className="node-name">{name}</span>
      </div>
      
      {isOpen && (
        <div className="tree-children">
          {Object.entries(data).map(([key, value]) => (
            <TreeNode key={key} name={key} data={value} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
