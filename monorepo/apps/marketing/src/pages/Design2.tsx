import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 2: DECONSTRUCTED TYPOGRAPHY
// Overlapping text, broken grids, controlled chaos
// Palette: Cream background, black text, red accents
// Typography: Bebas Neue + Outfit - editorial, magazine-style

export default function Design2() {
  return (
    <div className="min-h-screen bg-[#f8f5f0] font-outfit text-[#0a0a0a] overflow-hidden relative">
      {/* Decorative diagonal lines */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-[#0a0a0a]/10"
            style={{
              width: '200%',
              left: '-50%',
              top: `${10 + i * 12}%`,
              transform: 'rotate(-5deg)',
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 mix-blend-difference">
        <div className="flex items-center justify-between px-8 py-6">
          <span className="text-white text-lg font-medium tracking-tight">handwriting.studio</span>
          <div className="hidden md:flex items-center gap-12 text-white text-sm">
            <a href="#" className="hover:opacity-60 transition-opacity">About</a>
            <a href="#" className="hover:opacity-60 transition-opacity">Features</a>
            <a href="#" className="hover:opacity-60 transition-opacity">Pricing</a>
          </div>
          <button className="text-white border border-white/30 px-6 py-2 text-sm hover:bg-white hover:text-black transition-all">
            Sign In
          </button>
        </div>
      </nav>

      {/* Design Switcher */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0a0a0a] p-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center text-sm ${
              n === 2 ? 'bg-[#e63946] text-white' : 'bg-transparent text-white hover:bg-white/10'
            }`}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero Section - Deconstructed */}
      <section className="min-h-screen flex items-center relative pt-20">
        <div className="w-full px-8 relative z-10">
          {/* Massive overlapping title */}
          <div className="relative">
            {/* Background ghost text */}
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 0.03 }}
              transition={{ duration: 1.2 }}
              className="font-bebas text-[20vw] leading-[0.8] absolute -top-20 -left-8 select-none pointer-events-none"
            >
              HAND<br />WRITING
            </motion.div>

            {/* Main title */}
            <div className="relative z-10">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="overflow-hidden"
              >
                <span className="font-bebas text-[15vw] leading-[0.85] block">
                  HAND
                </span>
              </motion.div>
              
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="overflow-hidden flex items-end gap-8"
              >
                <span className="font-bebas text-[15vw] leading-[0.85]">
                  WRITING
                </span>
                <span className="font-bebas text-[4vw] text-[#e63946] pb-[2vw] -ml-4">
                  .STUDIO
                </span>
              </motion.div>
            </div>

            {/* Floating accent elements */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute top-[10%] right-[15%] w-32 h-32 bg-[#e63946]"
            />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute top-[5%] right-[10%] font-caveat text-4xl -rotate-12 text-[#0a0a0a]/60"
            >
              transform text →
            </motion.div>
          </div>

          {/* Offset description */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-md ml-auto mr-[10%] mt-12 relative"
          >
            <div className="absolute -left-8 top-0 w-1 h-full bg-[#e63946]" />
            <p className="text-xl leading-relaxed text-[#0a0a0a]/70">
              AI-powered handwriting synthesis that transforms your digital text 
              into authentic, beautiful handwritten content.
            </p>
            <div className="mt-8 flex gap-4">
              <button className="bg-[#0a0a0a] text-white px-8 py-4 hover:bg-[#e63946] transition-colors">
                Start Creating
              </button>
              <button className="border-2 border-[#0a0a0a] px-8 py-4 hover:bg-[#0a0a0a] hover:text-white transition-all">
                Learn More
              </button>
            </div>
          </motion.div>
        </div>

        {/* Side text */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 writing-mode-vertical hidden lg:block">
          <span className="text-sm tracking-[0.5em] text-[#0a0a0a]/30 uppercase"
            style={{ writingMode: 'vertical-rl' }}
          >
            Text to Handwriting Synthesis
          </span>
        </div>
      </section>

      {/* Features - Asymmetric Grid */}
      <section className="py-32 px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section header - offset */}
          <div className="mb-24 relative">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.05 }}
              viewport={{ once: true }}
              className="font-bebas text-[12vw] absolute -top-16 -left-8 select-none pointer-events-none"
            >
              FEATURES
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-bebas text-6xl md:text-8xl relative z-10"
            >
              WHY USE<br />
              <span className="text-[#e63946]">HANDWRITING</span><br />
              STUDIO?
            </motion.h2>
          </div>

          {/* Asymmetric feature cards */}
          <div className="grid grid-cols-12 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="col-span-12 md:col-span-7 bg-[#0a0a0a] text-white p-12"
            >
              <span className="text-[#e63946] text-sm uppercase tracking-widest">01</span>
              <h3 className="font-bebas text-5xl mt-4 mb-6">AI SYNTHESIS</h3>
              <p className="text-white/60 text-lg max-w-md">
                Our neural network understands the nuances of human handwriting, 
                creating authentic variations in every stroke.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="col-span-12 md:col-span-5 md:mt-24 border-2 border-[#0a0a0a] p-12"
            >
              <span className="text-[#e63946] text-sm uppercase tracking-widest">02</span>
              <h3 className="font-bebas text-5xl mt-4 mb-6">TEAM SPACES</h3>
              <p className="text-[#0a0a0a]/60 text-lg">
                Collaborate seamlessly. Share credits and generations with your entire team.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="col-span-12 md:col-span-5 md:-mt-12 bg-[#e63946] text-white p-12"
            >
              <span className="text-white/60 text-sm uppercase tracking-widest">03</span>
              <h3 className="font-bebas text-5xl mt-4 mb-6">SVG OUTPUT</h3>
              <p className="text-white/80 text-lg">
                Vector-perfect output. Scale infinitely without losing quality.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="col-span-12 md:col-span-7 border-2 border-[#0a0a0a] p-12"
            >
              <span className="text-[#e63946] text-sm uppercase tracking-widest">04</span>
              <h3 className="font-bebas text-5xl mt-4 mb-6">GALLERY STORAGE</h3>
              <p className="text-[#0a0a0a]/60 text-lg max-w-md">
                Save, organize, and access all your generated handwriting. 
                Build your personal collection.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Section - Overlapping */}
      <section className="py-32 px-8 relative">
        <div className="max-w-6xl mx-auto relative">
          {/* Input card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white border-2 border-[#0a0a0a] p-8 md:p-12 relative z-10 max-w-xl"
          >
            <div className="text-sm uppercase tracking-widest text-[#0a0a0a]/40 mb-4">
              Your Text Input
            </div>
            <div className="text-2xl md:text-3xl leading-relaxed text-[#0a0a0a]/80">
              "The quick brown fox jumps over the lazy dog"
            </div>
          </motion.div>

          {/* Arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="absolute left-[45%] top-1/2 -translate-y-1/2 z-20 hidden md:block"
          >
            <div className="w-24 h-24 bg-[#e63946] flex items-center justify-center text-white text-4xl rotate-12">
              →
            </div>
          </motion.div>

          {/* Output card - offset */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[#fffef5] border-2 border-[#0a0a0a] p-8 md:p-12 ml-auto max-w-xl -mt-8 md:-mt-16 relative z-0"
          >
            <div className="text-sm uppercase tracking-widest text-[#0a0a0a]/40 mb-4">
              Handwritten Output
            </div>
            <div className="font-caveat text-4xl md:text-5xl leading-relaxed text-[#0a0a0a]">
              "The quick brown fox jumps over the lazy dog"
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-[#0a0a0a] text-white relative overflow-hidden">
        {/* Background decorative text */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <span className="font-bebas text-[30vw] whitespace-nowrap">
            CREATE CREATE CREATE
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h2 className="font-bebas text-6xl md:text-9xl mb-8">
            READY TO<br />
            <span className="text-[#e63946]">CREATE?</span>
          </h2>
          <p className="text-xl text-white/60 mb-12 max-w-lg mx-auto">
            Join thousands of creators, designers, and teams using Handwriting Studio.
          </p>
          <button className="bg-[#e63946] text-white px-12 py-5 text-lg font-medium hover:bg-[#c62f3b] transition-colors">
            Start Free Trial
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-[#0a0a0a]/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="text-lg font-medium">handwriting.studio</span>
          <div className="flex gap-8 text-sm text-[#0a0a0a]/60">
            <a href="#" className="hover:text-[#0a0a0a]">Terms</a>
            <a href="#" className="hover:text-[#0a0a0a]">Privacy</a>
            <a href="#" className="hover:text-[#0a0a0a]">Contact</a>
          </div>
          <span className="text-sm text-[#0a0a0a]/40">© 2024</span>
        </div>
      </footer>
    </div>
  )
}
