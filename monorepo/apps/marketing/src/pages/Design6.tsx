import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 6: INDUSTRIAL GRID SYSTEM
// Heavy grid lines, modular blocks, construction-site aesthetic
// Palette: Construction yellow (#FFD700), safety orange (#FF6B00), black, industrial gray
// Typography: Space Mono - industrial, technical, blueprint-like

export default function Design6() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] font-space-mono text-[#e5e5e5] overflow-hidden relative">
      {/* Heavy Grid Overlay - Construction Blueprint Style */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 49px, #FFD700 49px, #FFD700 50px),
          repeating-linear-gradient(90deg, transparent, transparent 49px, #FFD700 49px, #FFD700 50px)
        `,
        opacity: 0.15
      }} />

      {/* Corner Grid Labels - Blueprint Style */}
      <div className="fixed top-0 left-0 text-[#FFD700] text-xs p-4 z-50 pointer-events-none font-courier-prime">
        <div>GRID: 50x50</div>
        <div>SCALE: 1:1</div>
      </div>
      <div className="fixed top-0 right-0 text-[#FFD700] text-xs p-4 z-50 pointer-events-none font-courier-prime text-right">
        <div>HANDWRITING.STUDIO</div>
        <div>REV: 2024.06</div>
      </div>

      {/* Navigation - Industrial Bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#FFD700] text-black border-b-8 border-black">
        <div className="flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-[#FFD700]" />
            </div>
            <span className="text-lg font-bold tracking-tight">HANDWRITING.STUDIO</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-wider font-bold">
            <a href="#specs" className="hover:underline">SPECS</a>
            <a href="#build" className="hover:underline">BUILD</a>
            <a href="#deploy" className="hover:underline">DEPLOY</a>
          </div>
          <button className="bg-black text-[#FFD700] px-6 py-2 font-bold uppercase tracking-wider text-xs border-4 border-black hover:border-[#FF6B00] transition-colors">
            INITIALIZE
          </button>
        </div>
      </nav>

      {/* Design Switcher - Industrial Panel */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-0 bg-black border-4 border-[#FFD700]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-12 h-12 flex items-center justify-center font-bold text-xs border-r-2 border-[#FFD700]/30 last:border-r-0 ${
              n === 6 ? 'bg-[#FFD700] text-black' : 'bg-black text-[#FFD700] hover:bg-[#FFD700]/10'
            }`}
          >
            {String(n).padStart(2, '0')}
          </Link>
        ))}
      </div>

      {/* Hero Section - Modular Construction Blocks */}
      <section className="pt-32 pb-20 px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Hazard Stripes */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8 }}
            className="h-16 mb-8 origin-left"
            style={{
              background: 'repeating-linear-gradient(45deg, #FFD700, #FFD700 20px, #000 20px, #000 40px)'
            }}
          />

          <div className="grid grid-cols-12 gap-4">
            {/* Main Construction Block */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="col-span-12 lg:col-span-8 bg-black border-8 border-[#FFD700] p-12 relative"
            >
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FF6B00]" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FF6B00]" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FF6B00]" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FF6B00]" />

              <div className="text-xs uppercase tracking-widest text-[#FFD700] mb-6 flex items-center gap-2">
                <div className="w-3 h-3 bg-[#FF6B00] animate-pulse" />
                SYSTEM ACTIVE
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter mb-8 text-[#FFD700]">
                CONSTRUCT<br />
                YOUR<br />
                <span className="text-white">HAND</span><br />
                <span className="text-white">WRITING</span>
              </h1>

              <div className="bg-[#FFD700]/10 border-l-4 border-[#FFD700] p-6 max-w-2xl">
                <p className="text-base text-[#e5e5e5] leading-relaxed font-courier-prime">
                  // Industrial-grade AI synthesis engine<br />
                  // Transforms digital input → authentic handwriting<br />
                  // Vector output, unlimited scalability<br />
                  // Built for production environments
                </p>
              </div>
            </motion.div>

            {/* Side Module Blocks */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="col-span-12 lg:col-span-4 flex flex-col gap-4"
            >
              <div className="bg-[#FFD700] text-black p-6 border-4 border-black relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF6B00] -mr-8 -mt-8 rotate-45" />
                <div className="relative z-10">
                  <div className="text-5xl font-bold mb-2">13+</div>
                  <div className="text-xs uppercase tracking-wider font-bold">HANDWRITING MODELS</div>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border-4 border-[#333] p-6 relative">
                <div className="text-4xl font-bold text-[#FFD700] mb-2">SVG</div>
                <div className="text-xs uppercase tracking-wider text-[#666]">VECTOR FORMAT</div>
                <div className="absolute bottom-2 right-2 text-[#FFD700] opacity-20 text-6xl leading-none">⚠</div>
              </div>

              <div className="bg-[#FF6B00] text-black p-6 border-4 border-black">
                <div className="text-4xl font-bold mb-2">∞</div>
                <div className="text-xs uppercase tracking-wider font-bold">SCALE CAPACITY</div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Hazard Stripe */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="h-8 mt-8 origin-right"
            style={{
              background: 'repeating-linear-gradient(-45deg, #FFD700, #FFD700 15px, #000 15px, #000 30px)'
            }}
          />
        </div>
      </section>

      {/* Features - Modular Grid Construction */}
      <section className="py-20 px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Section Label - Blueprint Style */}
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-1 h-1 bg-[#FFD700]" />
            <div className="text-xs uppercase tracking-widest text-[#FFD700] font-bold">
              [ SPECIFICATIONS ]
            </div>
            <div className="flex-1 h-1 bg-[#FFD700]" />
          </div>

          {/* Modular Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                id: 'MOD-01',
                title: 'AI SYNTHESIS CORE',
                desc: 'Neural network architecture processes text input through LSTM layers, generating stroke coordinates with authentic human-like variations.',
                status: 'OPERATIONAL'
              },
              {
                id: 'MOD-02',
                title: 'TEAM INFRASTRUCTURE',
                desc: 'Multi-user workspace architecture. Shared credit pools, role-based access control, collaborative generation management.',
                status: 'OPERATIONAL'
              },
              {
                id: 'MOD-03',
                title: 'STORAGE SYSTEM',
                desc: 'Persistent gallery architecture. Organize, tag, favorite, and retrieve all generated handwriting assets.',
                status: 'OPERATIONAL'
              },
              {
                id: 'MOD-04',
                title: 'EXPORT ENGINE',
                desc: 'Multi-format output pipeline: SVG vector graphics, PNG raster with effects, PDF print-ready documents.',
                status: 'OPERATIONAL'
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0a0a0a] border-4 border-[#333] p-8 hover:border-[#FFD700] transition-all group relative"
              >
                {/* Module ID Tag */}
                <div className="absolute -top-3 left-6 bg-black px-3 py-1 border-2 border-[#FFD700] text-[#FFD700] text-xs font-bold">
                  {feature.id}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#0f0] animate-pulse" />
                    <span className="text-xs text-[#0f0] font-courier-prime">{feature.status}</span>
                  </div>
                  <div className="w-12 h-12 border-4 border-[#333] group-hover:border-[#FFD700] transition-colors flex items-center justify-center">
                    <div className="w-6 h-6 bg-[#FFD700] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4 text-[#FFD700] tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[#888] leading-relaxed text-sm font-courier-prime">
                  {feature.desc}
                </p>

                {/* Corner Detail */}
                <div className="absolute bottom-4 right-4 text-[#333] text-4xl font-bold">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section - Construction Site */}
      <section className="py-20 px-8 bg-[#0a0a0a] relative">
        <div className="max-w-7xl mx-auto">
          {/* Caution Tape */}
          <div className="mb-12 h-12 flex items-center justify-center text-xs font-bold tracking-widest"
            style={{
              background: 'repeating-linear-gradient(45deg, #FFD700, #FFD700 30px, #000 30px, #000 60px)'
            }}
          >
            <span className="text-black">⚠ LIVE DEMONSTRATION ZONE ⚠</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Terminal */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-black border-4 border-[#FFD700] p-8"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#FFD700]/30">
                <div className="text-xs text-[#FFD700] font-bold tracking-widest">INPUT TERMINAL</div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-[#f00]" />
                  <div className="w-3 h-3 bg-[#ff0]" />
                  <div className="w-3 h-3 bg-[#0f0]" />
                </div>
              </div>
              <div className="font-courier-prime text-sm text-[#0f0] bg-black p-4 border-2 border-[#FFD700]/20 leading-relaxed">
                <span className="text-[#FFD700]">$</span> input.txt<br />
                <span className="text-white">Transform this text into handwriting</span><br />
                <span className="text-[#FFD700]">$</span> <span className="animate-pulse">_</span>
              </div>
            </motion.div>

            {/* Output Display */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#fffef5] border-4 border-black p-8 relative"
            >
              <div className="absolute top-4 right-4 text-xs text-black/40 font-bold tracking-widest">
                OUTPUT.SVG
              </div>
              <div className="pt-8">
                <div className="font-caveat text-4xl text-black leading-relaxed">
                  Transform this text into handwriting
                </div>
              </div>
              {/* Corner Markers */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#FF6B00]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#FF6B00]" />
            </motion.div>
          </div>

          {/* Caution Tape Bottom */}
          <div className="mt-12 h-12 flex items-center justify-center text-xs font-bold tracking-widest"
            style={{
              background: 'repeating-linear-gradient(-45deg, #FFD700, #FFD700 30px, #000 30px, #000 60px)'
            }}
          >
            <span className="text-black">⚠ END DEMONSTRATION ZONE ⚠</span>
          </div>
        </div>
      </section>

      {/* CTA - Construction Sign */}
      <section className="py-20 px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#FFD700] text-black p-16 border-8 border-black relative"
          >
            {/* Warning Stripes Corner */}
            <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden">
              <div className="absolute w-64 h-64 -top-32 -left-32"
                style={{
                  background: 'repeating-linear-gradient(45deg, #FF6B00, #FF6B00 10px, #FFD700 10px, #FFD700 20px)'
                }}
              />
            </div>

            <div className="relative z-10 text-center">
              <div className="text-xs uppercase tracking-widest mb-4 font-bold">
                [ INITIALIZATION REQUIRED ]
              </div>
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-tight">
                BEGIN<br />
                CONSTRUCTION
              </h2>
              <p className="text-xl mb-12 max-w-2xl mx-auto font-courier-prime">
                Deploy your handwriting synthesis infrastructure today. Zero setup time. Production-ready architecture.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-black text-[#FFD700] px-12 py-4 font-bold uppercase tracking-widest border-4 border-black hover:border-[#FF6B00] transition-colors">
                  START BUILD
                </button>
                <button className="bg-transparent border-4 border-black px-12 py-4 font-bold uppercase tracking-widest hover:bg-black hover:text-[#FFD700] transition-colors">
                  VIEW SPECS
                </button>
              </div>
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-black" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-black" />
          </motion.div>
        </div>
      </section>

      {/* Footer - Industrial */}
      <footer className="py-12 px-8 border-t-4 border-[#FFD700] bg-black relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#FFD700]" />
              <span className="font-bold tracking-tight text-[#FFD700]">HANDWRITING.STUDIO</span>
            </div>
            <div className="text-xs text-[#666] uppercase tracking-widest font-courier-prime">
              REV 2024.06 // ALL SYSTEMS OPERATIONAL
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
