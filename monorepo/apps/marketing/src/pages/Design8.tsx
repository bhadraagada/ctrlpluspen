import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 8: STACKED LAYERS
// Overlapping sections, depth through layers, paper-stack effect
// Palette: Warm paper tones - cream (#F5E6D3), burnt orange (#D2691E), deep brown (#4A2C2A), off-white
// Typography: Outfit - clean, editorial, modern serif feel

export default function Design8() {
  return (
    <div className="min-h-screen bg-[#E8DCC8] font-outfit text-[#2a2a2a] overflow-hidden relative">
      {/* Paper Texture Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence baseFrequency='0.04' numOctaves='5' seed='2'/%3E%3CfeColorMatrix values='0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.2 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation - Layered Card */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="fixed top-6 left-6 right-6 z-50 bg-[#F5E6D3] shadow-2xl"
        style={{
          boxShadow: '12px 12px 0 rgba(74,44,42,0.15), 8px 8px 0 rgba(210,105,30,0.1)'
        }}
      >
        <div className="flex items-center justify-between px-8 py-5 border-4 border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#D2691E] border-4 border-[#2a2a2a] flex items-center justify-center">
              <div className="w-6 h-6 bg-[#F5E6D3]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#2a2a2a]">
              Handwriting Studio
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="hover:text-[#D2691E] transition-colors">Features</a>
            <a href="#" className="hover:text-[#D2691E] transition-colors">Gallery</a>
            <a href="#" className="hover:text-[#D2691E] transition-colors">Pricing</a>
          </div>
          <button className="bg-[#D2691E] text-white px-8 py-3 font-bold border-4 border-[#2a2a2a] hover:translate-x-1 hover:translate-y-1 transition-transform"
            style={{ boxShadow: '4px 4px 0 #2a2a2a' }}
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* Design Switcher - Stacked Cards */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-[#F5E6D3] border-4 border-[#2a2a2a]"
        style={{ boxShadow: '8px 8px 0 rgba(74,44,42,0.2)' }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center font-bold text-sm border-2 transition-all ${
              n === 8
                ? 'bg-[#D2691E] text-white border-[#2a2a2a]'
                : 'bg-[#E8DCC8] text-[#2a2a2a] border-[#2a2a2a]/30 hover:bg-[#D2691E]/20'
            }`}
            style={n === 8 ? { boxShadow: '3px 3px 0 #2a2a2a' } : {}}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero - Layered Paper Stack */}
      <section className="min-h-screen flex items-center px-8 pt-32 pb-20 relative">
        <div className="max-w-7xl mx-auto w-full">
          <div className="relative">
            {/* Background Layer - Largest */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 0.8 }}
              className="absolute top-8 left-8 right-8 h-96 bg-[#4A2C2A] opacity-20 -z-10"
              style={{ boxShadow: '20px 20px 40px rgba(0,0,0,0.1)' }}
            />

            {/* Middle Layer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="absolute top-4 left-4 right-4 h-96 bg-[#D2691E] opacity-30 -z-10"
              style={{ boxShadow: '16px 16px 32px rgba(0,0,0,0.15)' }}
            />

            {/* Main Content Layer */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 bg-[#F5E6D3] border-4 border-[#2a2a2a] p-12 md:p-16"
              style={{ boxShadow: '20px 20px 0 rgba(74,44,42,0.15)' }}
            >
              <div className="text-sm uppercase tracking-widest text-[#D2691E] mb-6 font-bold">
                Layer 01 / AI Synthesis
              </div>

              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.9] mb-8 tracking-tight">
                <span className="text-[#2a2a2a]">Stack</span>
                <br />
                <span className="text-[#D2691E]">Your</span>
                <br />
                <span className="text-[#4A2C2A]">Words</span>
              </h1>

              <div className="max-w-xl">
                <p className="text-xl text-[#2a2a2a]/70 leading-relaxed mb-8">
                  Layer upon layer of AI-generated handwriting. Each stroke carefully stacked,
                  creating depth and authenticity in every generation.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="bg-[#D2691E] text-white px-10 py-4 font-bold border-4 border-[#2a2a2a] hover:translate-x-1 hover:translate-y-1 transition-transform"
                    style={{ boxShadow: '6px 6px 0 #2a2a2a' }}
                  >
                    Start Creating
                  </button>
                  <button className="bg-[#E8DCC8] text-[#2a2a2a] px-10 py-4 font-bold border-4 border-[#2a2a2a] hover:bg-[#F5E6D3] transition-colors">
                    View Examples
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Floating Accent Layer */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute -right-4 bottom-12 w-64 h-32 bg-[#4A2C2A] border-4 border-[#2a2a2a] p-6 hidden lg:block"
              style={{ boxShadow: '12px 12px 0 rgba(210,105,30,0.3)' }}
            >
              <div className="text-white">
                <div className="text-4xl font-bold mb-2">13+</div>
                <div className="text-sm font-medium opacity-80">Unique Styles</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features - Overlapping Cards */}
      <section className="py-32 px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header - Layered */}
          <div className="mb-20 relative">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-block"
            >
              <div className="bg-[#4A2C2A] text-white px-8 py-4 border-4 border-[#2a2a2a] inline-block"
                style={{ boxShadow: '8px 8px 0 rgba(210,105,30,0.4)' }}
              >
                <span className="text-sm uppercase tracking-widest font-bold">Layer 02</span>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold mt-6 tracking-tight"
            >
              Features Stacked<br />
              <span className="text-[#D2691E]">High & Deep</span>
            </motion.h2>
          </div>

          {/* Staggered Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {[
              {
                num: '01',
                title: 'AI Handwriting Engine',
                desc: 'Neural networks trained on authentic handwriting samples generate natural-looking strokes with human-like imperfections.',
                offset: '0',
                bgColor: '#F5E6D3'
              },
              {
                num: '02',
                title: 'Team Collaboration',
                desc: 'Shared workspaces where teams can generate, store, and manage handwriting together. Perfect for agencies and studios.',
                offset: '40px',
                bgColor: '#E8DCC8'
              },
              {
                num: '03',
                title: 'Gallery Management',
                desc: 'Organize all your generations in one place. Tag, favorite, search, and retrieve handwriting assets instantly.',
                offset: '20px',
                bgColor: '#F5E6D3'
              },
              {
                num: '04',
                title: 'Vector Export',
                desc: 'SVG output means infinite scalability. Use your handwriting at any size without quality loss. PDF and PNG too.',
                offset: '60px',
                bgColor: '#E8DCC8'
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.num}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative group"
                style={{ marginTop: feature.offset }}
              >
                {/* Shadow Layer */}
                <div className="absolute inset-0 bg-[#4A2C2A] opacity-10 translate-x-4 translate-y-4" />
                <div className="absolute inset-0 bg-[#D2691E] opacity-20 translate-x-2 translate-y-2" />

                {/* Main Card */}
                <div
                  className="relative border-4 border-[#2a2a2a] p-8 transition-transform hover:-translate-y-2"
                  style={{
                    backgroundColor: feature.bgColor,
                    boxShadow: '10px 10px 0 rgba(74,44,42,0.2)'
                  }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-[#D2691E] border-4 border-[#2a2a2a] flex items-center justify-center text-white text-2xl font-bold">
                      {feature.num}
                    </div>
                    <div className="w-12 h-12 border-4 border-[#2a2a2a] group-hover:bg-[#D2691E] transition-colors" />
                  </div>

                  <h3 className="text-3xl font-bold mb-4 tracking-tight text-[#2a2a2a]">
                    {feature.title}
                  </h3>

                  <p className="text-base text-[#2a2a2a]/70 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo - Layered Comparison */}
      <section className="py-32 px-8 bg-[#D2691E]/10 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block bg-[#4A2C2A] text-white px-6 py-2 border-4 border-[#2a2a2a] mb-6"
              style={{ boxShadow: '6px 6px 0 rgba(210,105,30,0.4)' }}
            >
              <span className="text-sm uppercase tracking-widest font-bold">Layer 03 / Demo</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold">
              See the <span className="text-[#D2691E]">Transformation</span>
            </h2>
          </motion.div>

          {/* Stacked Input/Output */}
          <div className="relative">
            {/* Input Card - Bottom Layer */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative z-10 bg-[#F5E6D3] border-4 border-[#2a2a2a] p-10 max-w-2xl"
              style={{ boxShadow: '16px 16px 0 rgba(74,44,42,0.15)' }}
            >
              <div className="text-sm uppercase tracking-widest text-[#D2691E] mb-4 font-bold">
                Digital Input
              </div>
              <p className="text-2xl text-[#2a2a2a] leading-relaxed font-space-mono">
                The five boxing wizards jump quickly
              </p>
            </motion.div>

            {/* Output Card - Top Layer, Offset */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative z-20 bg-white border-4 border-[#2a2a2a] p-10 max-w-2xl ml-auto -mt-24"
              style={{ boxShadow: '20px 20px 0 rgba(210,105,30,0.2)' }}
            >
              <div className="text-sm uppercase tracking-widest text-[#4A2C2A] mb-4 font-bold">
                Handwritten Output
              </div>
              <p className="font-caveat text-4xl text-[#2a2a2a] leading-relaxed">
                The five boxing wizards jump quickly
              </p>

              {/* Corner Accent */}
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[#D2691E] border-4 border-[#2a2a2a]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA - Massive Layered Card */}
      <section className="py-32 px-8 relative">
        <div className="max-w-5xl mx-auto relative">
          {/* Background Layers */}
          <div className="absolute inset-0 bg-[#4A2C2A] translate-x-8 translate-y-8 opacity-20" />
          <div className="absolute inset-0 bg-[#D2691E] translate-x-4 translate-y-4 opacity-30" />

          {/* Main CTA Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10 bg-[#F5E6D3] border-4 border-[#2a2a2a] p-16 text-center"
            style={{ boxShadow: '24px 24px 0 rgba(74,44,42,0.2)' }}
          >
            <div className="inline-block bg-[#D2691E] text-white px-6 py-2 border-4 border-[#2a2a2a] mb-8"
              style={{ boxShadow: '4px 4px 0 #2a2a2a' }}
            >
              <span className="text-sm uppercase tracking-widest font-bold">Layer 04 / Start</span>
            </div>

            <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              Build Your<br />
              <span className="text-[#D2691E]">Layer Stack</span>
            </h2>

            <p className="text-xl text-[#2a2a2a]/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              Start creating beautiful handwriting today. Stack your words, layer your creativity,
              build something extraordinary.
            </p>

            <button className="bg-[#4A2C2A] text-white px-16 py-5 font-bold text-lg border-4 border-[#2a2a2a] hover:translate-x-2 hover:translate-y-2 transition-transform"
              style={{ boxShadow: '8px 8px 0 #2a2a2a' }}
            >
              Start Free Trial
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer - Layered */}
      <footer className="py-12 px-8 bg-[#4A2C2A] text-white relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D2691E] border-2 border-white" />
            <span className="text-lg font-bold">Handwriting Studio</span>
          </div>
          <div className="text-sm opacity-70">
            © 2024 — Layered with care
          </div>
        </div>
      </footer>
    </div>
  )
}
