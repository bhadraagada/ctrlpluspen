import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 1: RAW CONCRETE BRUTALISM
// Heavy monolithic blocks, exposed structural grid, raw textures
// Palette: Concrete grays, black, single orange accent
// Typography: Space Mono - industrial, mechanical

export default function Design1() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] font-space-mono text-[#e5e5e5] overflow-x-hidden">
      {/* Noise overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b-4 border-[#333] bg-[#1a1a1a]">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff6b35]" />
            <span className="text-xl font-bold tracking-tighter">HANDWRITING.STUDIO</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest">
            <a href="#features" className="hover:text-[#ff6b35] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#ff6b35] transition-colors">Pricing</a>
            <a href="#docs" className="hover:text-[#ff6b35] transition-colors">Docs</a>
          </div>
          <button className="bg-[#ff6b35] text-black px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-[#ff8555] transition-colors">
            Start Free
          </button>
        </div>
      </nav>

      {/* Design Switcher */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-[#0a0a0a] border-2 border-[#333] p-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center font-bold ${
              n === 1 ? 'bg-[#ff6b35] text-black' : 'bg-[#222] hover:bg-[#333]'
            }`}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-8">
        <div className="max-w-7xl mx-auto">
          {/* Exposed Grid Structure */}
          <div className="grid grid-cols-12 gap-4 mb-16">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="h-2 bg-[#333] origin-bottom"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Title Block */}
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-8"
            >
              <div className="bg-[#0d0d0d] border-4 border-[#333] p-12">
                <div className="text-sm uppercase tracking-[0.3em] text-[#666] mb-4">
                  [ AI-POWERED SYNTHESIS ]
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.85] tracking-tighter mb-8">
                  TURN
                  <br />
                  <span className="text-[#ff6b35]">TEXT</span>
                  <br />
                  INTO
                  <br />
                  <span className="inline-block border-4 border-[#ff6b35] px-4">HANDWRITING</span>
                </h1>
                <p className="text-lg text-[#888] max-w-xl leading-relaxed">
                  Generate authentic handwritten text from any input. 
                  Perfect for letters, notes, signatures, and creative projects.
                </p>
              </div>
            </motion.div>

            {/* Side Stats Block */}
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-4 flex flex-col gap-4"
            >
              <div className="bg-[#ff6b35] text-black p-8 flex-1">
                <div className="text-6xl font-bold">∞</div>
                <div className="text-sm uppercase tracking-widest mt-2">Styles Available</div>
              </div>
              <div className="bg-[#222] border-4 border-[#333] p-8 flex-1">
                <div className="text-5xl font-bold text-[#ff6b35]">SVG</div>
                <div className="text-sm uppercase tracking-widest mt-2 text-[#666]">Vector Output</div>
              </div>
              <div className="bg-[#0d0d0d] border-4 border-[#333] p-8 flex-1">
                <div className="text-5xl font-bold">24/7</div>
                <div className="text-sm uppercase tracking-widest mt-2 text-[#666]">Always Online</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Blocks */}
      <section className="py-20 px-8 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="text-sm uppercase tracking-[0.3em] text-[#666] mb-4">
              [ CORE CAPABILITIES ]
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
              BUILT FOR<br />
              <span className="text-[#ff6b35]">CREATORS</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'SYNTHESIS ENGINE', desc: 'AI transforms your text into natural handwriting with authentic variations and imperfections.', num: '01' },
              { title: 'TEAM WORKSPACES', desc: 'Collaborate with your team. Share credits, manage members, view shared generations.', num: '02' },
              { title: 'GALLERY STORAGE', desc: 'Save your creations. Browse, download, and manage all your generated handwriting.', num: '03' },
              { title: 'CREDITS SYSTEM', desc: 'Personal and team credit pools. Pay only for what you use.', num: '04' },
            ].map((feature, i) => (
              <motion.div
                key={feature.num}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border-4 border-[#333] p-8 hover:border-[#ff6b35] transition-colors group"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-7xl font-bold text-[#222] group-hover:text-[#ff6b35] transition-colors">
                    {feature.num}
                  </span>
                  <div className="w-12 h-12 border-4 border-[#333] group-hover:border-[#ff6b35] group-hover:bg-[#ff6b35] transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-[#888] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Block */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="bg-[#0d0d0d] border-4 border-[#333] p-8"
            >
              <div className="text-sm uppercase tracking-[0.3em] text-[#666] mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-[#ff6b35]" />
                INPUT
              </div>
              <div className="font-mono text-lg text-[#888] leading-relaxed p-4 bg-[#1a1a1a] border-2 border-[#333]">
                Hello, this is a sample text that will be transformed into beautiful handwriting.
              </div>
            </motion.div>

            {/* Output Block */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#f5f5dc] p-8 relative"
            >
              <div className="absolute top-4 right-4 text-sm uppercase tracking-[0.3em] text-[#333] flex items-center gap-2">
                OUTPUT
                <span className="w-3 h-3 bg-[#333]" />
              </div>
              <div className="font-caveat text-4xl text-[#1a1a1a] leading-relaxed pt-8">
                Hello, this is a sample text that will be transformed into beautiful handwriting.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 bg-[#ff6b35]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-black tracking-tighter mb-8">
              START CREATING<br />TODAY
            </h2>
            <p className="text-xl text-black/70 mb-12 max-w-xl mx-auto">
              Join thousands of creators using Handwriting Studio for their projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-black text-white px-12 py-4 font-bold uppercase tracking-widest hover:bg-[#222] transition-colors">
                Get Started Free
              </button>
              <button className="border-4 border-black text-black px-12 py-4 font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                View Docs
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t-4 border-[#333]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#ff6b35]" />
            <span className="font-bold tracking-tighter">HANDWRITING.STUDIO</span>
          </div>
          <div className="text-sm text-[#666] uppercase tracking-widest">
            © 2024 All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  )
}
