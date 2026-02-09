import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

// Design 3: NEO-BAUHAUS
// Geometric shapes, primary colors, strict modular grid
// Palette: White base, red/blue/yellow primary, black accents
// Typography: Outfit - clean, geometric, modern Bauhaus spirit

export default function Design3() {
  return (
    <div className="min-h-screen bg-white font-outfit text-[#0a0a0a] overflow-hidden">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="w-full h-full opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0a0a0a 1px, transparent 1px),
              linear-gradient(to bottom, #0a0a0a 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Floating geometric shapes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-32 -right-32 w-96 h-96 border-[40px] border-[#e63946] rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#1d3557]"
        />
        <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-[#f4d35e]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b-4 border-[#0a0a0a]">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-[#e63946]" />
              <div className="w-4 h-4 bg-[#1d3557]" />
              <div className="w-4 h-4 bg-[#f4d35e]" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Handwriting Studio</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-sm font-medium">
            <a href="#" className="hover:text-[#e63946] transition-colors">Product</a>
            <a href="#" className="hover:text-[#e63946] transition-colors">Pricing</a>
            <a href="#" className="hover:text-[#e63946] transition-colors">Docs</a>
            <a href="#" className="hover:text-[#e63946] transition-colors">Blog</a>
          </div>
          <button className="bg-[#0a0a0a] text-white px-6 py-3 font-medium hover:bg-[#1d3557] transition-colors">
            Get Started
          </button>
        </div>
      </nav>

      {/* Design Switcher */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex border-4 border-[#0a0a0a]">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-12 h-12 flex items-center justify-center font-semibold border-r-2 last:border-r-0 border-[#0a0a0a] ${
              n === 3 ? 'bg-[#e63946] text-white' : 'bg-white hover:bg-[#f4d35e]'
            } transition-colors`}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Hero Section - Modular Grid */}
      <section className="min-h-screen pt-24 relative z-10">
        <div className="grid grid-cols-12 min-h-[calc(100vh-6rem)]">
          {/* Left column - Title */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-center p-8 lg:p-16 border-r-0 lg:border-r-4 border-[#0a0a0a]">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#e63946]" />
                <span className="text-sm font-medium uppercase tracking-widest">AI-Powered</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.95] tracking-tight mb-8">
                Transform
                <br />
                <span className="inline-flex items-center gap-4">
                  Text
                  <span className="inline-block w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#f4d35e]" />
                </span>
                <br />
                Into Art
              </h1>
              
              <p className="text-xl text-[#0a0a0a]/60 max-w-lg mb-12 leading-relaxed">
                Generate beautiful, authentic handwriting from any text input. 
                Perfect for designers, creators, and teams.
              </p>

              <div className="flex flex-wrap gap-4">
                <button className="bg-[#1d3557] text-white px-10 py-4 font-medium hover:bg-[#0a0a0a] transition-colors">
                  Start Free
                </button>
                <button className="border-4 border-[#0a0a0a] px-10 py-4 font-medium hover:bg-[#f4d35e] transition-colors">
                  Watch Demo
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right column - Visual */}
          <div className="col-span-12 lg:col-span-5 relative bg-[#f8f8f8]">
            {/* Geometric composition */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-full max-w-sm aspect-square">
                {/* Circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="absolute top-0 left-0 w-48 h-48 rounded-full border-8 border-[#e63946]"
                />
                
                {/* Square */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="absolute bottom-0 right-0 w-40 h-40 bg-[#1d3557]"
                />
                
                {/* Triangle */}
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0"
                  style={{
                    borderLeft: '60px solid transparent',
                    borderRight: '60px solid transparent',
                    borderBottom: '100px solid #f4d35e',
                  }}
                />

                {/* Demo text */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-8 left-8 bg-white p-6 border-4 border-[#0a0a0a] shadow-[8px_8px_0_#0a0a0a]"
                >
                  <div className="font-caveat text-3xl text-[#0a0a0a]">
                    Hello World
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t-4 border-[#0a0a0a] relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              title: 'AI Synthesis', 
              desc: 'Neural networks generate authentic handwriting',
              color: 'bg-[#e63946]',
              text: 'text-white'
            },
            { 
              title: 'Team Spaces', 
              desc: 'Collaborate with shared credits and galleries',
              color: 'bg-white',
              text: 'text-[#0a0a0a]'
            },
            { 
              title: 'SVG Export', 
              desc: 'Vector output that scales infinitely',
              color: 'bg-[#1d3557]',
              text: 'text-white'
            },
            { 
              title: 'Gallery', 
              desc: 'Save and organize all your creations',
              color: 'bg-[#f4d35e]',
              text: 'text-[#0a0a0a]'
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`${feature.color} ${feature.text} p-10 border-b-4 md:border-b-0 md:border-r-4 last:border-r-0 border-[#0a0a0a]`}
            >
              <div className="flex items-start justify-between mb-8">
                <span className="text-6xl font-bold opacity-20">0{i + 1}</span>
                {i % 2 === 0 ? (
                  <div className="w-8 h-8 rounded-full border-4 border-current" />
                ) : (
                  <div className="w-8 h-8 border-4 border-current" />
                )}
              </div>
              <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
              <p className="opacity-70">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 px-8 border-t-4 border-[#0a0a0a] relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-6 h-6 rounded-full bg-[#e63946]" />
              <div className="w-6 h-6 bg-[#1d3557]" />
              <div className="w-6 h-6 bg-[#f4d35e]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            </div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">
              How It Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Input Text', desc: 'Type or paste your text content' },
              { step: '02', title: 'Generate', desc: 'AI creates authentic handwriting' },
              { step: '03', title: 'Export', desc: 'Download as SVG or save to gallery' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="border-4 border-[#0a0a0a] p-8 bg-white hover:shadow-[8px_8px_0_#0a0a0a] transition-shadow">
                  <span className="text-7xl font-bold text-[#0a0a0a]/10">{item.step}</span>
                  <h3 className="text-2xl font-semibold mt-4 mb-2">{item.title}</h3>
                  <p className="text-[#0a0a0a]/60">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-8 text-2xl text-[#0a0a0a]">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t-4 border-[#0a0a0a] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left - CTA */}
          <div className="bg-[#0a0a0a] text-white p-12 lg:p-20 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-semibold mb-6 leading-tight">
                Start Creating<br />
                <span className="text-[#f4d35e]">Today</span>
              </h2>
              <p className="text-white/60 text-lg mb-10 max-w-md">
                Join thousands of creators using Handwriting Studio for their projects.
              </p>
              <button className="bg-[#e63946] text-white px-12 py-5 font-medium text-lg hover:bg-[#c62f3b] transition-colors">
                Get Started Free
              </button>
            </motion.div>
          </div>

          {/* Right - Stats */}
          <div className="bg-[#f4d35e] p-12 lg:p-20 grid grid-cols-2 gap-8">
            {[
              { num: '10K+', label: 'Active Users' },
              { num: '1M+', label: 'Generations' },
              { num: '99.9%', label: 'Uptime' },
              { num: '4.9★', label: 'Rating' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold text-[#0a0a0a]">{stat.num}</div>
                <div className="text-[#0a0a0a]/60 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t-4 border-[#0a0a0a] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-[#e63946]" />
              <div className="w-3 h-3 bg-[#1d3557]" />
              <div className="w-3 h-3 bg-[#f4d35e]" />
            </div>
            <span className="font-semibold">Handwriting Studio</span>
          </div>
          <div className="flex gap-8 text-sm text-[#0a0a0a]/60">
            <a href="#" className="hover:text-[#0a0a0a]">Terms</a>
            <a href="#" className="hover:text-[#0a0a0a]">Privacy</a>
            <a href="#" className="hover:text-[#0a0a0a]">Contact</a>
          </div>
          <span className="text-sm text-[#0a0a0a]/40">© 2024 All rights reserved</span>
        </div>
      </footer>
    </div>
  )
}
