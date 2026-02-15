import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

// Design 9: TERMINAL UI
// Command-line inspired, monospace heavy, hacker aesthetic
// Palette: Terminal green (#00FF41), black (#0a0a0a), matrix green (#008F11)
// Typography: Courier Prime - pure monospace, terminal font

export default function Design9() {
  const [displayText, setDisplayText] = useState('')
  const fullText = 'handwriting-synthesis-cli v2.0.1'

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-courier-prime text-[#00FF41] overflow-hidden">
      {/* CRT Scanline Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,65,0.05) 1px, rgba(0,255,65,0.05) 2px)',
        }}
      />

      {/* CRT Glow Effect */}
      <div className="fixed inset-0 pointer-events-none z-40 bg-gradient-radial from-[#00FF41]/5 via-transparent to-transparent opacity-50" />

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          41.99% { opacity: 1; }
          42% { opacity: 0.8; }
          43% { opacity: 1; }
          45.99% { opacity: 1; }
          46% { opacity: 0.9; }
          46.5% { opacity: 1; }
        }
        .cursor-blink {
          animation: blink 1s infinite;
        }
        .terminal-flicker {
          animation: flicker 0.15s infinite;
        }
      `}</style>

      {/* Top System Bar - Terminal Window */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a] border-b border-[#00FF41]/30">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="ml-3 text-[#00FF41]/60">
              {displayText}<span className="cursor-blink">_</span>
            </span>
          </div>
          <div className="text-xs text-[#00FF41]/60">
            [root@localhost ~]#
          </div>
        </div>
      </div>

      {/* Design Switcher - Terminal Tabs */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-0 bg-[#0a0a0a] border border-[#00FF41]/30">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Link
            key={n}
            to={`/${n}`}
            className={`w-10 h-10 flex items-center justify-center text-xs font-bold border-r border-[#00FF41]/30 last:border-r-0 transition-all ${
              n === 9
                ? 'bg-[#00FF41] text-[#0a0a0a]'
                : 'bg-[#0a0a0a] text-[#00FF41] hover:bg-[#00FF41]/10'
            }`}
          >
            {n}
          </Link>
        ))}
      </div>

      {/* Main Terminal Content */}
      <div className="pt-16 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Terminal Header */}
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-2 text-sm"
            >
              <div className="text-[#00FF41]/60">
                <span className="text-[#00FF41]">$</span> cat /etc/motd
              </div>
              <div className="border-l-2 border-[#00FF41]/30 pl-4 py-2">
                <pre className="text-xs leading-relaxed">
{`╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   █  █  ▄▀█  █▄ █  █▀▄  █   █ █▀█  █  ▀█▀  █  █▄ █  █▀▀     ║
║   █▀█  █▀█  █ ▀█  █▄▀  ▀▄▀▄▀ █▀▄  █   █   █  █ ▀█  █▄█     ║
║                                                               ║
║              S Y N T H E S I S   C L I   v2.0                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝`}
                </pre>
              </div>
            </motion.div>
          </section>

          {/* Command Prompt - Hero */}
          <section className="mb-20">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="space-y-4 text-sm"
            >
              <div>
                <span className="text-[#00FF41]">$</span>{' '}
                <span className="text-white">./handwriting-synthesis</span>{' '}
                <span className="text-[#00FF41]/60">--help</span>
              </div>

              <div className="border-l-2 border-[#00FF41]/30 pl-6 py-4 space-y-4">
                <div>
                  <div className="text-white text-2xl md:text-4xl mb-4 font-bold tracking-tight">
                    USAGE: handwriting-synthesis [OPTIONS]
                  </div>
                  <div className="text-[#00FF41]/70 max-w-3xl leading-relaxed">
                    A powerful command-line interface for transforming digital text
                    into authentic AI-generated handwriting. Supports multiple styles,
                    batch processing, and vector output formats.
                  </div>
                </div>

                <div className="pt-4">
                  <div className="text-white mb-2">OPTIONS:</div>
                  <div className="space-y-1 text-xs pl-4">
                    <div>
                      <span className="text-[#00FF41]">--text</span>
                      <span className="text-[#00FF41]/60">, -t</span>
                      <span className="text-white/60 ml-8">Input text to synthesize</span>
                    </div>
                    <div>
                      <span className="text-[#00FF41]">--style</span>
                      <span className="text-[#00FF41]/60">, -s</span>
                      <span className="text-white/60 ml-7">Handwriting style (0-12)</span>
                    </div>
                    <div>
                      <span className="text-[#00FF41]">--format</span>
                      <span className="text-[#00FF41]/60">, -f</span>
                      <span className="text-white/60 ml-6">Output format (svg|png|pdf)</span>
                    </div>
                    <div>
                      <span className="text-[#00FF41]">--batch</span>
                      <span className="text-[#00FF41]/60">, -b</span>
                      <span className="text-white/60 ml-7">Process multiple files</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button className="bg-[#00FF41] text-[#0a0a0a] px-6 py-2 font-bold hover:bg-white transition-colors">
                    [EXECUTE]
                  </button>
                  <button className="border border-[#00FF41]/50 text-[#00FF41] px-6 py-2 font-bold hover:bg-[#00FF41]/10 transition-colors">
                    [DOCS]
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Features Section - Command List */}
          <section className="mb-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-3 text-sm"
            >
              <div>
                <span className="text-[#00FF41]">$</span>{' '}
                <span className="text-white">ls -la /modules</span>
              </div>

              <div className="border-l-2 border-[#00FF41]/30 pl-6 space-y-6">
                {[
                  {
                    name: 'neural-engine.so',
                    size: '524K',
                    desc: 'LSTM-based synthesis core. Generates stroke coordinates with human-like variation.',
                    permissions: 'rwxr-xr-x',
                  },
                  {
                    name: 'team-manager.so',
                    size: '128K',
                    desc: 'Multi-user workspace system. Shared credits, collaborative galleries, role management.',
                    permissions: 'rwxr-xr-x',
                  },
                  {
                    name: 'gallery-db.so',
                    size: '256K',
                    desc: 'Persistent storage engine. Tag, search, organize all generated handwriting assets.',
                    permissions: 'rwxr-xr-x',
                  },
                  {
                    name: 'export-pipeline.so',
                    size: '192K',
                    desc: 'Multi-format output processor. SVG vectors, PNG rasters, PDF documents.',
                    permissions: 'rwxr-xr-x',
                  },
                ].map((module, i) => (
                  <motion.div
                    key={module.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="hover:bg-[#00FF41]/5 p-4 -ml-4 transition-colors border border-transparent hover:border-[#00FF41]/30"
                  >
                    <div className="flex items-start gap-4 mb-2">
                      <span className="text-[#00FF41]/60 text-xs">{module.permissions}</span>
                      <span className="text-[#00FF41]/60 text-xs w-16">{module.size}</span>
                      <span className="text-white font-bold">{module.name}</span>
                    </div>
                    <div className="text-[#00FF41]/70 text-xs ml-32">
                      {module.desc}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Demo Section - Command Execution */}
          <section className="mb-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-3 text-sm"
            >
              <div>
                <span className="text-[#00FF41]">$</span>{' '}
                <span className="text-white">./handwriting-synthesis</span>{' '}
                <span className="text-[#00FF41]/60">-t "Hello World" -s 3 -f svg</span>
              </div>

              <div className="border-l-2 border-[#00FF41]/30 pl-6 py-4 space-y-4">
                <div className="text-xs space-y-1">
                  <div className="text-[#00FF41]/60">[INFO] Initializing neural engine...</div>
                  <div className="text-[#00FF41]/60">[INFO] Loading style model: style_3.h5</div>
                  <div className="text-[#00FF41]/60">[INFO] Processing input text...</div>
                  <div className="text-[#00FF41]">[SUCCESS] Synthesis complete (1.24s)</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  {/* Input Display */}
                  <div className="border border-[#00FF41]/30 p-6">
                    <div className="text-xs text-[#00FF41]/60 mb-3">INPUT.TXT</div>
                    <div className="text-lg text-white font-space-mono">
                      Hello World
                    </div>
                    <div className="mt-4 text-xs text-[#00FF41]/40">
                      11 bytes | ASCII | UTF-8
                    </div>
                  </div>

                  {/* Output Display */}
                  <div className="border border-[#00FF41]/30 p-6 bg-white">
                    <div className="text-xs text-black/40 mb-3">OUTPUT.SVG</div>
                    <div className="font-caveat text-4xl text-black">
                      Hello World
                    </div>
                    <div className="mt-4 text-xs text-black/40">
                      Vector | Scalable | 2.3KB
                    </div>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-[#00FF41]">[OUTPUT]</span>{' '}
                  <span className="text-white/60">Saved to: </span>
                  <span className="text-white">./output/handwriting_20240615_143022.svg</span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Stats Section - System Info */}
          <section className="mb-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-3 text-sm"
            >
              <div>
                <span className="text-[#00FF41]">$</span>{' '}
                <span className="text-white">systemctl status handwriting-synthesis</span>
              </div>

              <div className="border-l-2 border-[#00FF41]/30 pl-6 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                  <span className="text-white">Active: </span>
                  <span className="text-[#00FF41]">running</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                  <div className="border border-[#00FF41]/30 p-4">
                    <div className="text-[#00FF41]/60 mb-1">UPTIME</div>
                    <div className="text-white text-2xl font-bold">99.9%</div>
                  </div>
                  <div className="border border-[#00FF41]/30 p-4">
                    <div className="text-[#00FF41]/60 mb-1">AVG LATENCY</div>
                    <div className="text-white text-2xl font-bold">1.2s</div>
                  </div>
                  <div className="border border-[#00FF41]/30 p-4">
                    <div className="text-[#00FF41]/60 mb-1">STYLES</div>
                    <div className="text-white text-2xl font-bold">13</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* CTA Section - Install Command */}
          <section className="mb-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="border-2 border-[#00FF41]/50 p-8 md:p-12 bg-[#00FF41]/5"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-sm text-[#00FF41]/60 mb-4">READY TO INSTALL?</div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                    Start Synthesizing
                  </h2>
                  <p className="text-[#00FF41]/70 max-w-2xl mx-auto">
                    One command to install. Zero configuration required. Production-ready.
                  </p>
                </div>

                <div className="bg-[#0a0a0a] border border-[#00FF41]/30 p-4 max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#00FF41]">$</span>
                    <span className="text-white">npm install -g handwriting-synthesis</span>
                    <button className="ml-auto text-xs text-[#00FF41] hover:text-white border border-[#00FF41]/30 px-3 py-1">
                      COPY
                    </button>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <button className="bg-[#00FF41] text-[#0a0a0a] px-12 py-4 font-bold hover:bg-white transition-colors">
                    [GET STARTED]
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Footer - Terminal Prompt */}
          <footer className="border-t border-[#00FF41]/30 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <div className="text-[#00FF41]/60">
                handwriting-synthesis-cli v2.0.1
              </div>
              <div className="text-[#00FF41]/60">
                MIT License | © 2024 | All systems operational
              </div>
              <div className="text-[#00FF41]">
                [root@localhost ~]#<span className="cursor-blink">_</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
