import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 7: GLITCH TYPOGRAPHY
// Distorted text, digital brutalism, cyber aesthetic
// Palette: Cyber cyan (#00FFFF), neon magenta (#FF00FF), electric green (#00FF00), deep black
// Typography: Courier Prime - monospace, digital, terminal-like

export default function Design7() {
  return (
    <div className="min-h-screen bg-black font-courier-prime text-white overflow-hidden relative">
      {/* Scanline Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
          animation: 'scanline 8s linear infinite'
        }}
      />

      {/* RGB Noise Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        @keyframes glitch-skew {
          0%, 100% { transform: skew(0deg); }
          20% { transform: skew(2deg); }
          40% { transform: skew(-2deg); }
          60% { transform: skew(3deg); }
          80% { transform: skew(-3deg); }
        }
        @keyframes rgb-shift {
          0%, 100% { text-shadow: 2px 0 #00FFFF, -2px 0 #FF00FF; }
          25% { text-shadow: -2px 0 #00FFFF, 2px 0 #FF00FF; }
          50% { text-shadow: 2px 2px #00FFFF, -2px -2px #FF00FF; }
          75% { text-shadow: -2px 2px #00FFFF, 2px -2px #FF00FF; }
        }
        .glitch-text {
          animation: rgb-shift 0.3s infinite;
        }
        .glitch-hover:hover {
          animation: glitch 0.3s infinite;
        }
      `}</style>

      {/* Navigation - Glitched */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black border-b border-[#00FFFF]">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00FFFF] relative">
              <div className="absolute inset-0 bg-[#FF00FF] mix-blend-multiply animate-pulse" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#00FFFF]">
              H∆NDW∅ITING.STUDI∅
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest">
            <a href="#" className="text-[#00FF00] hover:text-[#00FFFF] transition-colors glitch-hover">SYS</a>
            <a href="#" className="text-[#00FF00] hover:text-[#00FFFF] transition-colors glitch-hover">FNX</a>
            <a href="#" className="text-[#00FF00] hover:text-[#00FFFF] transition-colors glitch-hover">DBG</a>
          </div>
          <button className="bg-[#00FFFF] text-black px-6 py-2 font-bold uppercase text-xs hover:bg-[#FF00FF] transition-colors relative overflow-hidden group">
            <span className="relative z-10">INIT</span>
            <div className="absolute inset-0 bg-[#FF00FF] translate-x-full group-hover:translate-x-0 transition-transform" />
          </button>
        </div>
      </nav>

      {/* Design Switcher */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-black border border-[#00FFFF] p-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center text-xs font-bold ${
              n === 7
                ? 'bg-[#00FFFF] text-black'
                : 'bg-transparent text-[#00FFFF] hover:bg-[#00FFFF]/10 border border-[#00FFFF]/30'
            }`}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero - Massive Glitched Typography */}
      <section className="min-h-screen flex items-center justify-center px-8 pt-20 relative">
        <div className="w-full max-w-7xl">
          {/* Corrupted Background Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          >
            <div className="text-[25vw] font-bold text-[#00FFFF] leading-none"
              style={{ animation: 'glitch-skew 2s infinite' }}
            >
              ERR∅R
            </div>
          </motion.div>

          {/* Main Title - Heavily Glitched */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="text-xs text-[#00FF00] mb-4 tracking-widest">
                [SYSTEM: HANDWRITING_SYNTHESIS_v2.0]
              </div>

              <h1 className="text-7xl md:text-9xl font-bold leading-none mb-4">
                <div className="relative inline-block">
                  <span className="glitch-text text-[#00FFFF]">GLITCH</span>
                  <span className="absolute top-0 left-0 text-[#FF00FF] opacity-70"
                    style={{ transform: 'translate(-3px, 3px)' }}
                  >
                    GLITCH
                  </span>
                  <span className="absolute top-0 left-0 text-[#00FF00] opacity-50"
                    style={{ transform: 'translate(3px, -3px)' }}
                  >
                    GLITCH
                  </span>
                </div>
              </h1>

              <h2 className="text-6xl md:text-8xl font-bold leading-none">
                <span className="text-white">YOUR</span>{' '}
                <span className="glitch-text text-[#FF00FF]">TEXT</span>
              </h2>
            </motion.div>

            {/* Glitched Description Box */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="max-w-2xl mx-auto bg-black border-2 border-[#00FFFF] p-8 relative"
            >
              {/* Corner Glitches */}
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-[#FF00FF]" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#00FF00]" />

              <div className="text-sm text-[#00FFFF] mb-4 font-bold">
                &gt; NEURAL_SYNTHESIS.exe --mode=handwriting
              </div>
              <p className="text-base text-white/80 leading-relaxed">
                Transform digital text into authentic handwriting through corrupted AI synthesis.
                Glitch the matrix. Break the grid. Generate the impossible.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button className="bg-[#00FFFF] text-black px-8 py-3 font-bold uppercase text-sm hover:bg-[#FF00FF] transition-colors relative overflow-hidden group">
                  <span className="relative z-10">EXECUTE</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF00FF] to-[#00FF00] translate-y-full group-hover:translate-y-0 transition-transform" />
                </button>
                <button className="border-2 border-[#00FFFF] text-[#00FFFF] px-8 py-3 font-bold uppercase text-sm hover:bg-[#00FFFF] hover:text-black transition-colors">
                  DECRYPT
                </button>
              </div>
            </motion.div>
          </div>

          {/* Floating Glitch Elements */}
          <motion.div
            animate={{
              x: [0, 10, 0, -10, 0],
              y: [0, -10, 0, 10, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/4 right-[10%] w-20 h-20 border-4 border-[#FF00FF] hidden lg:block"
          />
          <motion.div
            animate={{
              rotate: [0, 90, 180, 270, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 left-[10%] w-16 h-16 bg-[#00FF00] hidden lg:block"
          />
        </div>
      </section>

      {/* Features - Corrupted Grid */}
      <section className="py-20 px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header - Glitched */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <div className="text-xs text-[#00FF00] mb-4 tracking-widest">
              [FEATURE_SET.CORRUPTED]
            </div>
            <h2 className="text-5xl md:text-7xl font-bold mb-4">
              <span className="glitch-text text-[#00FFFF]">SYSTEM</span>{' '}
              <span className="text-white">C∅RE</span>
            </h2>
          </motion.div>

          {/* Feature Cards - Digital Corruption */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                id: '0x01',
                title: 'NEURAL_ENGINE',
                desc: 'Deep learning architecture corrupts digital input → authentic handwriting vectors. LSTM synthesis with controlled chaos.',
                color: '#00FFFF',
                status: '█████████░ 90%'
              },
              {
                id: '0x02',
                title: 'TEAM_PROTOCOL',
                desc: 'Multi-agent workspace infrastructure. Shared memory pools, distributed access, collaborative generation matrix.',
                color: '#FF00FF',
                status: '██████████ 100%'
              },
              {
                id: '0x03',
                title: 'VAULT_STORAGE',
                desc: 'Persistent data architecture. Archive, index, retrieve all generated artifacts. Infinite capacity.',
                color: '#00FF00',
                status: '████████░░ 80%'
              },
              {
                id: '0x04',
                title: 'EXPORT_MATRIX',
                desc: 'Multi-format output pipeline: SVG vectors, PNG rasters, PDF documents. Universal compatibility.',
                color: '#00FFFF',
                status: '█████████░ 95%'
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-black border-2 p-8 hover:scale-[1.02] transition-transform group relative overflow-hidden"
                style={{ borderColor: feature.color }}
              >
                {/* Glitch Overlay on Hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{
                    backgroundColor: feature.color,
                    animation: 'glitch 0.3s infinite'
                  }}
                />

                <div className="relative z-10">
                  {/* ID Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold tracking-widest" style={{ color: feature.color }}>
                      {feature.id}
                    </span>
                    <div className="w-3 h-3 animate-pulse" style={{ backgroundColor: feature.color }} />
                  </div>

                  <h3 className="text-2xl font-bold mb-4 tracking-tight" style={{ color: feature.color }}>
                    {feature.title}
                  </h3>

                  <p className="text-white/70 text-sm leading-relaxed mb-6">
                    {feature.desc}
                  </p>

                  {/* Progress Bar */}
                  <div className="text-xs font-bold" style={{ color: feature.color }}>
                    {feature.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo - Corrupted Display */}
      <section className="py-20 px-8 bg-black/50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#00FF00] mb-2 tracking-widest">
              [DEMONSTRATION.ACTIVE]
            </div>
            <div className="text-2xl font-bold text-[#00FFFF]">
              &gt; RUN synthesis_demo.sh
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Terminal */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-black border-2 border-[#00FFFF] p-6"
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#00FFFF]/30">
                <div className="w-3 h-3 bg-[#FF00FF]" />
                <div className="w-3 h-3 bg-[#00FFFF]" />
                <div className="w-3 h-3 bg-[#00FF00]" />
                <span className="ml-2 text-xs text-[#00FFFF]">INPUT.TXT</span>
              </div>
              <div className="text-sm text-[#00FF00] leading-relaxed">
                <span className="text-[#00FFFF]">&gt;</span> Hello, welcome to the glitch<br />
                <span className="text-[#00FFFF]">&gt;</span> <span className="animate-pulse">_</span>
              </div>
            </motion.div>

            {/* Output Display - Glitched */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white border-2 border-[#FF00FF] p-6 relative"
            >
              <div className="absolute top-0 right-0 text-xs text-black/40 p-4">
                OUTPUT.SVG
              </div>
              <div className="pt-8">
                <div className="font-caveat text-4xl text-black leading-relaxed">
                  Hello, welcome to the glitch
                </div>
              </div>
              {/* Glitch corners */}
              <div className="absolute top-0 left-0 w-4 h-4 bg-[#00FFFF]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#FF00FF]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA - Digital Corruption */}
      <section className="py-32 px-8 relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#00FFFF 1px, transparent 1px), linear-gradient(90deg, #00FFFF 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'glitch-skew 3s infinite'
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="text-xs text-[#00FF00] mb-6 tracking-widest">
            [SYSTEM.READY]
          </div>
          <h2 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
            <span className="glitch-text text-[#00FFFF]">CORRUPT</span><br />
            <span className="text-white">THE</span>{' '}
            <span className="text-[#FF00FF]">M∆TRIX</span>
          </h2>
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            Initialize your handwriting synthesis protocol. Join the digital rebellion. Break reality.
          </p>
          <button className="bg-[#00FFFF] text-black px-16 py-5 font-bold uppercase text-lg hover:bg-[#FF00FF] transition-all relative overflow-hidden group">
            <span className="relative z-10">EXECUTE NOW</span>
            <div className="absolute inset-0 bg-[#00FF00] translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          </button>
        </motion.div>
      </section>

      {/* Footer - System Info */}
      <footer className="py-8 px-8 border-t border-[#00FFFF]/30 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="text-[#00FFFF]">
            H∆NDW∅ITING.STUDI∅
          </div>
          <div className="text-[#00FF00]">
            STATUS: OPERATIONAL // UPTIME: 99.9% // LATENCY: 12ms
          </div>
          <div className="text-white/40">
            © 2024 ALL_SYSTEMS_G∅
          </div>
        </div>
      </footer>
    </div>
  )
}
