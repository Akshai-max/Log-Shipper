import React from 'react';
import { AlertCircle, ShieldAlert, CheckCircle } from 'lucide-react';

export default function Alerts({ treeData }) {
  if (!treeData) return null;

  const getMachineAlertLevel = (machineData) => {
    let totalSwitches = 0;
    Object.values(machineData).forEach(domainData => {
      totalSwitches += domainData.tab_switch || 0;
    });

    if (totalSwitches > 100) return 'high';
    if (totalSwitches > 30) return 'medium';
    return 'low';
  };

  const machines = Object.keys(treeData);

  return (
    <div className="alerts-panel panel">
      <h2>System Alerts</h2>
      <div className="alerts-list">
        {machines.length === 0 && <div className="metrics-item" style={{ color: '#aaa' }}>No machines tracked</div>}
        
        {machines.map(machine => {
          const level = getMachineAlertLevel(treeData[machine]);
          let icon = <CheckCircle size={20} />;
          let statusText = "Normal Activity";
          
          if (level === 'high') {
            icon = <AlertCircle size={20} />;
            statusText = "High Suspicious Activity / Thrashing";
          } else if (level === 'medium') {
            icon = <ShieldAlert size={20} />;
            statusText = "Elevated Tab Switching";
          }

          return (
            <div key={machine} className={`alert-card level-${level}`}>
              <div className="alert-icon">{icon}</div>
              <div className="alert-content">
                <strong>{machine}</strong>
                <span>{statusText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
