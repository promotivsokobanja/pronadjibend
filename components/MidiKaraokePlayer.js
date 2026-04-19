'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Square, X, Volume2, VolumeX, Music, SkipBack, Headphones, Usb, ListMusic, Search, Minus, Plus } from 'lucide-react';

function isAudioFile(name) {
  return /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(name || '');
}

const GM_INSTRUMENTS = [
  'acoustic_grand_piano','bright_acoustic_piano','electric_grand_piano','honkytonk_piano',
  'electric_piano_1','electric_piano_2','harpsichord','clavinet',
  'celesta','glockenspiel','music_box','vibraphone',
  'marimba','xylophone','tubular_bells','dulcimer',
  'drawbar_organ','percussive_organ','rock_organ','church_organ',
  'reed_organ','accordion','harmonica','tango_accordion',
  'acoustic_guitar_nylon','acoustic_guitar_steel','electric_guitar_jazz','electric_guitar_clean',
  'electric_guitar_muted','overdriven_guitar','distortion_guitar','guitar_harmonics',
  'acoustic_bass','electric_bass_finger','electric_bass_pick','fretless_bass',
  'slap_bass_1','slap_bass_2','synth_bass_1','synth_bass_2',
  'violin','viola','cello','contrabass',
  'tremolo_strings','pizzicato_strings','orchestral_harp','timpani',
  'string_ensemble_1','string_ensemble_2','synth_strings_1','synth_strings_2',
  'choir_aahs','voice_oohs','synth_choir','orchestra_hit',
  'trumpet','trombone','tuba','muted_trumpet',
  'french_horn','brass_section','synth_brass_1','synth_brass_2',
  'soprano_sax','alto_sax','tenor_sax','baritone_sax',
  'oboe','english_horn','bassoon','clarinet',
  'piccolo','flute','recorder','pan_flute',
  'blown_bottle','shakuhachi','whistle','ocarina',
  'lead_1_square','lead_2_sawtooth','lead_3_calliope','lead_4_chiff',
  'lead_5_charang','lead_6_voice','lead_7_fifths','lead_8_bass_lead',
  'pad_1_new_age','pad_2_warm','pad_3_polysynth','pad_4_choir',
  'pad_5_bowed','pad_6_metallic','pad_7_halo','pad_8_sweep',
  'fx_1_rain','fx_2_soundtrack','fx_3_crystal','fx_4_atmosphere',
  'fx_5_brightness','fx_6_goblins','fx_7_echoes','fx_8_scifi',
  'sitar','banjo','shamisen','koto',
  'kalimba','bagpipe','fiddle','shanai',
  'tinkle_bell','agogo','steel_drums','woodblock',
  'taiko_drum','melodic_tom','synth_drum','reverse_cymbal',
  'guitar_fret_noise','breath_noise','seashore','bird_tweet',
  'telephone_ring','helicopter','applause','gunshot',
];

function playDrumHit(ac, dest, noiseBuffer, midiNote, when, vel) {
  const g = ac.createGain();
  g.connect(dest);
  if (midiNote === 35 || midiNote === 36) {
    const osc = ac.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when); osc.frequency.exponentialRampToValueAtTime(40, when + 0.12);
    osc.connect(g); g.gain.setValueAtTime(vel * 0.8, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    osc.start(when); osc.stop(when + 0.35);
  } else if (midiNote === 38 || midiNote === 40) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    src.connect(hp); hp.connect(g); g.gain.setValueAtTime(vel * 0.55, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    src.start(when); src.stop(when + 0.2);
    const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 180;
    const og = ac.createGain(); og.gain.setValueAtTime(vel * 0.35, when); og.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
    osc.connect(og); og.connect(dest); osc.start(when); osc.stop(when + 0.12);
  } else if (midiNote === 39) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 3;
    src.connect(bp); bp.connect(g); g.gain.setValueAtTime(vel * 0.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
    src.start(when); src.stop(when + 0.1);
  } else if (midiNote === 42 || midiNote === 44) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 8000; bp.Q.value = 2;
    src.connect(bp); bp.connect(g); g.gain.setValueAtTime(vel * 0.25, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    src.start(when); src.stop(when + 0.06);
  } else if (midiNote === 46) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 8000; bp.Q.value = 1;
    src.connect(bp); bp.connect(g); g.gain.setValueAtTime(vel * 0.3, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
    src.start(when); src.stop(when + 0.25);
  } else if (midiNote === 49 || midiNote === 55 || midiNote === 57) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5000; bp.Q.value = 0.5;
    src.connect(bp); bp.connect(g); g.gain.setValueAtTime(vel * 0.35, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.6);
    src.start(when); src.stop(when + 0.65);
  } else if (midiNote === 51 || midiNote === 53 || midiNote === 59) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 6000; bp.Q.value = 1.5;
    src.connect(bp); bp.connect(g); g.gain.setValueAtTime(vel * 0.2, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.35);
    src.start(when); src.stop(when + 0.4);
  } else if (midiNote >= 41 && midiNote <= 50) {
    const freq = 80 + (midiNote - 41) * 15; const osc = ac.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, when); osc.frequency.exponentialRampToValueAtTime(freq, when + 0.08);
    osc.connect(g); g.gain.setValueAtTime(vel * 0.55, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
    osc.start(when); osc.stop(when + 0.25);
  } else if (midiNote === 54 || midiNote === 56) {
    const osc = ac.createOscillator(); osc.type = 'square'; osc.frequency.value = midiNote === 56 ? 800 : 400;
    osc.connect(g); g.gain.setValueAtTime(vel * 0.2, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    osc.start(when); osc.stop(when + 0.12);
  } else {
    const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 200 + midiNote * 4;
    osc.connect(g); g.gain.setValueAtTime(vel * 0.25, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    osc.start(when); osc.stop(when + 0.12);
  }
}

function findNoteIndex(schedule, position) {
  let lo = 0, hi = schedule.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (schedule[mid].time < position) lo = mid + 1; else hi = mid; }
  return lo;
}

const LOOKAHEAD = 0.15;
const SCHED_MS = 25;

