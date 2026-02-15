import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 10: PROTEST POSTER
// Bold statements, revolutionary design, manifesto style
// Palette: Revolutionary red (#DC143C), black, white, protest yellow (#FFD700)
// Typography: Bebas Neue - bold, condensed, impactful

export default function Design10() {
  return (
    <div className="min-h-screen bg-white font-bebas text-black overflow-hidden relative">
      {/* Halftone Texture Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10 mix-blend-multiply"
        style={{
          backgroundImage: `radial-gradient(circle, black 1px, transparent 1px)`,
          backgroundSize: '4px 4px',
        }}
      />

      {/* Navigation - Protest Banner Style */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black text-white">
        <div className="flex items-center justify-between px-8 py-3 border-b-4 border-[#DC143C]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#DC143C] flex items-center justify-center">
              <div className="text-white text-2xl font-bold">✊</div>
            </div>
            <span className="text-2xl font-bold tracking-tight">
              HANDWRITING REVOLUTION
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-base tracking-wide">
            <a href="#manifesto" className="hover:text-[#DC143C] transition-colors">MANIFESTO</a>
            <a href="#join" className="hover:text-[#DC143C] transition-colors">JOIN US</a>
            <a href="#power" className="hover:text-[#DC143C] transition-colors">POWER</a>
          </div>
          <button className="bg-[#DC143C] text-white px-8 py-3 font-bold text-base tracking-wide hover:bg-[#FF1744] transition-colors">
            RISE UP
          </button>
        </div>
      </nav>

      {/* Design Switcher - Protest Signs */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-black border-4 border-[#DC143C] p-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-12 h-12 flex items-center justify-center font-bold text-lg ${
              n === 10
                ? 'bg-[#DC143C] text-white'
                : 'bg-white text-black hover:bg-[#DC143C] hover:text-white transition-colors'
            }`}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero - Revolutionary Poster */}
      <section className="min-h-screen flex items-center justify-center px-8 pt-24 pb-20 bg-[#DC143C] text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.1) 20px, rgba(0,0,0,0.1) 40px)`,
          }}
        />

        <div className="max-w-7xl mx-auto w-full relative z-10">
          {/* Main Manifesto Statement */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="mb-8">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="h-2 w-64 bg-white mx-auto mb-6"
              />
              <div className="text-2xl tracking-[0.3em] mb-4">
                THE DIGITAL REVOLUTION DEMANDS
              </div>
            </div>

            <h1 className="text-[12vw] md:text-[15vw] font-bold leading-[0.85] mb-8 tracking-tighter">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                HAND
              </motion.div>
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                WRITING
              </motion.div>
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-[#FFD700]"
              >
                FOR ALL
              </motion.div>
            </h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="h-2 w-64 bg-white mx-auto mt-8"
            />
          </motion.div>

          {/* Revolutionary Statement */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="max-w-4xl mx-auto text-center"
          >
            <p className="text-2xl md:text-3xl leading-relaxed mb-12 font-outfit">
              We declare that authentic handwriting is a fundamental right, not a privilege.
              Every person deserves access to beautiful, personalized written expression.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button className="bg-white text-[#DC143C] px-12 py-5 font-bold text-xl tracking-wide hover:bg-[#FFD700] hover:text-black transition-colors border-4 border-white">
                JOIN THE MOVEMENT
              </button>
              <button className="border-4 border-white text-white px-12 py-5 font-bold text-xl tracking-wide hover:bg-white hover:text-[#DC143C] transition-colors">
                READ MANIFESTO
              </button>
            </div>
          </motion.div>

          {/* Power to the People */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-8 left-0 right-0 text-center text-4xl tracking-[0.5em]"
          >
            ✊ POWER TO THE PEOPLE ✊
          </motion.div>
        </div>
      </section>

      {/* Manifesto Section - Bold Declarations */}
      <section className="py-32 px-8 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-block bg-[#DC143C] px-8 py-3 mb-8 border-4 border-white">
              <span className="text-3xl tracking-[0.3em]">OUR DEMANDS</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                number: '01',
                title: 'AI FOR THE PEOPLE',
                statement: 'Neural handwriting synthesis must be accessible to all, not hoarded by the elite. Free the algorithms!',
              },
              {
                number: '02',
                title: 'COLLECTIVE CREATION',
                statement: 'Team workspaces where creators unite, share resources, and build together. Solidarity in synthesis!',
              },
              {
                number: '03',
                title: 'ARCHIVE OF THE MASSES',
                statement: 'Every generation saved, organized, and owned by the creator. Your handwriting, your property!',
              },
              {
                number: '04',
                title: 'UNIVERSAL FORMAT',
                statement: 'SVG vectors belong to everyone. Scalable, shareable, unstoppable. Format freedom now!',
              },
            ].map((demand, i) => (
              <motion.div
                key={demand.number}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border-4 border-[#DC143C] p-8 hover:bg-[#DC143C]/10 transition-colors group"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="text-7xl font-bold text-[#DC143C] group-hover:text-white transition-colors">
                    {demand.number}
                  </div>
                  <div className="flex-1 pt-4">
                    <h3 className="text-3xl font-bold mb-4 tracking-tight">
                      {demand.title}
                    </h3>
                    <p className="text-xl text-white/80 leading-relaxed font-outfit">
                      {demand.statement}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-[#DC143C] group-hover:bg-white transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Revolution Section */}
      <section className="py-32 px-8 bg-white relative overflow-hidden">
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="text-[20vw] font-bold whitespace-nowrap">
            REVOLUTION
          </div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-6xl md:text-8xl font-bold mb-8 tracking-tight">
              THE REVOLUTION
              <br />
              <span className="text-[#DC143C]">IS NOW</span>
            </h2>
          </motion.div>

          {/* Before/After Demo - Revolutionary Transformation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Before - The Old Way */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border-4 border-black p-8 bg-gray-200 relative"
            >
              <div className="absolute top-4 left-4 bg-black text-white px-4 py-2 text-sm font-bold">
                THE OLD WAY
              </div>
              <div className="pt-16">
                <div className="text-3xl font-space-mono text-black/60 leading-relaxed">
                  Mechanical. Soulless. Corporate.
                </div>
              </div>
              <div className="mt-6 text-sm text-black/40 font-outfit">
                Generic fonts. No personality. No soul.
              </div>
            </motion.div>

            {/* After - The Revolution */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="border-4 border-[#DC143C] p-8 bg-[#FFFEF5] relative"
            >
              <div className="absolute top-4 left-4 bg-[#DC143C] text-white px-4 py-2 text-sm font-bold">
                THE REVOLUTION
              </div>
              <div className="pt-16">
                <div className="font-caveat text-5xl text-black leading-relaxed">
                  Mechanical. Soulless. Corporate.
                </div>
              </div>
              <div className="mt-6 text-sm text-black/60 font-outfit">
                Human. Authentic. Revolutionary.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action - Join the Revolution */}
      <section className="py-32 px-8 bg-[#FFD700] relative overflow-hidden">
        {/* Radiating Lines */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 h-full bg-black origin-top"
              style={{
                transform: `rotate(${i * 15}deg) translateX(-50%)`,
              }}
            />
          ))}
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="mb-8">
              <div className="text-8xl mb-4">✊</div>
              <h2 className="text-6xl md:text-8xl font-bold leading-tight tracking-tighter">
                JOIN THE
                <br />
                <span className="text-[#DC143C]">REVOLUTION</span>
              </h2>
            </div>

            <p className="text-2xl md:text-3xl mb-12 max-w-3xl mx-auto leading-relaxed font-outfit">
              Together, we will democratize handwriting. Together, we will create beauty
              accessible to all. The revolution starts with you.
            </p>

            <button className="bg-[#DC143C] text-white px-16 py-6 font-bold text-2xl tracking-wide border-4 border-black hover:bg-black hover:border-[#DC143C] transition-colors">
              START REVOLUTION NOW
            </button>

            <div className="mt-12 text-xl tracking-[0.5em]">
              ★ ★ ★ THE FUTURE IS HANDWRITTEN ★ ★ ★
            </div>
          </motion.div>
        </div>
      </section>

      {/* Solidarity Section - Numbers */}
      <section className="py-20 px-8 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-7xl md:text-8xl font-bold text-[#DC143C] mb-4">10K+</div>
              <div className="text-xl tracking-wide">REVOLUTIONARIES</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-7xl md:text-8xl font-bold text-[#FFD700] mb-4">1M+</div>
              <div className="text-xl tracking-wide">GENERATIONS</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-7xl md:text-8xl font-bold text-white mb-4">∞</div>
              <div className="text-xl tracking-wide">POSSIBILITIES</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer - Revolutionary Solidarity */}
      <footer className="py-12 px-8 bg-[#DC143C] text-white border-t-4 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="text-4xl">✊</div>
              <div>
                <div className="text-2xl font-bold tracking-tight">
                  HANDWRITING REVOLUTION
                </div>
                <div className="text-sm opacity-80">United We Write</div>
              </div>
            </div>
            <div className="text-lg tracking-wide">
              © 2024 — THE REVOLUTION CONTINUES
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
