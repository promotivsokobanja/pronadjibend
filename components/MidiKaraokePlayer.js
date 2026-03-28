'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Square, X, Volume2, VolumeX, Music, SkipBack, Headphones } from 'lucide-react';

function isAudioFile(name) {
  return /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(name || '');
}

export default function MidiKaraokePlayer({ fileUrl, fileName, onClose }) {
  const [status, setStatus] = useState('loading');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricLines, setLyricLines] = useState([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(-1);
  const [currentWordIdx, setCurrentWordIdx] = useState(-1);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLyrics, setHasLyrics] = useState(false);
  const [mode, setMode] = useState('full');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileType, setFileType] = useState(null); // 'midi' | 'audio'

  const toneRef = useRef(null);
  const synthsRef = useRef([]);
  const transportRef = useRef(null);
  const audioRef = useRef(null);
  const animRef = useRef(null);
  const lyricsRef = useRef(null);
  const volumeNodeRef = useRef(null);

  const cleanup = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    synthsRef.current.forEach(s => { try { s.dispose(); } catch {} });
    synthsRef.current = [];
    if (volumeNodeRef.current) { try { volumeNodeRef.current.dispose(); } catch {} }
    if (transportRef.current) {
      try { transportRef.current.stop(); transportRef.current.cancel(); } catch {}
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ''; } catch {}
      audioRef.current = null;
    }
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  // ===== AUDIO (MP3) LOADER =====
  const loadAudio = useCallback(async (url) => {
    try {
      const audio = new Audio();
      audioRef.current = audio;
      audio.crossOrigin = 'anonymous';
      audio.volume = volume;
      audio.preload = 'auto';

      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = () => reject(new Error('Nije moguće učitati audio fajl.'));
        audio.src = url;
      });

      setDuration(audio.duration || 0);
      setStatus('ready');
    } catch (err) {
      console.error('Audio load error:', err);
      setStatus('error');
      setErrorMsg(err.message);
    }
  }, [volume]);

  // ===== MIDI LOADER =====
  const loadMidi = useCallback(async (url) => {
    try {
      const Tone = await import('tone');
      toneRef.current = Tone;
      transportRef.current = Tone.getTransport();

      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Nije moguće preuzeti fajl.');
      const buffer = await resp.arrayBuffer();

      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi(buffer);

      const { extractLyrics } = await import('../lib/midiLyrics');
      const { lines } = extractLyrics(buffer);

      setDuration(midi.duration);
      setLyricLines(lines);
      setHasLyrics(lines.length > 0);

      const vol = new Tone.Volume(Tone.gainToDb(volume)).toDestination();
      volumeNodeRef.current = vol;

      midi.tracks.forEach(track => {
        if (track.notes.length === 0) return;
        const isDrum = track.channel === 9;
        let synth;

        if (isDrum) {
          synth = new Tone.MembraneSynth({ volume: -8 }).connect(vol);
        } else {
          synth = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 16,
            voice: Tone.Synth,
            options: {
              oscillator: { type: 'triangle8' },
              envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
            },
          }).connect(vol);
        }

        synthsRef.current.push(synth);

        track.notes.forEach(note => {
          transportRef.current.schedule((time) => {
            try {
              if (isDrum) {
                synth.triggerAttackRelease(note.name, '16n', time, note.velocity);
              } else {
                synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
              }
            } catch {}
          }, note.time);
        });
      });

      setStatus('ready');
    } catch (err) {
      console.error('MIDI load error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Greška');
    }
  }, [volume]);

  // ===== MAIN LOADER =====
  useEffect(() => {
    if (!fileUrl) return;
    const isAudio = isAudioFile(fileName);
    setFileType(isAudio ? 'audio' : 'midi');

    if (isAudio) {
      loadAudio(fileUrl);
    } else {
      loadMidi(fileUrl);
    }
  }, [fileUrl, fileName, loadAudio, loadMidi]);

  // ===== VOLUME =====
  useEffect(() => {
    if (fileType === 'audio' && audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
    if (fileType === 'midi' && volumeNodeRef.current && toneRef.current) {
      const Tone = toneRef.current;
      volumeNodeRef.current.volume.value = isMuted ? -Infinity : Tone.gainToDb(volume);
    }
  }, [volume, isMuted, fileType]);

  // ===== SYNC (both MIDI and Audio) =====
  const startSync = useCallback(() => {
    const sync = () => {
      let t = 0;

      if (fileType === 'audio' && audioRef.current) {
        t = audioRef.current.currentTime;
        if (audioRef.current.ended) {
          setStatus('ready');
          setCurrentTime(0);
          if (animRef.current) cancelAnimationFrame(animRef.current);
          return;
        }
      } else if (transportRef.current) {
        t = transportRef.current.seconds;
      }

      setCurrentTime(t);

      if (lyricLines.length > 0) {
        let lineIdx = -1;
        for (let i = lyricLines.length - 1; i >= 0; i--) {
          if (lyricLines[i].startTime <= t + 0.1) { lineIdx = i; break; }
        }
        setCurrentLineIdx(lineIdx);

        if (lineIdx >= 0) {
          const line = lyricLines[lineIdx];
          let wIdx = -1;
          for (let j = line.words.length - 1; j >= 0; j--) {
            if (line.words[j].time <= t + 0.05) { wIdx = j; break; }
          }
          setCurrentWordIdx(wIdx);
        } else {
          setCurrentWordIdx(-1);
        }
      }

      animRef.current = requestAnimationFrame(sync);
    };
    animRef.current = requestAnimationFrame(sync);
  }, [lyricLines, fileType]);

  // ===== CONTROLS =====
  const handlePlay = async () => {
    if (fileType === 'audio') {
      if (audioRef.current) {
        await audioRef.current.play();
        setStatus('playing');
        startSync();
      }
      return;
    }

    if (!toneRef.current) return;
    await toneRef.current.start();

    if (mode === 'lyrics-only') {
      synthsRef.current.forEach(s => { try { s.volume.value = -Infinity; } catch {} });
    } else {
      synthsRef.current.forEach(s => { try { s.volume.value = 0; } catch {} });
    }

    transportRef.current.start();
    setStatus('playing');
    startSync();
  };

  const handlePause = () => {
    if (fileType === 'audio' && audioRef.current) {
      audioRef.current.pause();
    }
    if (fileType === 'midi' && transportRef.current) {
      transportRef.current.pause();
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setStatus('paused');
  };

  const handleStop = () => {
    if (fileType === 'audio' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (fileType === 'midi' && transportRef.current) {
      transportRef.current.stop();
      transportRef.current.seconds = 0;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setCurrentTime(0);
    setCurrentLineIdx(-1);
    setCurrentWordIdx(-1);
    setStatus('ready');
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;

    if (fileType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (fileType === 'midi' && transportRef.current) {
      transportRef.current.seconds = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleRestart = () => {
    handleStop();
    setTimeout(() => handlePlay(), 50);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (currentLineIdx < 0 || !lyricsRef.current) return;
    const el = lyricsRef.current.querySelector(`[data-line="${currentLineIdx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIdx]);

  const handleClose = () => { cleanup(); onClose?.(); };

  const isAudioMode = fileType === 'audio';
  const accentColor = isAudioMode ? '#34d399' : '#60a5fa';

  return (
    <div className="karaoke-overlay">
      <div className="karaoke-player">
        <header className="kp-header">
          <div className="kp-title">
            {isAudioMode ? <Headphones size={20} /> : <Music size={20} />}
            <span className="kp-filename">{fileName || 'Player'}</span>
            <span className="kp-type-badge">{isAudioMode ? 'MP3' : 'MIDI'}</span>
          </div>
          <div className="kp-header-actions">
            {hasLyrics && fileType === 'midi' && (
              <button
                className={`mode-btn ${mode === 'lyrics-only' ? 'active' : ''}`}
                onClick={() => setMode(mode === 'full' ? 'lyrics-only' : 'full')}
              >
                {mode === 'full' ? '\u266A Zvuk + Tekst' : '\uD83D\uDCDD Samo tekst'}
              </button>
            )}
            <button className="close-btn" onClick={handleClose}><X size={22} /></button>
          </div>
        </header>

        <div className="kp-lyrics" ref={lyricsRef}>
          {status === 'loading' && (
            <div className="kp-center">
              <div className="kp-spinner"></div>
              <p>{isAudioMode ? 'Učitavanje audio fajla...' : 'Učitavanje MIDI fajla...'}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="kp-center"><p className="kp-error">{errorMsg}</p></div>
          )}
          {(status === 'ready' || status === 'playing' || status === 'paused') && (
            <>
              {hasLyrics && !isAudioMode ? (
                <div className="lyrics-scroll">
                  {lyricLines.map((line, li) => (
                    <div
                      key={li}
                      data-line={li}
                      className={`lyric-line ${
                        li === currentLineIdx ? 'active' :
                        li < currentLineIdx ? 'past' : 'upcoming'
                      }`}
                    >
                      {line.words.map((word, wi) => (
                        <span
                          key={wi}
                          className={`lyric-word ${
                            li === currentLineIdx && wi <= currentWordIdx ? 'highlighted' : ''
                          }`}
                        >
                          {word.text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="kp-center no-lyrics">
                  <div className="audio-viz">
                    {isAudioMode ? <Headphones size={72} /> : <Music size={72} />}
                    {status === 'playing' && (
                      <div className="viz-bars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="viz-bar" style={{ animationDelay: `${i * 0.15}s` }}></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="now-playing-label">
                    {status === 'playing' ? 'Reprodukcija u toku...' :
                     status === 'paused' ? 'Pauzirano' :
                     isAudioMode ? 'Pritisnite Play za reprodukciju' :
                     'Ovaj fajl ne sadrži tekst'}
                  </p>
                  {!isAudioMode && <p className="kp-sub">Reprodukcija muzike je aktivna.</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="kp-progress" onClick={handleSeek}>
          <div className="kp-progress-bar" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}></div>
        </div>

        <footer className="kp-controls">
          <div className="kp-time">{formatTime(currentTime)}</div>

          <div className="kp-btns">
            <button className="ctrl-btn" onClick={handleRestart} title="Od početka"><SkipBack size={18} /></button>

            {status === 'playing' ? (
              <button className="ctrl-btn play-btn" onClick={handlePause}><Pause size={22} /></button>
            ) : (
              <button
                className="ctrl-btn play-btn"
                onClick={handlePlay}
                disabled={status === 'loading' || status === 'error'}
              >
                <Play size={22} />
              </button>
            )}

            <button className="ctrl-btn" onClick={handleStop} title="Stop"><Square size={18} /></button>
          </div>

          <div className="kp-vol">
            <button className="ctrl-btn" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
              className="vol-slider"
            />
          </div>

          <div className="kp-time">{formatTime(duration)}</div>
        </footer>
      </div>

      <style jsx>{`
        .karaoke-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.92); backdrop-filter: blur(20px);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .karaoke-player {
          width: 95vw; max-width: 1000px; height: 85vh; max-height: 700px;
          background: linear-gradient(180deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%);
          border: 1px solid rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.15);
          border-radius: 20px; display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 0 80px rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.08);
        }

        .kp-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .kp-title { display: flex; align-items: center; gap: 0.75rem; color: ${accentColor}; font-weight: 700; font-size: 1rem; }
        .kp-filename { color: #e2e8f0; max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kp-type-badge {
          font-size: 0.6rem; font-weight: 900; letter-spacing: 1px; padding: 2px 10px;
          border-radius: 100px; background: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.15);
          color: ${accentColor};
        }
        .kp-header-actions { display: flex; align-items: center; gap: 0.75rem; }
        .mode-btn {
          padding: 6px 14px; border-radius: 100px; font-size: 0.72rem; font-weight: 700;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8; cursor: pointer; transition: 0.2s;
        }
        .mode-btn:hover, .mode-btn.active { background: rgba(96,165,250,0.15); border-color: #60a5fa; color: #60a5fa; }
        .close-btn { background: none; border: none; color: #64748b; cursor: pointer; padding: 6px; border-radius: 50%; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

        .kp-lyrics {
          flex: 1; overflow-y: auto; padding: 2rem 3rem;
          scrollbar-width: thin; scrollbar-color: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.2) transparent;
        }

        .kp-center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem; color: #64748b; }
        .kp-error { color: #f87171; }
        .kp-spinner {
          width: 40px; height: 40px; border: 3px solid rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.1);
          border-top-color: ${accentColor}; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lyrics-scroll { padding: 4rem 0; }
        .lyric-line { padding: 0.6rem 0; font-size: 1.6rem; font-weight: 600; line-height: 1.6; transition: all 0.4s ease; text-align: center; }
        .lyric-line.upcoming { color: rgba(148,163,184,0.3); }
        .lyric-line.past { color: rgba(148,163,184,0.2); transform: scale(0.95); }
        .lyric-line.active { color: #e2e8f0; font-size: 2rem; transform: scale(1.05); text-shadow: 0 0 30px rgba(96,165,250,0.3); }
        .lyric-word { transition: color 0.15s ease; }
        .lyric-word.highlighted { color: #fbbf24; text-shadow: 0 0 20px rgba(251,191,36,0.4); }

        .no-lyrics { color: #475569; }
        .now-playing-label { font-size: 1.1rem; color: #94a3b8; font-weight: 600; }
        .kp-sub { font-size: 0.85rem !important; color: #64748b; margin-top: -0.5rem; }

        .audio-viz { position: relative; display: flex; flex-direction: column; align-items: center; color: ${accentColor}; }
        .viz-bars { display: flex; align-items: flex-end; gap: 6px; margin-top: 1.5rem; height: 40px; }
        .viz-bar {
          width: 6px; border-radius: 3px; background: ${accentColor};
          animation: vizPulse 0.8s ease-in-out infinite alternate;
        }
        @keyframes vizPulse {
          0% { height: 8px; opacity: 0.4; }
          100% { height: 36px; opacity: 1; }
        }

        .kp-progress { height: 4px; background: rgba(255,255,255,0.06); cursor: pointer; position: relative; flex-shrink: 0; }
        .kp-progress:hover { height: 6px; }
        .kp-progress-bar {
          height: 100%; background: linear-gradient(90deg, ${accentColor}, #a78bfa);
          border-radius: 2px; transition: width 0.1s linear; position: relative;
        }
        .kp-progress-bar::after {
          content: ''; position: absolute; right: -4px; top: 50%; transform: translateY(-50%);
          width: 10px; height: 10px; border-radius: 50%; background: ${accentColor}; opacity: 0; transition: opacity 0.2s;
        }
        .kp-progress:hover .kp-progress-bar::after { opacity: 1; }

        .kp-controls {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.3);
        }
        .kp-time { font-size: 0.75rem; color: #64748b; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 36px; }

        .kp-btns { display: flex; align-items: center; gap: 0.5rem; margin: 0 auto; }
        .ctrl-btn {
          display: flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8; cursor: pointer; transition: all 0.2s;
        }
        .ctrl-btn:hover:not(:disabled) { background: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.15); color: ${accentColor}; border-color: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.3); }
        .ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .ctrl-btn.play-btn {
          width: 48px; height: 48px;
          background: ${isAudioMode ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'linear-gradient(135deg, #3b82f6, #6366f1)'};
          border-color: transparent; color: white;
        }
        .ctrl-btn.play-btn:hover:not(:disabled) { transform: scale(1.1); color: white; }

        .kp-vol { display: flex; align-items: center; gap: 0.5rem; }
        .kp-vol .ctrl-btn { width: 30px; height: 30px; }
        .vol-slider { width: 80px; accent-color: ${accentColor}; cursor: pointer; }

        @media (max-width: 768px) {
          .karaoke-player { width: 100vw; height: 100vh; max-width: none; max-height: none; border-radius: 0; }
          .kp-lyrics { padding: 1.5rem 1rem; }
          .lyric-line { font-size: 1.1rem; }
          .lyric-line.active { font-size: 1.4rem; }
          .kp-filename { max-width: 180px; }
          .vol-slider { width: 50px; }
        }
      `}</style>
    </div>
  );
}