export default function MidiKaraokePlayer({ fileUrl, fileName, initialSongId, songList = [], onClose }) {
  const [status, setStatus] = useState('loading');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricLines, setLyricLines] = useState([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(-1);
  const [currentWordIdx, setCurrentWordIdx] = useState(-1);
  const [volume, setVolume] = useState(0.7);
  const volumeRef = useRef(0.7);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  const [transpose, setTranspose] = useState(0);
  const transposeRef = useRef(0);
  useEffect(() => { transposeRef.current = transpose; }, [transpose]);
  const [tempo, setTempo] = useState(1.0);
  const tempoRef = useRef(1.0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLyrics, setHasLyrics] = useState(false);
  const [mode, setMode] = useState('full');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileType, setFileType] = useState(null);
  const [loadProgress, setLoadProgress] = useState('');
  const [activeName, setActiveName] = useState(fileName);
  const [activeSongId, setActiveSongId] = useState(initialSongId || null);

  const [midiOutputs, setMidiOutputs] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState(null);
  const [showMidiPanel, setShowMidiPanel] = useState(false);
  const [internalSoundEnabled, setInternalSoundEnabled] = useState(true);

  const [showSongList, setShowSongList] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [allSongs, setAllSongs] = useState([]);
  const [allSongsTotal, setAllSongsTotal] = useState(0);
  const [allSongsPage, setAllSongsPage] = useState(1);
  const [allSongsPages, setAllSongsPages] = useState(1);
  const [allSongsLoading, setAllSongsLoading] = useState(false);
  const searchTimerRef = useRef(null);

  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const instrumentsRef = useRef(new Map());
  const instrumentCacheRef = useRef(new Map());
  const soundfontRef = useRef(null);
  const noteScheduleRef = useRef([]);
  const noiseBufferRef = useRef(null);
  const playbackRef = useRef({ startRealTime: 0, positionAtStart: 0, nextNoteIndex: 0, isPlaying: false, schedulerTimer: null });
  const audioRef = useRef(null);
  const animRef = useRef(null);
  const lyricsRef = useRef(null);
  const programChangesRef = useRef(new Map());
  const lastSentProgramRef = useRef(new Map());
  const midiAccessRef = useRef(null);
  const midiOutputRef = useRef(null);

  // ===== WEB MIDI API =====
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) return;
    const updateOutputs = (access) => {
      const outs = [];
      access.outputs.forEach(o => outs.push({ id: o.id, name: o.name, state: o.state }));
      setMidiOutputs(outs.filter(o => o.state === 'connected'));
    };
    navigator.requestMIDIAccess({ sysex: false })
      .then(access => { midiAccessRef.current = access; updateOutputs(access); access.onstatechange = () => updateOutputs(access); })
      .catch(() => {});
    return () => { if (midiAccessRef.current) midiAccessRef.current.onstatechange = null; };
  }, []);

  const sendAllNotesOff = useCallback(() => {
    const out = midiOutputRef.current;
    if (!out) return;
    for (let ch = 0; ch < 16; ch++) { out.send([0xB0 | ch, 123, 0]); out.send([0xB0 | ch, 120, 0]); }
  }, []);

  const sendProgramChanges = useCallback(() => {
    const out = midiOutputRef.current;
    if (!out) return;
    lastSentProgramRef.current = new Map();
    programChangesRef.current.forEach((prog, ch) => {
      if (ch !== 9) {
        out.send([0xC0 | ch, prog & 0x7F]);
        lastSentProgramRef.current.set(ch, prog);
      }
    });
  }, []);

  const selectMidiOutput = useCallback((outputId) => {
    if (!outputId) { sendAllNotesOff(); midiOutputRef.current = null; setSelectedOutputId(null); setShowMidiPanel(false); return; }
    const output = midiAccessRef.current?.outputs.get(outputId);
    if (output) { midiOutputRef.current = output; setSelectedOutputId(outputId); setShowMidiPanel(false); }
  }, [sendAllNotesOff]);

  // ===== SOFT RESET (keeps AudioContext + cached instruments) =====
  const softReset = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const pb = playbackRef.current;
    if (pb?.schedulerTimer) { clearTimeout(pb.schedulerTimer); pb.schedulerTimer = null; }
    if (pb) { pb.isPlaying = false; pb.positionAtStart = 0; pb.nextNoteIndex = 0; }

    const ac = audioContextRef.current;
    if (ac) { instrumentsRef.current.forEach(inst => { try { inst.stop(ac.currentTime); } catch {} }); }
    sendAllNotesOff();

    noteScheduleRef.current = [];
    programChangesRef.current = new Map();

    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ''; } catch {} audioRef.current = null; }

    setCurrentTime(0);
    setDuration(0);
    setLyricLines([]);
    setHasLyrics(false);
    setCurrentLineIdx(-1);
    setCurrentWordIdx(-1);
  }, [sendAllNotesOff]);

  // ===== FULL CLEANUP (on close) =====
  const cleanup = useCallback(() => {
    softReset();
    instrumentCacheRef.current.forEach(inst => { try { inst.stop(); } catch {} });
    instrumentCacheRef.current = new Map();
    instrumentsRef.current = new Map();
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
    gainNodeRef.current = null;
    noiseBufferRef.current = null;
    soundfontRef.current = null;
  }, [softReset]);

  useEffect(() => { return cleanup; }, [cleanup]);

  // ===== AUDIO (MP3) =====
  const loadAudio = useCallback(async (url) => {
    try {
      const audio = new Audio();
      audioRef.current = audio;
      audio.crossOrigin = 'anonymous';
      audio.volume = volumeRef.current;
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
  }, []);

  // ===== MIDI with CACHED GM SoundFont =====
  const loadMidi = useCallback(async (url) => {
    try {
      setLoadProgress('Preuzimanje MIDI fajla...');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Nije moguće preuzeti fajl.');
      const buffer = await resp.arrayBuffer();

      setLoadProgress('Parsiranje MIDI podataka...');
      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi(buffer);

      const { extractLyrics } = await import('../lib/midiLyrics');
      const { lines } = extractLyrics(buffer);
      setLyricLines(lines);
      setHasLyrics(lines.length > 0);
      setDuration(midi.duration);

      let ac = audioContextRef.current;
      if (!ac || ac.state === 'closed') {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = ac;
        const masterGain = ac.createGain();
        masterGain.gain.value = volumeRef.current;
        masterGain.connect(ac.destination);
        gainNodeRef.current = masterGain;
        const noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        noiseBufferRef.current = noiseBuf;
      } else if (ac.state === 'suspended') {
        await ac.resume();
      }

      // Parse raw MIDI events for mid-track program changes
      const { parseMidi } = await import('midi-file');
      const rawMidi = parseMidi(new Uint8Array(buffer));
      const ppq = rawMidi.header.ticksPerBeat || 480;
      // Build tempo map (sorted by tick) → convert ticks to seconds
      const tempoMap = [{ tick: 0, usPerBeat: 500000 }]; // default 120 BPM
      rawMidi.tracks.forEach(trackEvents => {
        let tick = 0;
        trackEvents.forEach(ev => {
          tick += ev.deltaTime || 0;
          if (ev.type === 'setTempo') tempoMap.push({ tick, usPerBeat: ev.microsecondsPerBeat });
        });
      });
      tempoMap.sort((a, b) => a.tick - b.tick);
      const tickToSec = (targetTick) => {
        let sec = 0;
        for (let i = 0; i < tempoMap.length; i++) {
          const curr = tempoMap[i];
          const next = tempoMap[i + 1];
          const endTick = next ? Math.min(next.tick, targetTick) : targetTick;
          if (endTick > curr.tick) sec += ((endTick - curr.tick) * curr.usPerBeat) / (ppq * 1e6);
          if (!next || next.tick >= targetTick) break;
        }
        return sec;
      };
      // Per-channel program timeline
      const progTimeline = new Map(); // channel -> [{time, program}]
      rawMidi.tracks.forEach(trackEvents => {
        let tick = 0;
        trackEvents.forEach(ev => {
          tick += ev.deltaTime || 0;
          if (ev.type === 'programChange' && ev.channel != null) {
            const ch = ev.channel;
            if (!progTimeline.has(ch)) progTimeline.set(ch, []);
            progTimeline.get(ch).push({ time: tickToSec(tick), program: ev.programNumber });
          }
        });
      });
      progTimeline.forEach(arr => arr.sort((a, b) => a.time - b.time));
      const programAt = (channel, time) => {
        const arr = progTimeline.get(channel);
        if (!arr || arr.length === 0) return null;
        let prog = arr[0].program;
        for (const entry of arr) { if (entry.time <= time + 1e-6) prog = entry.program; else break; }
        return prog;
      };

      const neededPrograms = new Set();
      const progChanges = new Map();
      midi.tracks.forEach(track => {
        if (track.notes.length === 0 || track.channel === 9) return;
        // Add initial program from @tonejs/midi + all programs from timeline
        neededPrograms.add(track.instrument.number);
        const initialProg = programAt(track.channel, 0) ?? track.instrument.number;
        progChanges.set(track.channel, initialProg);
        const chTimeline = progTimeline.get(track.channel);
        if (chTimeline) chTimeline.forEach(e => neededPrograms.add(e.program));
      });
      programChangesRef.current = progChanges;

      const cached = instrumentCacheRef.current;
      const missing = [...neededPrograms].filter(p => !cached.has(p));

      if (missing.length > 0) {
        setLoadProgress(`Učitavanje novih instrumenata (${missing.length})...`);
        if (!soundfontRef.current) soundfontRef.current = (await import('soundfont-player')).default;
        const Sf = soundfontRef.current;
        let done = 0;
        await Promise.all(missing.map(async (prog) => {
          const name = GM_INSTRUMENTS[prog] || 'acoustic_grand_piano';
          try {
            const inst = await Sf.instrument(ac, name, { soundfont: 'MusyngKite', destination: gainNodeRef.current });
            cached.set(prog, inst);
          } catch {
            if (!cached.has(0)) {
              try { const fb = await Sf.instrument(ac, 'acoustic_grand_piano', { soundfont: 'MusyngKite', destination: gainNodeRef.current }); cached.set(0, fb); } catch {}
            }
            if (cached.has(0)) cached.set(prog, cached.get(0));
          }
          done++;
          setLoadProgress(`Učitavanje instrumenata: ${done}/${missing.length}`);
        }));
      } else if (neededPrograms.size > 0) {
        setLoadProgress('Instrumenti keširani ✓');
        await new Promise(r => setTimeout(r, 300));
      }

      instrumentsRef.current = new Map();
      neededPrograms.forEach(prog => { if (cached.has(prog)) instrumentsRef.current.set(prog, cached.get(prog)); });

      const schedule = [];
      midi.tracks.forEach(track => {
        if (track.notes.length === 0) return;
        const isDrum = track.channel === 9;
        track.notes.forEach(note => {
          const resolvedProgram = isDrum ? 0 : (programAt(track.channel, note.time) ?? track.instrument.number);
          schedule.push({ time: note.time, midiNote: note.midi, duration: note.duration, velocity: note.velocity, programNumber: resolvedProgram, isDrum, channel: track.channel });
        });
      });
      schedule.sort((a, b) => a.time - b.time);
      noteScheduleRef.current = schedule;

      playbackRef.current = { startRealTime: 0, positionAtStart: 0, nextNoteIndex: 0, isPlaying: false, schedulerTimer: null };
      setLoadProgress('');
      setStatus('ready');
    } catch (err) {
      console.error('MIDI load error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Greška');
    }
  }, []);

  // ===== INITIAL LOAD =====
  useEffect(() => {
    if (!fileUrl) return;
    setActiveName(fileName);
    const isAudio = isAudioFile(fileName);
    setFileType(isAudio ? 'audio' : 'midi');
    if (isAudio) loadAudio(fileUrl);
    else loadMidi(fileUrl);
  }, [fileUrl, fileName, loadAudio, loadMidi]);

  // ===== FETCH ALL SONGS FROM API =====
  const fetchAllSongs = useCallback(async (search = '', page = 1, append = false) => {
    setAllSongsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (search.length >= 2) params.set('search', search);
      const resp = await fetch(`/api/midi?${params}`);
      const data = await resp.json();
      if (data.files) {
        setAllSongs(prev => append ? [...prev, ...data.files] : data.files);
        setAllSongsTotal(data.total || 0);
        setAllSongsPage(data.page || 1);
        setAllSongsPages(data.pages || 1);
      }
    } catch { /* ignore */ }
    setAllSongsLoading(false);
  }, []);

  useEffect(() => {
    if (showSongList && allSongs.length === 0 && !allSongsLoading) {
      fetchAllSongs('', 1);
    }
  }, [showSongList, allSongs.length, allSongsLoading, fetchAllSongs]);

  useEffect(() => {
    if (!showSongList) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchAllSongs(songSearch, 1, false);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [songSearch, showSongList, fetchAllSongs]);

  const loadMoreSongs = () => {
    if (allSongsPage < allSongsPages && !allSongsLoading) {
      fetchAllSongs(songSearch, allSongsPage + 1, true);
    }
  };

  // ===== SONG SELECT FROM LIST =====
  const handleSongSelect = async (song) => {
    softReset();
    setShowSongList(false);
    setStatus('loading');
    setActiveName(`${song.title} - ${song.artist}`);
    setActiveSongId(song.id);

    try {
      const resp = await fetch(`/api/midi/preview?id=${song.id}`);
      const data = await resp.json();
      if (!data.url) throw new Error(data.error || 'Greška');

      const isAudio = data.fileType === 'audio' || isAudioFile(song.fileName || '');
      setFileType(isAudio ? 'audio' : 'midi');

      if (isAudio) await loadAudio(data.url);
      else await loadMidi(data.url);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Greška pri učitavanju');
    }
  };

  // ===== VOLUME =====
  useEffect(() => {
    if (fileType === 'audio' && audioRef.current) { audioRef.current.volume = isMuted ? 0 : volume; audioRef.current.muted = isMuted; }
    if (fileType === 'midi' && gainNodeRef.current) {
      gainNodeRef.current.gain.value = !internalSoundEnabled ? 0 : (isMuted ? 0 : volume);
    }
  }, [volume, isMuted, fileType, internalSoundEnabled]);

  // ===== TEMPO =====
  // Change tempo mid-play: shift startRealTime/positionAtStart so current position stays, then scale
  const applyTempo = useCallback((newTempo) => {
    const pb = playbackRef.current; const ac = audioContextRef.current;
    if (pb && ac && pb.isPlaying) {
      const realElapsed = ac.currentTime - pb.startRealTime;
      const curPos = realElapsed * tempoRef.current + pb.positionAtStart;
      pb.positionAtStart = curPos;
      pb.startRealTime = ac.currentTime;
      // stop sustained notes so re-schedule doesn't overlap stretched ones
      stopAllSoundsRef.current?.();
      if (pb.schedulerTimer) { clearTimeout(pb.schedulerTimer); pb.schedulerTimer = null; }
      pb.nextNoteIndex = findNoteIndex(noteScheduleRef.current, curPos);
    }
    tempoRef.current = newTempo;
    setTempo(newTempo);
    if (fileType === 'audio' && audioRef.current) {
      audioRef.current.playbackRate = newTempo;
      try { audioRef.current.preservesPitch = true; } catch {}
    }
    if (pb && ac && pb.isPlaying) startSchedulerRef.current?.();
  }, [fileType]);
  const stopAllSoundsRef = useRef(null);
  const startSchedulerRef = useRef(null);

  // ===== SCHEDULER =====
  const scheduleNotes = useCallback(() => {
    const pb = playbackRef.current;
    const ac = audioContextRef.current;
    if (!pb || !ac || !pb.isPlaying) return;
    const now = ac.currentTime;
    const speed = tempoRef.current || 1;
    const curPos = (now - pb.startRealTime) * speed + pb.positionAtStart;
    const endPos = curPos + LOOKAHEAD * speed;
    const schedule = noteScheduleRef.current;
    const extOut = midiOutputRef.current;
    const perfNow = performance.now();

    while (pb.nextNoteIndex < schedule.length) {
      const n = schedule[pb.nextNoteIndex];
      if (n.time > endPos) break;
      if (n.time >= curPos - 0.05 * speed) {
        const offset = (n.time - curPos) / speed;
        const when = Math.max(now, pb.startRealTime + (n.time - pb.positionAtStart) / speed);
        const playedNote = n.isDrum ? n.midiNote : Math.max(0, Math.min(127, n.midiNote + transposeRef.current));
        if (n.isDrum) { playDrumHit(ac, gainNodeRef.current, noiseBufferRef.current, n.midiNote, when, n.velocity); }
        else { const inst = instrumentsRef.current.get(n.programNumber); if (inst) { try { inst.play(playedNote, when, { duration: Math.min(n.duration, 5), gain: n.velocity }); } catch {} } }
        if (extOut) {
          const midiTs = perfNow + Math.max(0, offset) * 1000;
          if (!n.isDrum) {
            const sent = lastSentProgramRef.current;
            if (sent.get(n.channel) !== n.programNumber) {
              extOut.send([0xC0 | n.channel, n.programNumber & 0x7F], midiTs);
              sent.set(n.channel, n.programNumber);
            }
          }
          extOut.send([0x90 | n.channel, playedNote, Math.min(127, Math.max(1, Math.round(n.velocity * 127)))], midiTs);
          extOut.send([0x80 | n.channel, playedNote, 0], midiTs + (n.duration * 1000) / speed);
        }
      }
      pb.nextNoteIndex++;
    }
  }, []);

  const startScheduler = useCallback(() => {
    const tick = () => { scheduleNotes(); const pb = playbackRef.current; if (pb?.isPlaying) pb.schedulerTimer = setTimeout(tick, SCHED_MS); };
    tick();
  }, [scheduleNotes]);
  useEffect(() => { startSchedulerRef.current = startScheduler; }, [startScheduler]);

  // ===== SYNC =====
  const stopAllSounds = useCallback(() => {
    const ac = audioContextRef.current;
    if (ac) instrumentsRef.current.forEach(inst => { try { inst.stop(ac.currentTime); } catch {} });
    sendAllNotesOff();
  }, [sendAllNotesOff]);
  useEffect(() => { stopAllSoundsRef.current = stopAllSounds; }, [stopAllSounds]);

  const handleStopInternal = useCallback(() => {
    const pb = playbackRef.current;
    if (pb) { pb.isPlaying = false; pb.positionAtStart = 0; pb.nextNoteIndex = 0; if (pb.schedulerTimer) { clearTimeout(pb.schedulerTimer); pb.schedulerTimer = null; } }
    stopAllSounds();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setCurrentTime(0); setCurrentLineIdx(-1); setCurrentWordIdx(-1); setStatus('ready');
  }, [stopAllSounds]);

  const startSync = useCallback(() => {
    const sync = () => {
      let t = 0;
      if (fileType === 'audio' && audioRef.current) {
        t = audioRef.current.currentTime;
        if (audioRef.current.ended) { setStatus('ready'); setCurrentTime(0); if (animRef.current) cancelAnimationFrame(animRef.current); return; }
      } else if (fileType === 'midi') {
        const pb = playbackRef.current; const ac = audioContextRef.current;
        const speed = tempoRef.current || 1;
        if (pb && ac && pb.isPlaying) { t = (ac.currentTime - pb.startRealTime) * speed + pb.positionAtStart; if (t >= duration + 0.5) { handleStopInternal(); return; } }
        else if (pb) t = pb.positionAtStart;
      }
      setCurrentTime(t);
      if (lyricLines.length > 0) {
        let lineIdx = -1;
        for (let i = lyricLines.length - 1; i >= 0; i--) { if (lyricLines[i].startTime <= t + 0.1) { lineIdx = i; break; } }
        setCurrentLineIdx(lineIdx);
        if (lineIdx >= 0) { const line = lyricLines[lineIdx]; let wIdx = -1; for (let j = line.words.length - 1; j >= 0; j--) { if (line.words[j].time <= t + 0.05) { wIdx = j; break; } } setCurrentWordIdx(wIdx); }
        else setCurrentWordIdx(-1);
      }
      animRef.current = requestAnimationFrame(sync);
    };
    animRef.current = requestAnimationFrame(sync);
  }, [lyricLines, fileType, duration, handleStopInternal]);

  // ===== CONTROLS =====
  const handlePlay = async () => {
    if (fileType === 'audio') { if (audioRef.current) { audioRef.current.playbackRate = tempoRef.current || 1; try { audioRef.current.preservesPitch = true; } catch {} await audioRef.current.play(); setStatus('playing'); startSync(); } return; }
    const ac = audioContextRef.current; if (!ac) return;
    if (ac.state === 'suspended') await ac.resume();
    if (midiOutputRef.current) sendProgramChanges();
    const pb = playbackRef.current; pb.startRealTime = ac.currentTime; pb.isPlaying = true;
    if (gainNodeRef.current) gainNodeRef.current.gain.value = !internalSoundEnabled ? 0 : (isMuted ? 0 : volume);
    setStatus('playing'); startScheduler(); startSync();
  };

  const handlePause = () => {
    if (fileType === 'audio' && audioRef.current) audioRef.current.pause();
    if (fileType === 'midi') { const pb = playbackRef.current; const ac = audioContextRef.current; if (pb && ac) { const speed = tempoRef.current || 1; pb.positionAtStart = (ac.currentTime - pb.startRealTime) * speed + pb.positionAtStart; pb.isPlaying = false; if (pb.schedulerTimer) { clearTimeout(pb.schedulerTimer); pb.schedulerTimer = null; } stopAllSounds(); } }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setStatus('paused');
  };

  const handleStop = () => {
    if (fileType === 'audio' && audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; if (animRef.current) cancelAnimationFrame(animRef.current); setCurrentTime(0); setCurrentLineIdx(-1); setCurrentWordIdx(-1); setStatus('ready'); }
    else if (fileType === 'midi') handleStopInternal();
  };

  const applySeek = useCallback((newTime) => {
    if (fileType === 'audio' && audioRef.current) audioRef.current.currentTime = newTime;
    if (fileType === 'midi') {
      const pb = playbackRef.current; const ac = audioContextRef.current;
      if (pb && ac) { stopAllSounds(); pb.positionAtStart = newTime; pb.startRealTime = ac.currentTime; pb.nextNoteIndex = findNoteIndex(noteScheduleRef.current, newTime);
        if (pb.isPlaying) { if (pb.schedulerTimer) { clearTimeout(pb.schedulerTimer); pb.schedulerTimer = null; } if (midiOutputRef.current) sendProgramChanges(); startScheduler(); }
      }
    }
    setCurrentTime(newTime);
  }, [fileType, stopAllSounds, startScheduler, sendProgramChanges]);

  const progressRef = useRef(null);
  const timeFromEvent = useCallback((clientX) => {
    const el = progressRef.current; if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const handleProgressPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsSeeking(true);
    const t = timeFromEvent(e.clientX);
    setSeekPreview(t);
  };
  const handleProgressPointerMove = (e) => {
    if (!isSeeking) return;
    const t = timeFromEvent(e.clientX);
    setSeekPreview(t);
  };
  const handleProgressPointerUp = (e) => {
    if (!isSeeking) return;
    const t = timeFromEvent(e.clientX);
    setIsSeeking(false);
    applySeek(t);
  };
  const handleSeek = (e) => {
    if (isSeeking) return;
    applySeek(timeFromEvent(e.clientX));
  };

  const handleRestart = () => { handleStop(); setTimeout(() => handlePlay(), 100); };
  const formatTime = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };

  useEffect(() => {
    if (currentLineIdx < 0 || !lyricsRef.current || mode === 'lyrics-only') return;
    const el = lyricsRef.current.querySelector(`[data-line="${currentLineIdx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIdx, mode]);

  const handleClose = () => { cleanup(); onClose?.(); };

  const isAudioMode = fileType === 'audio';
  const accentColor = isAudioMode ? '#34d399' : '#60a5fa';
  const hasMidiOut = selectedOutputId != null;
  const selectedOutputName = midiOutputs.find(o => o.id === selectedOutputId)?.name || '';
  const cachedCount = instrumentCacheRef.current.size;

  const filteredSongs = allSongs;

  return (
    <div className="karaoke-overlay">
      <div className="karaoke-player">
        <header className="kp-header">
          <div className="kp-title">
            {isAudioMode ? <Headphones size={20} /> : <Music size={20} />}
            <span className="kp-filename">{activeName || 'Player'}</span>
            <span className="kp-type-badge">{isAudioMode ? 'MP3' : 'MIDI GM'}</span>
            {cachedCount > 0 && <span className="cache-badge">{cachedCount} inst.</span>}
          </div>
          <div className="kp-header-actions">
            <button className={`songlist-btn ${showSongList ? 'active' : ''}`} onClick={() => { setShowSongList(!showSongList); setShowMidiPanel(false); }}>
              <ListMusic size={14} />
              <span>Pesme{allSongsTotal > 0 ? ` (${allSongsTotal})` : ''}</span>
            </button>

            {!isAudioMode && midiOutputs.length > 0 && (
              <div className="midi-out-wrap">
                <button className={`midi-out-btn ${hasMidiOut ? 'connected' : ''}`} onClick={() => { setShowMidiPanel(!showMidiPanel); setShowSongList(false); }}
                  title={hasMidiOut ? `MIDI OUT: ${selectedOutputName}` : 'Poveži eksternu MIDI klavijaturu'}>
                  <Usb size={14} /><span>{hasMidiOut ? 'MIDI ✓' : 'MIDI'}</span>
                </button>
                {showMidiPanel && (
                  <div className="midi-panel">
                    <div className="midi-panel-title">MIDI Izlazi</div>
                    {midiOutputs.map(out => (
                      <button key={out.id} className={`midi-device ${selectedOutputId === out.id ? 'active' : ''}`} onClick={() => selectMidiOutput(out.id)}>
                        <Usb size={12} /><span>{out.name}</span>
                      </button>
                    ))}
                    {hasMidiOut && (<>
                      <div className="midi-divider" />
                      <label className="midi-toggle-label"><input type="checkbox" checked={internalSoundEnabled} onChange={(e) => setInternalSoundEnabled(e.target.checked)} /><span>Interni zvuk</span></label>
                      <div className="midi-divider" />
                      <button className="midi-device disconnect" onClick={() => selectMidiOutput(null)}>Isključi</button>
                    </>)}
                  </div>
                )}
              </div>
            )}

            {hasLyrics && fileType === 'midi' && (
              <button className={`mode-btn ${mode === 'lyrics-only' ? 'active' : ''}`} onClick={() => setMode(mode === 'full' ? 'lyrics-only' : 'full')} title={mode === 'full' ? 'Zamrzni tekst' : 'Odmrzni tekst'}>
                {mode === 'full' ? '🔓 Tekst' : '🔒 Tekst'}
              </button>
            )}
            <button className="close-btn" onClick={handleClose}><X size={22} /></button>
          </div>
        </header>

        {hasMidiOut && !isAudioMode && (
          <div className="midi-indicator"><Usb size={12} /><span>MIDI: <strong>{selectedOutputName}</strong></span>{!internalSoundEnabled && <span className="midi-ext-only">(ext)</span>}</div>
        )}

        <div className="kp-body">
          <div className="kp-lyrics" ref={lyricsRef}>
            {status === 'loading' && (
              <div className="kp-center"><div className="kp-spinner"></div><p>{isAudioMode ? 'Učitavanje audio...' : loadProgress || 'Učitavanje MIDI...'}</p></div>
            )}
            {status === 'error' && (<div className="kp-center"><p className="kp-error">{errorMsg}</p></div>)}
            {(status === 'ready' || status === 'playing' || status === 'paused') && (<>
              {hasLyrics && !isAudioMode ? (
                <div className="lyrics-scroll">
                  {lyricLines.map((line, li) => (
                    <div key={li} data-line={li} className={`lyric-line ${li === currentLineIdx ? 'active' : li < currentLineIdx ? 'past' : 'upcoming'}`}>
                      {line.words.map((word, wi) => (
                        <span key={wi} className={`lyric-word ${li === currentLineIdx && wi <= currentWordIdx ? 'highlighted' : ''}`}>{word.text}</span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="kp-center no-lyrics">
                  <div className="audio-viz">
                    {isAudioMode ? <Headphones size={72} /> : <Music size={72} />}
                    {status === 'playing' && (<div className="viz-bars">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="viz-bar" style={{ animationDelay: `${i * 0.15}s` }}></div>))}</div>)}
                  </div>
                  <p className="now-playing-label">{status === 'playing' ? 'Reprodukcija u toku...' : status === 'paused' ? 'Pauzirano' : isAudioMode ? 'Pritisnite Play' : 'Nema teksta'}</p>
                </div>
              )}
            </>)}
          </div>

          {/* ===== SONG LIST PANEL ===== */}
          {showSongList && (
            <div className="song-panel">
              <div className="sp-header">
                <h3>Sve pesme</h3>
                <button className="sp-close" onClick={() => setShowSongList(false)}><X size={16} /></button>
              </div>
              <div className="sp-search">
                <Search size={14} />
                <input type="text" placeholder="Pretraži po nazivu ili izvođaču..." value={songSearch} onChange={e => setSongSearch(e.target.value)} />
                {songSearch && <button className="sp-clear" onClick={() => setSongSearch('')}><X size={12} /></button>}
              </div>
              <div className="sp-count">{allSongsLoading && filteredSongs.length === 0 ? 'Učitavanje...' : `${allSongsTotal} pesama`}</div>
              <div className="sp-list">
                {filteredSongs.map(song => {
                  const isCurrent = song.id === activeSongId;
                  const sIsAudio = song.fileType === 'audio' || isAudioFile(song.fileName || '');
                  return (
                    <button key={song.id} className={`sp-item ${isCurrent ? 'active' : ''}`} onClick={() => !isCurrent && handleSongSelect(song)}>
                      <div className="sp-item-play">{isCurrent && status === 'playing' ? <Pause size={12} /> : <Play size={12} />}</div>
                      <div className="sp-item-info">
                        <span className="sp-item-title">{song.title}</span>
                        <span className="sp-item-artist">{song.artist}</span>
                      </div>
                      <span className={`sp-item-type ${sIsAudio ? 'mp3' : 'mid'}`}>{sIsAudio ? 'MP3' : 'MIDI'}</span>
                    </button>
                  );
                })}
                {allSongsPage < allSongsPages && (
                  <button className="sp-load-more" onClick={loadMoreSongs} disabled={allSongsLoading}>
                    {allSongsLoading ? 'Učitavanje...' : `Učitaj još (${allSongsTotal - filteredSongs.length} preostalo)`}
                  </button>
                )}
                {allSongsLoading && filteredSongs.length > 0 && <div className="sp-loading-more">Učitavanje...</div>}
              </div>
            </div>
          )}
        </div>

        <div
          className="kp-progress"
          ref={progressRef}
          onClick={handleSeek}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={handleProgressPointerUp}
        >
          <div className="kp-progress-bar" style={{ width: `${duration > 0 ? ((isSeeking ? seekPreview : currentTime) / duration) * 100 : 0}%` }}></div>
        </div>

        <footer className="kp-controls">
          <div className="kp-vol">
            <button className="ctrl-btn" onClick={() => setIsMuted(!isMuted)}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
            <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} className="vol-slider" />
          </div>
          <div className="kp-transpose kp-tempo" title="Tempo (brzina) — klik na broj za reset">
            <button className="ctrl-btn sm" onClick={() => applyTempo(Math.max(0.5, Math.round((tempo - 0.05) * 100) / 100))} disabled={tempo <= 0.5}><Minus size={14} /></button>
            <button
              type="button"
              className={`tr-val ${tempo !== 1 ? 'active' : ''}`}
              onClick={() => applyTempo(1)}
              title={tempo !== 1 ? 'Klik za reset (1.0x)' : 'Tempo'}
              disabled={tempo === 1}
            >
              {tempo.toFixed(2)}x
            </button>
            <button className="ctrl-btn sm" onClick={() => applyTempo(Math.min(2.0, Math.round((tempo + 0.05) * 100) / 100))} disabled={tempo >= 2}><Plus size={14} /></button>
          </div>
          <div className="kp-time">{formatTime(currentTime)}</div>
          <div className="kp-btns">
            <button className="ctrl-btn" onClick={handleRestart} title="Od početka"><SkipBack size={18} /></button>
            {status === 'playing' ? (
              <button className="ctrl-btn play-btn" onClick={handlePause}><Pause size={22} /></button>
            ) : (
              <button className="ctrl-btn play-btn" onClick={handlePlay} disabled={status === 'loading' || status === 'error'}><Play size={22} /></button>
            )}
            <button className="ctrl-btn" onClick={handleStop} title="Stop"><Square size={18} /></button>
          </div>
          <div className="kp-time kp-time-right">{formatTime(duration)}</div>
          {!isAudioMode && (
            <div className="kp-transpose" title="Transponovanje (polutonovi) — klik na broj za reset">
              <button className="ctrl-btn sm" onClick={() => setTranspose((t) => Math.max(-12, t - 1))} disabled={transpose <= -12}><Minus size={14} /></button>
              <button
                type="button"
                className={`tr-val ${transpose !== 0 ? 'active' : ''}`}
                onClick={() => setTranspose(0)}
                title={transpose !== 0 ? 'Klik za reset (0)' : 'Transpose'}
                disabled={transpose === 0}
              >
                {transpose > 0 ? `+${transpose}` : transpose}
              </button>
              <button className="ctrl-btn sm" onClick={() => setTranspose((t) => Math.min(12, t + 1))} disabled={transpose >= 12}><Plus size={14} /></button>
            </div>
          )}
        </footer>
      </div>

      <style jsx>{`
        .karaoke-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.92); backdrop-filter: blur(20px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; touch-action: pan-y pinch-zoom; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .karaoke-player { position: relative; width: 95vw; max-width: 1100px; height: 85vh; max-height: 720px; background: linear-gradient(180deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%); border: 1px solid rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.15); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 80px rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.08); }

        .kp-header { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); flex-shrink: 0; }
        .kp-title { display: flex; align-items: center; gap: 0.6rem; color: ${accentColor}; font-weight: 700; font-size: 0.9rem; min-width: 0; flex: 1; }
        .kp-filename { color: #e2e8f0; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kp-type-badge { font-size: 0.55rem; font-weight: 900; letter-spacing: 1px; padding: 2px 8px; border-radius: 100px; background: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.15); color: ${accentColor}; flex-shrink: 0; }
        .cache-badge { font-size: 0.55rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; background: rgba(16,185,129,0.1); color: #34d399; flex-shrink: 0; }
        .kp-header-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

        .songlist-btn { display: flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 100px; font-size: 0.65rem; font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; transition: 0.2s; }
        .songlist-btn:hover { background: rgba(96,165,250,0.1); border-color: rgba(96,165,250,0.3); color: #60a5fa; }
        .songlist-btn.active { background: rgba(96,165,250,0.15); border-color: #60a5fa; color: #60a5fa; }

        .midi-out-wrap { position: relative; }
        .midi-out-btn { display: flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 100px; font-size: 0.65rem; font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #64748b; cursor: pointer; transition: 0.2s; }
        .midi-out-btn:hover { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
        .midi-out-btn.connected { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.4); color: #fbbf24; }
        .midi-panel { position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px; background: #1a1a2e; border: 1px solid rgba(251,191,36,0.2); border-radius: 12px; padding: 0.5rem; z-index: 100; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        .midi-panel-title { font-size: 0.6rem; font-weight: 700; color: #64748b; padding: 4px 10px 6px; letter-spacing: 1px; text-transform: uppercase; }
        .midi-device { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; background: transparent; border: none; color: #94a3b8; cursor: pointer; transition: 0.15s; text-align: left; }
        .midi-device:hover { background: rgba(251,191,36,0.1); color: #fbbf24; }
        .midi-device.active { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .midi-device.disconnect { color: #f87171; }
        .midi-device.disconnect:hover { background: rgba(248,113,113,0.1); }
        .midi-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 3px 0; }
        .midi-toggle-label { display: flex; align-items: center; gap: 8px; padding: 5px 10px; font-size: 0.72rem; color: #94a3b8; cursor: pointer; }
        .midi-toggle-label input { accent-color: #60a5fa; cursor: pointer; }

        .midi-indicator { display: flex; align-items: center; gap: 6px; justify-content: center; padding: 3px 0; background: rgba(251,191,36,0.08); border-bottom: 1px solid rgba(251,191,36,0.1); font-size: 0.65rem; color: #fbbf24; font-weight: 600; flex-shrink: 0; }
        .midi-ext-only { color: #94a3b8; font-weight: 400; font-size: 0.6rem; }

        .mode-btn { padding: 5px 11px; border-radius: 100px; font-size: 0.65rem; font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; transition: 0.2s; }
        .mode-btn:hover, .mode-btn.active { background: rgba(96,165,250,0.15); border-color: #60a5fa; color: #60a5fa; }
        .close-btn { background: none; border: none; color: #64748b; cursor: pointer; padding: 5px; border-radius: 50%; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

        .kp-body { flex: 1; display: flex; overflow: hidden; position: relative; }

        .kp-lyrics { flex: 1; overflow-y: auto; padding: 2rem 2.5rem; scrollbar-width: thin; scrollbar-color: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.2) transparent; }
        .kp-center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem; color: #64748b; }
        .kp-error { color: #f87171; }
        .kp-spinner { width: 36px; height: 36px; border: 3px solid rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.1); border-top-color: ${accentColor}; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lyrics-scroll { padding: 3rem 0; }
        .lyric-line { padding: 0.5rem 0; font-size: 1.5rem; font-weight: 600; line-height: 1.6; transition: all 0.4s ease; text-align: center; }
        .lyric-line.upcoming { color: rgba(148,163,184,0.3); }
        .lyric-line.past { color: rgba(148,163,184,0.2); transform: scale(0.95); }
        .lyric-line.active { color: #e2e8f0; font-size: 1.9rem; transform: scale(1.05); text-shadow: 0 0 30px rgba(96,165,250,0.3); }
        .lyric-word { transition: color 0.15s ease; }
        .lyric-word.highlighted { color: #fbbf24; text-shadow: 0 0 20px rgba(251,191,36,0.4); }

        .no-lyrics { color: #475569; }
        .now-playing-label { font-size: 1rem; color: #94a3b8; font-weight: 600; }

        .audio-viz { position: relative; display: flex; flex-direction: column; align-items: center; color: ${accentColor}; }
        .viz-bars { display: flex; align-items: flex-end; gap: 6px; margin-top: 1.5rem; height: 40px; }
        .viz-bar { width: 6px; border-radius: 3px; background: ${accentColor}; animation: vizPulse 0.8s ease-in-out infinite alternate; }
        @keyframes vizPulse { 0% { height: 8px; opacity: 0.4; } 100% { height: 36px; opacity: 1; } }

        /* ===== SONG LIST PANEL ===== */
        .song-panel { width: 320px; border-left: 1px solid rgba(96,165,250,0.12); background: rgba(6,6,20,0.95); display: flex; flex-direction: column; animation: slideIn 0.25s ease; flex-shrink: 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .sp-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .sp-header h3 { font-size: 0.85rem; font-weight: 800; color: #e2e8f0; margin: 0; }
        .sp-close { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 50%; transition: 0.2s; display: flex; }
        .sp-close:hover { color: #ef4444; }
        .sp-search { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin: 8px 10px 0; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 100px; }
        .sp-search input { background: none; border: none; color: #e2e8f0; outline: none; font-size: 0.78rem; width: 100%; }
        .sp-search svg { color: #555; flex-shrink: 0; }
        .sp-clear { background: none; border: none; color: #555; cursor: pointer; display: flex; padding: 2px; }
        .sp-count { font-size: 0.65rem; color: #555; padding: 6px 14px 2px; font-weight: 700; }
        .sp-list { flex: 1; overflow-y: auto; padding: 4px 6px; scrollbar-width: thin; scrollbar-color: rgba(96,165,250,0.15) transparent; }
        .sp-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 8px; border-radius: 10px; background: transparent; border: none; color: #94a3b8; cursor: pointer; transition: all 0.15s; text-align: left; }
        .sp-item:hover { background: rgba(96,165,250,0.06); color: #e2e8f0; }
        .sp-item.active { background: rgba(96,165,250,0.12); color: ${accentColor}; }
        .sp-item-play { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); flex-shrink: 0; }
        .sp-item.active .sp-item-play { background: rgba(96,165,250,0.2); color: #60a5fa; }
        .sp-item-info { flex: 1; min-width: 0; }
        .sp-item-title { display: block; font-size: 0.78rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sp-item-artist { display: block; font-size: 0.65rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sp-item.active .sp-item-title { color: #e2e8f0; }
        .sp-item-type { font-size: 0.5rem; font-weight: 900; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 100px; flex-shrink: 0; }
        .sp-item-type.mid { background: rgba(96,165,250,0.08); color: #60a5fa; }
        .sp-item-type.mp3 { background: rgba(52,211,153,0.08); color: #34d399; }
        .sp-load-more {
          display: block; width: 100%; padding: 0.6rem; margin-top: 0.25rem; border: 1px dashed rgba(96,165,250,0.25);
          background: rgba(96,165,250,0.05); color: #60a5fa; font-size: 0.72rem; font-weight: 700; text-align: center;
          border-radius: 8px; cursor: pointer; transition: 0.2s;
        }
        .sp-load-more:hover:not(:disabled) { background: rgba(96,165,250,0.12); }
        .sp-load-more:disabled { opacity: 0.5; cursor: wait; }
        .sp-loading-more { text-align: center; padding: 0.5rem; font-size: 0.7rem; color: #64748b; }

        .kp-progress { height: 10px; background: transparent; cursor: pointer; position: relative; flex-shrink: 0; touch-action: none; display: flex; align-items: center; padding: 0 2px; }
        .kp-progress::before { content: ''; position: absolute; left: 2px; right: 2px; top: 50%; transform: translateY(-50%); height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; transition: height 0.15s; }
        .kp-progress:hover::before, .kp-progress:active::before { height: 6px; }
        .kp-progress-bar { height: 4px; background: linear-gradient(90deg, ${accentColor}, #a78bfa); border-radius: 2px; transition: width 0.1s linear, height 0.15s; position: relative; z-index: 1; }
        .kp-progress:hover .kp-progress-bar, .kp-progress:active .kp-progress-bar { height: 6px; }
        .kp-progress-bar::after { content: ''; position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: ${accentColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s, transform 0.15s; pointer-events: none; }
        .kp-progress:hover .kp-progress-bar::after, .kp-progress:active .kp-progress-bar::after { opacity: 1; }
        .kp-progress:active .kp-progress-bar::after { transform: translateY(-50%) scale(1.15); }
        .kp-transpose { display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 100px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
        .kp-tempo .tr-val { min-width: 44px; }
        .kp-transpose .ctrl-btn.sm { width: 24px; height: 24px; padding: 0; color: #94a3b8; }
        .kp-transpose .ctrl-btn.sm:hover:not(:disabled) { color: ${accentColor}; background: rgba(255,255,255,0.06); }
        .tr-val { font-size: 0.72rem; font-weight: 800; font-variant-numeric: tabular-nums; color: #e2e8f0; min-width: 28px; text-align: center; background: transparent; border: none; padding: 2px 0; cursor: default; transition: color 0.15s; }
        .tr-val.active { color: #f59e0b; cursor: pointer; }
        .tr-val.active:hover { color: #fbbf24; }

        .kp-controls { display: flex; align-items: center; gap: 0.75rem; padding: 0.8rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.3); flex-shrink: 0; position: relative; }
        .kp-time { font-size: 0.7rem; color: #64748b; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 32px; }
        .kp-time-right { margin-left: auto; }
        .kp-btns { display: flex; align-items: center; gap: 0.4rem; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
        .ctrl-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; cursor: pointer; transition: all 0.2s; }
        .ctrl-btn:hover:not(:disabled) { background: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.15); color: ${accentColor}; border-color: rgba(${isAudioMode ? '52,211,153' : '96,165,250'},0.3); }
        .ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .ctrl-btn.play-btn { width: 44px; height: 44px; background: ${isAudioMode ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'linear-gradient(135deg, #3b82f6, #6366f1)'}; border-color: transparent; color: white; }
        .ctrl-btn.play-btn:hover:not(:disabled) { transform: scale(1.1); color: white; }
        .kp-vol { display: flex; align-items: center; gap: 0.4rem; }
        .kp-vol .ctrl-btn { width: 28px; height: 28px; }
        .vol-slider { width: 70px; accent-color: ${accentColor}; cursor: pointer; }

        @media (max-width: 1024px) {
          .karaoke-player {
            width: min(100vw - 24px, 980px);
            height: min(92vh, 820px);
          }
          .kp-header {
            align-items: flex-start;
            gap: 0.85rem;
            flex-wrap: wrap;
          }
          .kp-title {
            width: 100%;
          }
          .kp-header-actions {
            width: 100%;
            justify-content: flex-end;
            flex-wrap: wrap;
          }
          .song-panel {
            width: 340px;
          }
          .kp-lyrics {
            padding: 1.5rem 1.4rem;
          }
        }

        @media (max-width: 768px) {
          .karaoke-player { width: 100vw; height: 100vh; max-width: none; max-height: none; border-radius: 0; }
          .kp-header {
            padding: 0.75rem 0.9rem;
          }
          .kp-title {
            gap: 0.45rem;
          }
          .kp-filename { max-width: 190px; }
          .kp-header-actions {
            justify-content: flex-start;
            gap: 0.45rem;
          }
          .songlist-btn,
          .midi-out-btn,
          .mode-btn {
            min-height: 34px;
          }
          .kp-lyrics { padding: 1.2rem 0.95rem; }
          .lyric-line { font-size: 1.1rem; }
          .lyric-line.active { font-size: 1.35rem; }
          .vol-slider { width: 60px; }
          .kp-progress { height: 14px; }
          .kp-progress-bar::after { width: 18px; height: 18px; right: -9px; opacity: 1; }
          .song-panel {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: min(88vw, 360px);
            z-index: 20;
            box-shadow: -8px 0 32px rgba(0,0,0,0.5);
          }
          .midi-panel { min-width: 200px; right: 0; }
          .kp-controls {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            grid-template-areas:
              "btns btns btns"
              "vol tempo transpose"
              "time time timeRight";
            row-gap: 0.5rem;
            column-gap: 0.5rem;
            justify-content: stretch;
            align-items: center;
            padding: 0.75rem 0.9rem calc(0.9rem + env(safe-area-inset-bottom));
            position: static;
          }
          .kp-btns {
            position: static;
            transform: none;
            grid-area: btns;
            justify-self: center;
          }
          .kp-vol { grid-area: vol; justify-self: start; }
          .kp-controls > .kp-tempo { grid-area: tempo; justify-self: center; }
          .kp-controls > :not(.kp-tempo).kp-transpose { grid-area: transpose; justify-self: end; }
          .kp-controls > .kp-time:not(.kp-time-right) { grid-area: time; justify-self: start; }
          .kp-time-right { grid-area: timeRight; justify-self: end; margin-left: 0; }
        }

        @media (max-width: 560px) {
          .kp-title {
            align-items: flex-start;
            flex-wrap: wrap;
          }
          .kp-filename {
            max-width: 100%;
            width: 100%;
          }
          .kp-header-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }
          .kp-header-actions > :global(*) {
            width: 100%;
          }
          .close-btn {
            justify-self: end;
          }
          .songlist-btn,
          .midi-out-btn,
          .mode-btn {
            justify-content: center;
            padding: 0.55rem 0.7rem;
          }
          .song-panel {
            width: 100%;
            left: 0;
          }
          .sp-item {
            padding: 0.85rem 0.65rem;
          }
          .sp-item-title {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .lyrics-scroll {
            padding: 1.5rem 0 2rem;
          }
          .lyric-line {
            font-size: 0.98rem;
            line-height: 1.7;
          }
          .lyric-line.active {
            font-size: 1.16rem;
            transform: scale(1.02);
          }
          .vol-slider { width: 48px; }
          .kp-vol .ctrl-btn { width: 26px; height: 26px; }
          .kp-transpose { padding: 2px 5px; gap: 2px; }
          .kp-transpose .ctrl-btn.sm { width: 22px; height: 22px; }
          .tr-val { min-width: 24px; font-size: 0.68rem; }
          .ctrl-btn { width: 34px; height: 34px; }
          .ctrl-btn.play-btn { width: 42px; height: 42px; }
        }
      `}</style>
    </div>
  );
}
