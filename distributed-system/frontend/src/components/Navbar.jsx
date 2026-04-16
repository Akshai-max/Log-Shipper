import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Navbar() {
  const loc = useLocation();
  const getStyle = (path) => ({
    padding: '10px 20px', 
    borderRadius: '12px', 
    color: loc.pathname === path ? '#f8fafc' : '#94a3b8', 
    textDecoration: 'none', 
    fontWeight: '600',
    backgroundColor: loc.pathname === path ? '#3b82f6' : 'transparent',
    transition: 'all 0.2s ease',
    fontSize: '0.95rem',
    letterSpacing: '0.025em'
  });

  return (
    <nav style={{ backgroundColor: '#0f172a', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
      <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '14px', fontSize: '1.6rem', color: '#f8fafc', fontWeight: '800', letterSpacing: '-0.025em' }}>
        <div style={{ padding: '8px', backgroundColor: '#3b82f622', borderRadius: '10px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={24} />
        </div>
        Lab Monitor
      </h1>
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#1e293b', padding: '6px', borderRadius: '16px', border: '1px solid #334155' }}>
        <Link to="/" style={getStyle('/')}>Students Overview</Link>
        <Link to="/metrics" style={getStyle('/metrics')}>Lab Analytics</Link>
      </div>
    </nav>
  );
}
