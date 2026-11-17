import React, { useState } from 'react';
import { Film, Terminal, Database, ShieldCheck, Sparkles, Tv, Github } from 'lucide-react';
import { Catalog } from './components/Catalog';
import { ProxyTestPage } from './components/ProxyTestPage';
import { EpisodeSourcesModal } from './components/EpisodeSourcesModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'proxy-test'>('catalog');
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('catalog')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-zinc-200 to-emerald-400 bg-clip-text text-transparent">
                  HIKARI
                </span>
                <span className="block text-[10px] tracking-widest text-emerald-400 uppercase font-bold">Anime Streaming & HLS Proxy</span>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'catalog' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                Catálogo
              </button>
              <button
                onClick={() => setActiveTab('proxy-test')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${activeTab === 'proxy-test' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                <Terminal className="w-3.5 h-3.5" /> Benchmark & Proxy Test
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSourcesModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold transition shadow-sm"
            >
              <Database className="w-4 h-4 text-emerald-400" /> Fontes (episode_sources)
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sub-navigation */}
      <div className="md:hidden flex border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-3 text-center text-xs font-semibold transition border-b-2 ${activeTab === 'catalog' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-zinc-400'}`}
        >
          Catálogo de Animes
        </button>
        <button
          onClick={() => setActiveTab('proxy-test')}
          className={`flex-1 py-3 text-center text-xs font-semibold transition border-b-2 ${activeTab === 'proxy-test' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-zinc-400'}`}
        >
          Proxy Test & Benchmark
        </button>
      </div>

      {/* Main Content */}
      <main className="py-6">
        {activeTab === 'catalog' ? (
          <Catalog onOpenSources={() => setIsSourcesModalOpen(true)} />
        ) : (
          <ProxyTestPage />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-20 py-8 bg-zinc-950 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Projeto Hikari — Catálogo de Anime com Proxy HLS Próprio & Fallback Automático para Iframe.</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" /> CORS & Referer Forged
            </span>
            <span>•</span>
            <span>hls.js Integrado</span>
          </div>
        </div>
      </footer>

      {/* Sources Manager Modal */}
      <EpisodeSourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
      />
    </div>
  );
}
