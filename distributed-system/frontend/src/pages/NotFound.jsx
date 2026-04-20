import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ghost, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: '#f1f5f9',
      textAlign: 'center',
      padding: '20px',
      overflow: 'hidden'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ marginBottom: '40px' }}
      >
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          style={{ color: '#3b82f6', marginBottom: '20px' }}
        >
          <Ghost size={120} strokeWidth={1.5} />
        </motion.div>
        
        <h1 style={{ 
          fontSize: '8rem', 
          margin: 0, 
          fontWeight: '900', 
          lineHeight: '1',
          background: 'linear-gradient(to bottom, #f8fafc, #64748b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.05em'
        }}>
          404
        </h1>
        <h2 style={{ 
          fontSize: '1.8rem', 
          marginTop: '10px', 
          color: '#cbd5e1', 
          fontWeight: '600' 
        }}>
          Lost in the lab network?
        </h2>
        <p style={{ 
          maxWidth: '500px', 
          margin: '20px auto 0', 
          color: '#64748b', 
          fontSize: '1.1rem',
          lineHeight: '1.6'
        }}>
          The page you are looking for has been restricted, moved, or never existed in this dimension.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{ display: 'flex', gap: '20px' }}
      >
        <Link 
          to="/" 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '1rem',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          <Home size={20} /> Back to Dashboard
        </Link>
        <button 
          onClick={() => window.history.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            padding: '14px 28px',
            borderRadius: '12px',
            border: '1px solid #334155',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e293b';
            e.currentTarget.style.color = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <ArrowLeft size={20} /> Go Back
        </button>
      </motion.div>

      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        zIndex: -1
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        zIndex: -1
      }} />
    </div>
  );
}
