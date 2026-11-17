import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Monitor, Globe, AlertTriangle } from 'lucide-react';

interface PlayerProps {
  src: string | null; // proxy hls url
  iframeSrc: string;
  poster?: string;
  title: string;
  episodeId?: string;
}

export function Player({ src, iframeSrc, poster, title, episodeId }: PlayerProps) {
  const [mode, setMode] = useState<'native' | 'iframe'>(() => {
    const saved = localStorage.getItem('hikari_player_mode');
    return (saved === 'iframe' || !src) ? 'iframe' : 'native';
  });

  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // If src changes and we were on native, ensure we can play or fallback
  useEffect(() => {
    if (!src && mode === 'native') {
      setMode('iframe');
    }
  }, [src]);

  // Save mode to localStorage
  useEffect(() => {
    localStorage.setItem('hikari_player_mode', mode);
  }, [mode]);

  // Hls.js integration
  useEffect(() => {
    if (mode !== 'native' || !src || !videoRef.current) return;
    const currentSrc = src;

    let hlsInstance: any = null;
    const video = videoRef.current;
    setHasError(false);

    async function initHls() {
      // Dynamic import of hls.js so base bundle isn't weighed down
      try {
        const HlsModule = await import('hls.js');
        const Hls = HlsModule.default;

        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          });
          hlsInstance.loadSource(currentSrc);
          hlsInstance.attachMedia(video);

          hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
            if (data.fatal) {
              console.warn('HLS fatal error, falling back to iframe:', data);
              hlsInstance?.destroy();
              setHasError(true);
              setMode('iframe');
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari / iOS)
          video.src = currentSrc;
        } else {
          setMode('iframe');
        }
      } catch (err) {
        console.error('Failed to load hls.js', err);
        setMode('iframe');
      }
    }

    initHls();

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [src, mode]);

  // Progress tracking & reporting (debounce 10s, sendBeacon if position moved > 5s)
  const lastReportedTime = useRef(0);
  useEffect(() => {
    if (mode !== 'native' || !episodeId) return;
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const current = videoRef.current.currentTime;
        if (Math.abs(current - lastReportedTime.current) > 5) {
          lastReportedTime.current = current;
          const payload = JSON.stringify({ episodeId, progress: current, timestamp: Date.now() });
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/progress', payload);
          }
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [episodeId, mode]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mode Switcher Bar */}
      <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-zinc-200">Player Mode:</span>
          <span className="text-emerald-400 font-semibold">
            {mode === 'native' ? 'Hikari Custom HLS (Proxy)' : 'Provedor Oficial (Embed)'}
          </span>
          {hasError && (
            <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50 ml-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Fallback ativado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {src && (
            <button
              onClick={() => {
                setHasError(false);
                setMode(m => m === 'native' ? 'iframe' : 'native');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition text-xs shadow-sm"
              title="Alternar entre player próprio e iframe do provedor"
            >
              {mode === 'native' ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-cyan-400" /> Usar Player do Site (Embed)
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" /> Usar Player Próprio (HLS)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Video Container matching strict styling rules */}
      <div
        ref={containerRef}
        className="hikari-video-player relative w-full aspect-video rounded-2xl bg-black overflow-hidden shadow-2xl group border border-zinc-800/80"
        onMouseMove={() => {
          setShowControls(true);
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
          }, 3000);
        }}
        onMouseLeave={() => {
          if (isPlaying) setShowControls(false);
        }}
      >
        {mode === 'native' && src ? (
          <>
            <video
              ref={videoRef}
              poster={poster}
              crossOrigin="anonymous"
              preload="metadata"
              playsInline
              className="hikari-video-player video w-full h-full object-contain bg-black"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                console.warn('Video element error, fallback to iframe');
                setHasError(true);
                setMode('iframe');
              }}
            />

            {/* Top gradient overlay */}
            <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              <div className="p-4 text-white font-medium text-lg drop-shadow">{title}</div>
            </div>

            {/* Bottom custom controls bar with strict gradients */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Timeline scrubber */}
              <div className="w-full mb-3 flex items-center gap-3">
                <span className="text-xs text-zinc-300 font-mono">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={seekTo}
                  className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition"
                />
                <span className="text-xs text-zinc-300 font-mono">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  <button
                    onClick={() => skipTime(-10)}
                    className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition"
                    title="Retroceder 10s"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => skipTime(10)}
                    className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition"
                    title="Avançar 10s"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 ml-2 group/vol">
                    <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition">
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 font-medium hidden sm:inline">Hikari HLS Stream</span>
                  <button
                    onClick={toggleFullScreen}
                    className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <iframe
            src={iframeSrc}
            title={title}
            className="hikari-video-player iframe w-full h-full border-0 bg-black"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
      </div>
    </div>
  );
}
