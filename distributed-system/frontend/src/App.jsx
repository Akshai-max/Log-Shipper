import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ClientDetail from './pages/ClientDetail';
import GlobalMetrics from './pages/GlobalMetrics';
import Restrictions from './pages/Restrictions';
import './index.css';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/client/:id" element={<ClientDetail />} />
        <Route path="/metrics" element={<GlobalMetrics />} />
        <Route path="/restrictions" element={<Restrictions />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main style={{ padding: '0px' }}>
          <AnimatedRoutes />
        </main>
      </div>
    </Router>
  );
}
