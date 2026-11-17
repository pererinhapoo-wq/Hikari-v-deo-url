import React, { useState } from 'react';
import { Play, Star, Search, Filter, ShieldCheck, Film, Tv, Sparkles } from 'lucide-react';
import { Player } from './Player';
import { resolveEpisode } from '../lib/sources';

interface Episode {
  id: string;
  number: number;
  title: string;
  duration: string;
  iframeUrl: string;
}

interface Anime {
  id: string;
  title: string;
  synopsis: string;
  cover: string;
  banner: string;
  rating: number;
  genres: string[];
  episodes: Episode[];
}

const MOCK_ANIMES: Anime[] = [
  {
    id: 'demon-slayer',
    title: 'Kimetsu no Yaiba: Demon Slayer',
    synopsis: 'Tanjiro Kamado se torna um caçador de demônios após sua família ser massacrada e sua irmã Nezuko ser transformada em um demônio.',
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
    rating: 4.9,
    genres: ['Ação', 'Fantasia', 'Sobrenatural'],
    episodes: [
      { id: 'ds-s1-e1', number: 1, title: 'Episódio 1 - Crueldade', duration: '23m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 'ds-s1-e2', number: 2, title: 'Episódio 2 - Sakonji Urokodaki', duration: '23m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 'ds-s1-e3', number: 3, title: 'Episódio 3 - Sabito e Makomo', duration: '23m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  },
  {
    id: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    synopsis: 'Yuji Itadori engole um dedo amaldiçoado de Sukuna, tornando-se o hospedeiro de uma poderosa maldição e entrando para a Escola Jujutsu.',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    rating: 4.8,
    genres: ['Ação', 'Sobrenatural', 'Escolar'],
    episodes: [
      { id: 'jk-s1-e1', number: 1, title: 'Episódio 1 - Ryomen Sukuna', duration: '24m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 'jk-s1-e2', number: 2, title: 'Episódio 2 - Pela Sala de Aula', duration: '24m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  },
  {
    id: 'solo-leveling',
    title: 'Solo Leveling',
    synopsis: 'Em um mundo onde portais conectam monstros a masmorras, o caçador mais fraco Sung Jinwoo ganha um sistema misterioso que lhe permite subir de nível infinitamente.',
    cover: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    rating: 4.9,
    genres: ['Ação', 'Aventura', 'Fantasia'],
    episodes: [
      { id: 'sl-s1-e1', number: 1, title: 'Episódio 1 - Eu estou acostumado', duration: '24m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 'sl-s1-e2', number: 2, title: 'Episódio 2 - Se eu tivesse mais uma chance', duration: '24m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  },
  {
    id: 'attack-on-titan',
    title: 'Attack on Titan (Shingeki no Kyojin)',
    synopsis: 'A humanidade vive cercada por muralhas gigantescas para se proteger de Titãs devoradores de homens, até que a muralha externa é rompida.',
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    rating: 4.95,
    genres: ['Ação', 'Drama', 'Mistério', 'Fantasia Sombria'],
    episodes: [
      { id: 'aot-s1-e1', number: 1, title: 'Episódio 1 - Para Você, em 2000 Anos', duration: '24m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 'aot-s1-e2', number: 2, title: 'Episódio 2 - O Dia da Desolação', duration: '24m', iframeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  }
];

export function Catalog({ onOpenSources }: { onOpenSources: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [activeAnime, setActiveAnime] = useState<Anime | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [resolvedSource, setResolvedSource] = useState<{ directUrl: string | null; iframeUrl: string } | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  const genres = ['Todos', 'Ação', 'Fantasia', 'Sobrenatural', 'Drama', 'Mistério'];

  const filteredAnimes = MOCK_ANIMES.filter(anime => {
    const matchesSearch = anime.title.toLowerCase().includes(search.toLowerCase()) || anime.synopsis.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = selectedGenre === 'Todos' || anime.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  const handleSelectEpisode = async (anime: Anime, ep: Episode) => {
    setActiveAnime(anime);
    setActiveEpisode(ep);
    setLoadingSource(true);
    const source = await resolveEpisode(ep.id, ep.iframeUrl);
    setResolvedSource(source);
    setLoadingSource(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Banner Featured */}
      {!activeAnime && (
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
          <div className="absolute inset-0">
            <img src={MOCK_ANIMES[0].banner} alt="Featured" className="w-full h-full object-cover opacity-35 filter brightness-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
          </div>

          <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Destaque Hikari HLS
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {MOCK_ANIMES[0].title}
            </h1>

            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed line-clamp-3">
              {MOCK_ANIMES[0].synopsis}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => handleSelectEpisode(MOCK_ANIMES[0], MOCK_ANIMES[0].episodes[0])}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-900/40 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" /> Assistir Episódio 1
              </button>

              <button
                onClick={onOpenSources}
                className="flex items-center gap-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 font-medium px-5 py-3 rounded-xl transition border border-zinc-700/50"
              >
                Gerenciar Fontes HLS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Watch Modal / View */}
      {activeAnime && activeEpisode && (
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{activeAnime.title}</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{activeEpisode.title}</h2>
            </div>
            <button
              onClick={() => { setActiveAnime(null); setActiveEpisode(null); setResolvedSource(null); }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
            >
              ← Voltar ao Catálogo
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Player Column */}
            <div className="lg:col-span-2 space-y-4">
              {loadingSource ? (
                <div className="w-full aspect-video rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-zinc-400">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm">Resolvendo URL HLS via proxy e banco...</p>
                </div>
              ) : (
                <Player
                  src={resolvedSource?.directUrl || null}
                  iframeSrc={resolvedSource?.iframeUrl || activeEpisode.iframeUrl}
                  title={`${activeAnime.title} - ${activeEpisode.title}`}
                  episodeId={activeEpisode.id}
                />
              )}
            </div>

            {/* Episodes List Sidebar */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col h-full">
              <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <Tv className="w-4 h-4 text-emerald-400" /> Episódios Disponíveis
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                {activeAnime.episodes.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEpisode(activeAnime, ep)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between border ${activeEpisode.id === ep.id ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800 text-zinc-300'}`}
                  >
                    <div>
                      <div className="text-xs font-semibold">Episódio {ep.number}</div>
                      <div className="text-sm font-medium truncate max-w-[200px]">{ep.title}</div>
                    </div>
                    <Play className={`w-4 h-4 ${activeEpisode.id === ep.id ? 'text-emerald-400 fill-current' : 'text-zinc-500'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar animes por título ou sinopse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0 ml-1 mr-1" />
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedGenre === genre ? 'bg-emerald-600 text-white shadow-md' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Anime Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredAnimes.map(anime => (
          <div
            key={anime.id}
            onClick={() => handleSelectEpisode(anime, anime.episodes[0])}
            className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:border-emerald-500/50 transition duration-300 cursor-pointer flex flex-col"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-zinc-950">
              <img
                src={anime.cover}
                alt={anime.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80"></div>
              
              <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-amber-400">
                <Star className="w-3.5 h-3.5 fill-current" /> {anime.rating}
              </div>

              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {anime.genres.slice(0, 2).map((g, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-800/50 text-emerald-300 rounded text-[10px] font-medium">
                      {g}
                    </span>
                  ))}
                </div>
                <h3 className="text-base font-bold text-white leading-snug group-hover:text-emerald-400 transition">{anime.title}</h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-zinc-900">
              <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{anime.synopsis}</p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs font-semibold text-emerald-400">
                <span className="flex items-center gap-1">
                  <Film className="w-3.5 h-3.5" /> {anime.episodes.length} Episódios
                </span>
                <span className="group-hover:translate-x-1 transition flex items-center gap-1">
                  Assistir <Play className="w-3 h-3 fill-current" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
