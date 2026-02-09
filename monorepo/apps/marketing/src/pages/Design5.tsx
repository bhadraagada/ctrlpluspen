import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 5: PAPER & INK
// Handwritten textures, torn paper edges, analog brutalism
// Palette: Aged cream paper, ink black, sepia, coffee stains
// Typography: Caveat (handwritten) + Courier Prime - authentic, personal

export default function Design5() {
  return (
    <div 
      className="min-h-screen font-courier text-[#2a2118] overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, #f5f0e6 0%, #ebe4d4 50%, #e8e0cc 100%)
        `,
      }}
    >
      {/* Paper texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-10 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Coffee stain decorations */}
      <div className="fixed top-[20%] right-[10%] w-48 h-48 rounded-full opacity-[0.04] pointer-events-none z-0"
        style={{ 
          background: 'radial-gradient(ellipse at center, #8b5a2b 0%, transparent 70%)',
          transform: 'rotate(15deg) scale(1.2, 1)',
        }}
      />
      <div className="fixed bottom-[30%] left-[5%] w-32 h-32 rounded-full opacity-[0.03] pointer-events-none z-0"
        style={{ 
          background: 'radial-gradient(ellipse at center, #8b5a2b 0%, transparent 70%)',
        }}
      />

      {/* Navigation - handwritten style */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#f5f0e6]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-6 border-b-2 border-dashed border-[#2a2118]/20">
          <div className="font-caveat text-3xl font-bold">
            Handwriting Studio
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#" className="hover:underline underline-offset-4 decoration-wavy">About</a>
            <a href="#" className="hover:underline underline-offset-4 decoration-wavy">Features</a>
            <a href="#" className="hover:underline underline-offset-4 decoration-wavy">Pricing</a>
          </div>
          <button className="font-caveat text-xl border-2 border-[#2a2118] px-6 py-2 hover:bg-[#2a2118] hover:text-[#f5f0e6] transition-all rounded-sm rotate-[-1deg]">
            Sign In
          </button>
        </div>
      </nav>

      {/* Design Switcher */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-[#f5f0e6] border-2 border-[#2a2118] p-2 shadow-[4px_4px_0_rgba(42,33,24,0.3)]">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center font-caveat text-xl ${
              n === 5 ? 'bg-[#2a2118] text-[#f5f0e6]' : 'hover:bg-[#2a2118]/10'
            } transition-colors`}
            style={{ transform: `rotate(${(n - 3) * 2}deg)` }}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-24 px-8 relative z-20">
        <div className="max-w-6xl mx-auto w-full">
          {/* Notebook paper effect */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            transition={{ duration: 0.8 }}
            className="relative bg-white p-8 md:p-16 shadow-[8px_8px_30px_rgba(0,0,0,0.1)]"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  transparent,
                  transparent 31px,
                  #e8e0cc 31px,
                  #e8e0cc 32px
                )
              `,
              backgroundPosition: '0 40px',
            }}
          >
            {/* Red margin line */}
            <div className="absolute left-16 md:left-24 top-0 bottom-0 w-px bg-[#c9a0a0]/40" />
            
            {/* Spiral binding holes */}
            <div className="absolute left-4 top-8 bottom-8 flex flex-col justify-between">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full border-2 border-[#2a2118]/20" />
              ))}
            </div>

            {/* Content */}
            <div className="ml-8 md:ml-16">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-caveat text-lg text-[#666] mb-4"
              >
                Dear Creator,
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="font-caveat text-5xl md:text-7xl lg:text-8xl leading-[1.1] mb-8"
              >
                Turn your words<br />
                <span className="relative inline-block">
                  into handwriting
                  <svg className="absolute -bottom-2 left-0 w-full h-4" viewBox="0 0 200 10" preserveAspectRatio="none">
                    <path d="M0,5 Q50,0 100,5 T200,5" stroke="#2a2118" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-lg text-[#666] max-w-xl leading-relaxed mb-12"
              >
                Our AI captures the beauty of human handwriting — the slight
                wobbles, the character variations, the personal touch that makes
                each piece unique.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex flex-wrap gap-4"
              >
                <button 
                  className="font-caveat text-2xl bg-[#2a2118] text-[#f5f0e6] px-10 py-4 hover:bg-[#1a1510] transition-colors shadow-[4px_4px_0_rgba(42,33,24,0.3)]"
                  style={{ transform: 'rotate(1deg)' }}
                >
                  Start Writing
                </button>
                <button 
                  className="font-caveat text-2xl border-2 border-[#2a2118] px-10 py-4 hover:bg-[#2a2118]/10 transition-colors"
                  style={{ transform: 'rotate(-1deg)' }}
                >
                  See Examples
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="font-caveat text-xl text-[#666] mt-12"
              >
                — The Handwriting Studio Team
              </motion.div>
            </div>

            {/* Torn paper edge - bottom */}
            <div 
              className="absolute -bottom-4 left-0 right-0 h-8 bg-white"
              style={{
                clipPath: 'polygon(0% 100%, 2% 60%, 5% 80%, 8% 50%, 12% 70%, 15% 40%, 20% 65%, 25% 35%, 30% 60%, 35% 30%, 40% 55%, 45% 25%, 50% 50%, 55% 20%, 60% 45%, 65% 15%, 70% 40%, 75% 10%, 80% 35%, 85% 5%, 90% 30%, 95% 0%, 100% 25%, 100% 100%)',
              }}
            />
          </motion.div>

          {/* Scattered notes decoration */}
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 12 }}
            transition={{ delay: 1.2 }}
            className="absolute top-20 right-0 lg:right-20 bg-[#fffacd] p-6 shadow-lg hidden lg:block"
            style={{ transform: 'rotate(12deg)' }}
          >
            <div className="font-caveat text-xl text-[#2a2118]">
              "Amazing tool!"<br />
              - Sarah M.
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features - Index cards */}
      <section className="py-24 px-8 relative z-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-caveat text-5xl md:text-6xl text-center mb-16"
          >
            What makes us special
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                title: 'AI Magic', 
                desc: 'Neural networks trained on real handwriting samples',
                rotate: '-2deg',
                color: '#fff9e6'
              },
              { 
                title: 'Team Work', 
                desc: 'Collaborate with shared credits and galleries',
                rotate: '1deg',
                color: '#f0fff0'
              },
              { 
                title: 'SVG Output', 
                desc: 'Vector files that scale beautifully',
                rotate: '-1deg',
                color: '#fff0f5'
              },
              { 
                title: 'Your Gallery', 
                desc: 'Save and organize all your creations',
                rotate: '2deg',
                color: '#f0f8ff'
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 shadow-[4px_4px_15px_rgba(0,0,0,0.1)] border border-[#2a2118]/10"
                style={{ 
                  backgroundColor: card.color,
                  transform: `rotate(${card.rotate})`,
                }}
              >
                {/* Index card lines */}
                <div className="w-full h-px bg-[#c9a0a0]/30 mb-4" />
                <h3 className="font-caveat text-3xl mb-3">{card.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo - Letter style */}
      <section className="py-24 px-8 relative z-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-12 md:p-16 shadow-[0_10px_40px_rgba(0,0,0,0.1)] relative"
            style={{ transform: 'rotate(0.5deg)' }}
          >
            {/* Wax seal decoration */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#8b0000] shadow-lg flex items-center justify-center">
              <span className="font-caveat text-2xl text-[#f5f0e6]">HS</span>
            </div>

            <div className="text-center mb-12">
              <div className="font-caveat text-2xl text-[#666] mb-2">Before</div>
              <div className="text-xl md:text-2xl text-[#2a2118] p-6 bg-[#f8f8f8] border-2 border-dashed border-[#ddd]">
                The quick brown fox jumps over the lazy dog.
              </div>
            </div>

            <div className="flex justify-center mb-12">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-caveat text-4xl text-[#2a2118]"
              >
                ↓
              </motion.div>
            </div>

            <div className="text-center">
              <div className="font-caveat text-2xl text-[#666] mb-2">After</div>
              <div 
                className="p-8 bg-[#fffef8]"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      transparent,
                      transparent 27px,
                      #e8e0cc 27px,
                      #e8e0cc 28px
                    )
                  `,
                }}
              >
                <div className="font-caveat text-4xl md:text-5xl text-[#1a1510] leading-relaxed">
                  The quick brown fox jumps over the lazy dog.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials - Postcards */}
      <section className="py-24 px-8 relative z-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-caveat text-5xl text-center mb-16"
          >
            Love letters from our users
          </motion.div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              { text: "Finally, a tool that gets handwriting right!", author: "Emma L.", rotate: '-3deg' },
              { text: "Our design team uses this daily.", author: "Mark T.", rotate: '2deg' },
              { text: "The SVG output is incredible quality.", author: "Lisa K.", rotate: '-1deg' },
            ].map((quote, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="w-72 bg-white p-6 shadow-[4px_4px_15px_rgba(0,0,0,0.1)]"
                style={{ transform: `rotate(${quote.rotate})` }}
              >
                {/* Postcard lines */}
                <div className="border-b-2 border-[#2a2118]/10 mb-4 pb-4">
                  <div className="w-16 h-12 border-2 border-[#2a2118]/20 float-right ml-4 flex items-center justify-center text-xs text-[#666]">
                    STAMP
                  </div>
                </div>
                <p className="font-caveat text-2xl text-[#2a2118] mb-4">"{quote.text}"</p>
                <p className="text-sm text-[#666]">— {quote.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Envelope style */}
      <section className="py-24 px-8 relative z-20">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#e8d5b5] p-12 md:p-16 shadow-[0_10px_40px_rgba(0,0,0,0.15)] relative"
            style={{ transform: 'rotate(-0.5deg)' }}
          >
            {/* Envelope fold lines */}
            <div className="absolute top-0 left-1/2 w-px h-12 bg-[#2a2118]/10" />
            <div className="absolute top-0 left-0 w-12 h-px bg-[#2a2118]/10" style={{ transform: 'rotate(45deg)', transformOrigin: 'top left' }} />
            <div className="absolute top-0 right-0 w-12 h-px bg-[#2a2118]/10" style={{ transform: 'rotate(-45deg)', transformOrigin: 'top right' }} />

            <div className="text-center">
              <div className="font-caveat text-5xl md:text-6xl text-[#2a2118] mb-6">
                Ready to start?
              </div>
              <p className="text-lg text-[#2a2118]/70 mb-10 max-w-md mx-auto">
                Join thousands of creators who have discovered the beauty of AI-generated handwriting.
              </p>
              <button 
                className="font-caveat text-3xl bg-[#2a2118] text-[#f5f0e6] px-14 py-5 hover:bg-[#1a1510] transition-colors shadow-[4px_4px_0_rgba(42,33,24,0.4)]"
                style={{ transform: 'rotate(1deg)' }}
              >
                Create Free Account
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t-2 border-dashed border-[#2a2118]/20 relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-caveat text-2xl">Handwriting Studio</div>
          <div className="flex gap-8 text-sm text-[#666]">
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
          <div className="font-caveat text-lg text-[#666]">Made with love, 2024</div>
        </div>
      </footer>
    </div>
  )
}
