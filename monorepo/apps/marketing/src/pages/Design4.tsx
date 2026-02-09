import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

// Design 4: DIGITAL BRUTALISM
// Glitch effects, scan lines, terminal aesthetic, cyber-punk
// Palette: Pure black, toxic green, glitch magenta/cyan
// Typography: Courier Prime - terminal, raw, digital

export default function Design4() {
  const [glitchText, setGlitchText] = useState('HANDWRITING')
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    // Glitch effect
    const glitchInterval = setInterval(() => {
      const chars = 'HANDWRITING'
      const glitched = chars.split('').map((c, i) => {
        if (Math.random() > 0.9) {
          return String.fromCharCode(33 + Math.floor(Math.random() * 93))
        }
        return c
      }).join('')
      setGlitchText(glitched)
      setTimeout(() => setGlitchText('HANDWRITING'), 100)
    }, 3000)

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v)
    }, 530)

    return () => {
      clearInterval(glitchInterval)
      clearInterval(cursorInterval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-courier text-[#00ff41] overflow-hidden relative">
      {/* Scan lines overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)',
        }}
      />

      {/* CRT flicker effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.02] animate-pulse"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #000 100%)' }}
      />

      {/* Noise texture */}
      <div 
        className="fixed inset-0 pointer-events-none z-30 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-[#00ff41]/30 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            <span className="text-[#ff00ff]">[</span>
            <span className="text-sm">HANDWRITING.STUDIO</span>
            <span className="text-[#ff00ff]">]</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-[#00ffff] transition-colors">./features</a>
            <a href="#" className="hover:text-[#00ffff] transition-colors">./pricing</a>
            <a href="#" className="hover:text-[#00ffff] transition-colors">./docs</a>
          </div>
          <button className="border border-[#00ff41] px-4 py-2 text-xs uppercase tracking-widest hover:bg-[#00ff41] hover:text-black transition-all">
            {">"} LOGIN
          </button>
        </div>
      </nav>

      {/* Design Switcher */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex border border-[#00ff41]/50 bg-[#0a0a0a]">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center text-xs font-bold border-r border-[#00ff41]/30 last:border-r-0 ${
              n === 4 ? 'bg-[#00ff41] text-black' : 'hover:bg-[#00ff41]/10'
            } transition-colors`}
          >
            0{n}
          </Link>
        ))}
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-16 relative">
        <div className="w-full px-8 relative z-10">
          {/* Terminal window */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto"
          >
            {/* Terminal header */}
            <div className="flex items-center gap-2 border border-[#00ff41]/30 border-b-0 bg-[#111] px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
              <span className="ml-4 text-xs text-[#666]">handwriting@studio:~</span>
            </div>

            {/* Terminal body */}
            <div className="border border-[#00ff41]/30 bg-[#0d0d0d] p-8 md:p-12">
              <div className="text-xs text-[#666] mb-4">
                $ cat /etc/motd
              </div>
              
              {/* ASCII art title */}
              <pre className="text-[#00ff41] text-xs md:text-sm leading-tight mb-8 overflow-x-auto">
{`
██╗  ██╗ █████╗ ███╗   ██╗██████╗ ██╗    ██╗██████╗ ██╗████████╗██╗███╗   ██╗ ██████╗ 
██║  ██║██╔══██╗████╗  ██║██╔══██╗██║    ██║██╔══██╗██║╚══██╔══╝██║████╗  ██║██╔════╝ 
███████║███████║██╔██╗ ██║██║  ██║██║ █╗ ██║██████╔╝██║   ██║   ██║██╔██╗ ██║██║  ███╗
██╔══██║██╔══██║██║╚██╗██║██║  ██║██║███╗██║██╔══██╗██║   ██║   ██║██║╚██╗██║██║   ██║
██║  ██║██║  ██║██║ ╚████║██████╔╝╚███╔███╔╝██║  ██║██║   ██║   ██║██║ ╚████║╚██████╔╝
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
`}
              </pre>

              {/* Glitch title */}
              <div className="relative mb-8">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight relative">
                  <span className="absolute -left-[2px] -top-[2px] text-[#ff00ff] opacity-70 blur-[1px]">
                    {glitchText}.STUDIO
                  </span>
                  <span className="absolute left-[2px] top-[2px] text-[#00ffff] opacity-70 blur-[1px]">
                    {glitchText}.STUDIO
                  </span>
                  <span className="relative">{glitchText}.STUDIO</span>
                </h1>
              </div>

              <div className="text-xs text-[#666] mb-2">$ ./describe --verbose</div>
              <p className="text-lg text-[#00ff41]/80 mb-8 max-w-2xl leading-relaxed">
                {">"} AI-powered text-to-handwriting synthesis engine.<br />
                {">"} Transform digital text into authentic human handwriting.<br />
                {">"} Vector SVG output. Team collaboration. Gallery storage.
              </p>

              <div className="text-xs text-[#666] mb-4">$ ./actions</div>
              <div className="flex flex-wrap gap-4">
                <button className="bg-[#00ff41] text-black px-8 py-3 font-bold uppercase text-sm hover:bg-[#00ffff] transition-colors flex items-center gap-2">
                  <span>{">"}</span> INITIALIZE
                </button>
                <button className="border border-[#00ff41] px-8 py-3 font-bold uppercase text-sm hover:bg-[#00ff41]/10 transition-colors flex items-center gap-2">
                  <span className="text-[#ff00ff]">$</span> READ_DOCS
                </button>
              </div>

              <div className="mt-8 text-xs text-[#666]">
                $ {cursorVisible ? '█' : ' '}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Side decorations */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:block">
          <div className="flex flex-col gap-2 text-xs text-[#333]">
            {[...Array(20)].map((_, i) => (
              <span key={i}>{Math.random().toString(16).substring(2, 10)}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Code blocks */}
      <section className="py-24 px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs text-[#666] mb-4">$ ls -la /features</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-16">
            <span className="text-[#ff00ff]">//</span> SYSTEM_CAPABILITIES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { 
                name: 'synthesis.engine', 
                desc: 'Neural network transforms text into authentic handwriting with natural variations',
                status: 'ACTIVE',
                color: '#00ff41'
              },
              { 
                name: 'team.workspace', 
                desc: 'Collaborate with shared credit pools and generation galleries',
                status: 'ACTIVE',
                color: '#00ffff'
              },
              { 
                name: 'export.vector', 
                desc: 'SVG output that scales infinitely without quality loss',
                status: 'ACTIVE',
                color: '#ff00ff'
              },
              { 
                name: 'storage.gallery', 
                desc: 'Persistent storage for all generated handwriting assets',
                status: 'ACTIVE',
                color: '#ffff00'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border border-[#00ff41]/30 bg-[#0d0d0d] p-6 hover:border-[#00ff41] transition-colors group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[#666] text-xs">module://</span>
                  <span className="text-xs px-2 py-1 border" style={{ borderColor: feature.color, color: feature.color }}>
                    {feature.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-[#00ffff] transition-colors">
                  {feature.name}
                </h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  {"// "}{feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 px-8 border-t border-b border-[#00ff41]/20 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-[#666] mb-4">$ ./demo --interactive</div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input */}
            <div className="border border-[#00ff41]/30 bg-[#0d0d0d]">
              <div className="border-b border-[#00ff41]/30 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-[#666]">input.txt</span>
                <span className="text-xs text-[#00ff41]">STDIN</span>
              </div>
              <div className="p-6">
                <pre className="text-[#00ff41]/80 text-lg">
{`> Hello, World!
> This is your text.
> Ready for synthesis.`}
                </pre>
              </div>
            </div>

            {/* Output */}
            <div className="border border-[#ff00ff]/30 bg-[#0d0d0d]">
              <div className="border-b border-[#ff00ff]/30 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-[#666]">output.svg</span>
                <span className="text-xs text-[#ff00ff]">STDOUT</span>
              </div>
              <div className="p-6 bg-[#fffef5]">
                <div className="font-caveat text-3xl text-[#0a0a0a] leading-relaxed">
                  Hello, World!<br />
                  This is your text.<br />
                  Ready for synthesis.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10,847', label: 'USERS_ACTIVE' },
              { value: '1.2M', label: 'GENERATIONS_TOTAL' },
              { value: '99.97%', label: 'UPTIME_PERCENT' },
              { value: '<50ms', label: 'LATENCY_AVG' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-5xl font-bold text-[#00ff41] mb-2">{stat.value}</div>
                <div className="text-xs text-[#666] tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 bg-[#00ff41] relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs text-black/50 mb-4">$ sudo ./activate</div>
          <h2 className="text-4xl md:text-6xl font-bold text-black mb-8">
            READY_TO_EXECUTE?
          </h2>
          <p className="text-lg text-black/70 mb-12 max-w-lg mx-auto">
            Initialize your instance. Start generating authentic handwriting today.
          </p>
          <button className="bg-black text-[#00ff41] px-12 py-4 font-bold text-lg hover:bg-[#111] transition-colors">
            {">"} START_INSTANCE
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-[#00ff41]/20 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs">
          <span className="text-[#666]">[HANDWRITING.STUDIO] v2.4.1</span>
          <div className="flex gap-8 text-[#666]">
            <a href="#" className="hover:text-[#00ff41]">./terms</a>
            <a href="#" className="hover:text-[#00ff41]">./privacy</a>
            <a href="#" className="hover:text-[#00ff41]">./status</a>
          </div>
          <span className="text-[#333]">© 2024 // EOF</span>
        </div>
      </footer>
    </div>
  )
}
