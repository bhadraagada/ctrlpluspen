import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Design1 from './pages/Design1'
import Design2 from './pages/Design2'
import Design3 from './pages/Design3'
import Design4 from './pages/Design4'
import Design5 from './pages/Design5'
import Design6 from './pages/Design6'
import Design7 from './pages/Design7';
import Design8 from './pages/Design8';
import Design9 from './pages/Design9';
import Design10 from './pages/Design10';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/1" replace />} />
        <Route path="/1" element={<Design1 />} />
        <Route path="/2" element={<Design2 />} />
        <Route path="/3" element={<Design3 />} />
        <Route path="/4" element={<Design4 />} />
        <Route path="/5" element={<Design5 />} />
        <Route path="/6" element={<Design6 />} />
        <Route path="/7" element={<Design7 />} />
        <Route path="/8" element={<Design8 />} />
        <Route path="/9" element={<Design9 />} />
        <Route path="/10" element={<Design10 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
