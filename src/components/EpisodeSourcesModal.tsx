import React, { useEffect, useState } from 'react';
import { Database, Plus, Trash2, X, RefreshCw, CheckCircle, Link } from 'lucide-react';

interface EpisodeSource {
  id: string;
  episode_id: string;
  provider: string;
  page_url: string;
  direct_url?: string;
  resolved_at?: string;
  priority: number;
  created_at: string;
}

interface EpisodeSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EpisodeSourcesModal({ isOpen, onClose }: EpisodeSourcesModalProps) {
  const [sources, setSources] = useState<EpisodeSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [episodeId, setEpisodeId] = useState('ds-s1-e1');
  const [provider, setProvider] = useState('maximaimg');
  const [pageUrl, setPageUrl] = useState('https://animefire.plus/video/demon-slayer-episodio-1');
  const [directUrl, setDirectUrl] = useState('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  const [priority, setPriority] = useState(0);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/episode-sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/episode-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: episodeId, provider, page_url: pageUrl, direct_url: directUrl, priority })
      });
      if (res.ok) {
        fetchSources();
        setPageUrl('');
        setDirectUrl('');
      }
    } catch (err) {
      console.error('Failed to add source:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/episode-sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSources();
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gerenciador de Fontes (episode_sources)</h2>
              <p className="text-xs text-zinc-400">Banco de dados relacional simulado para resolução de HLS por episódio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Form */}
          <form onSubmit={handleAddSource} className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Adicionar Nova Fonte de Episódio
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">ID do Episódio</label>
                <input
                  type="text"
                  value={episodeId}
                  onChange={(e) => setEpisodeId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Provedor</label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Prioridade</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-xl text-sm transition shadow"
                >
                  Salvar Fonte
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Página de Origem (page_url)</label>
                <input
                  type="text"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">URL Direta M3U8 (direct_url opcional)</label>
                <input
                  type="text"
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </form>

          {/* Sources Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-200">Fontes Registradas no Banco</h3>
              <button onClick={fetchSources} className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>

            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider border-b border-zinc-800 font-semibold">
                      <th className="p-3">Episódio ID</th>
                      <th className="p-3">Provedor</th>
                      <th className="p-3">Página de Origem</th>
                      <th className="p-3">Prioridade</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300 font-mono">
                    {sources.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-900/40 transition">
                        <td className="p-3 font-bold text-emerald-400">{s.episode_id}</td>
                        <td className="p-3">{s.provider}</td>
                        <td className="p-3 max-w-xs truncate text-zinc-400" title={s.page_url}>{s.page_url}</td>
                        <td className="p-3">{s.priority}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                            title="Remover fonte"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sources.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-zinc-500 font-sans">Nenhuma fonte cadastrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
