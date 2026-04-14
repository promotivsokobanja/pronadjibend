'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, ListMusic, Eye, EyeOff, MessageSquare, Music, Clock, Settings, ArrowLeft, X, Volume2, VolumeX, Zap, ZapOff, Type, RotateCcw, ChevronDown, Bell, Banknote, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LiveDashboard({ bandId, musicianId }) {
  const ownerId = bandId || musicianId;
  const ownerType = bandId ? 'band' : 'musician';
  const router = useRouter();
  const [isNightMode, setIsNightMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [requestView, setRequestView] = useState('active');
  const [showRepertoireBrowser, setShowRepertoireBrowser] = useState(false);
  const [expandedCheatsheetSetListId, setExpandedCheatsheetSetListId] = useState('');

  // Song cheatsheet state
  const [allSongs, setAllSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songSearch, setSongSearch] = useState('');
  const [songLoading, setSongLoading] = useState(false);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [showSetlistSongDropdown, setShowSetlistSongDropdown] = useState(false);
  const [lastAddedSongId, setLastAddedSongId] = useState('');
  const lyricsRef = useRef(null);
  const songComboRef = useRef(null);
  const setlistSongComboRef = useRef(null);
  const hasLoadedRequestsRef = useRef(false);
  const knownRequestIdsRef = useRef(new Set());
  const autoAcceptedRequestIdsRef = useRef(new Set());

  // Set list state — read localStorage synchronously on first render
  const setListStorageKey = ownerId ? `pb_live_set_lists_${ownerType}_${ownerId}` : '';

  function readSetListsFromStorage(key) {
    if (typeof window === 'undefined' || !key) return [];
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => entry && typeof entry === 'object' && entry.id)
        .map((entry, index) => ({
          id: String(entry.id),
          name: String(entry.name || `Set lista ${index + 1}`).trim() || `Set lista ${index + 1}`,
          items: Array.isArray(entry.items)
            ? entry.items
                .filter((item) => item && typeof item === 'object' && item.songId)
                .map((item) => ({
                  id: String(item.id || `${item.songId}-${Math.random().toString(36).slice(2, 8)}`),
                  songId: String(item.songId),
                  title: String(item.title || ''),
                  artist: String(item.artist || ''),
                }))
            : [],
        }));
    } catch {
      return [];
    }
  }

  const [setLists, setSetLists] = useState(() => readSetListsFromStorage(setListStorageKey));
  const [selectedSetListId, setSelectedSetListId] = useState(() => {
    const initial = readSetListsFromStorage(setListStorageKey);
    return initial[0]?.id || '';
  });
  const [setListNameDraft, setSetListNameDraft] = useState('');
  const setListsRef = useRef(setLists);

  useEffect(() => {
    setListsRef.current = setLists;
  }, [setLists]);

  // Settings state
  const [settings, setSettings] = useState({
    venueName: 'Kafana "Druga kuća"',
    maxRequests: 10,
    showTips: true,
    soundEnabled: true,
    autoAccept: false,
    fontSize: 100, // percentage
  });
  const [notifPermission, setNotifPermission] = useState('default');

  const normalizeMaxRequests = useCallback((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 10;
    const normalized = Math.floor(parsed);
    if (normalized < 0) return 0;
    if (normalized > 50) return 50;
    return normalized;
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveMaxPendingRequests = useCallback(async (nextValue) => {
    if (!bandId) return; // settings only for bands
    try {
      await fetch(`/api/bands/${encodeURIComponent(bandId)}/live-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPendingRequests: nextValue }),
      });
    } catch (err) {
      console.error('Error saving maxPendingRequests:', err);
    }
  }, [bandId]);

  const maxRequestsSaveTimerRef = useRef(null);

  const handleMaxRequestsChange = (rawValue) => {
    const nextValue = normalizeMaxRequests(rawValue);
    updateSetting('maxRequests', nextValue);
    if (!bandId) return; // settings save only for bands
    if (maxRequestsSaveTimerRef.current) {
      clearTimeout(maxRequestsSaveTimerRef.current);
    }
    maxRequestsSaveTimerRef.current = setTimeout(() => {
      saveMaxPendingRequests(nextValue);
      maxRequestsSaveTimerRef.current = null;
    }, 220);
  };

  const resetSession = async () => {
    if (!confirm('Da li ste sigurni da želite da resetujete sesiju? Svi zahtevi će biti obrisani.')) {
      return;
    }
    try {
      const params = new URLSearchParams();
      if (bandId) params.set('bandId', bandId);
      else if (musicianId) params.set('musicianId', musicianId);

      const resp = await fetch(`/api/live-requests?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!resp.ok) {
        throw new Error('Reset sesije nije uspeo.');
      }

      setRequests([]);
      knownRequestIdsRef.current = new Set();
      autoAcceptedRequestIdsRef.current = new Set();
    } catch (err) {
      alert('Greška pri resetovanju sesije. Pokušajte ponovo.');
    }
  };

  const playNewRequestTone = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      gain.connect(audioCtx.destination);

      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.24);

      const finish = () => {
        try { audioCtx.close(); } catch { /* ignore */ }
      };
      osc.onended = finish;
      setTimeout(finish, 420);
    } catch {
      /* ignore sound errors */
    }
  }, []);

  const notifyNewRequests = useCallback((freshRequests) => {
    if (typeof window === 'undefined' || !Array.isArray(freshRequests) || freshRequests.length === 0) return;

    if (settingsRef.current.soundEnabled) {
      playNewRequestTone();
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const first = freshRequests[0];
    const title = freshRequests.length === 1
      ? `Novi zahtev: ${first?.song || 'Pesma'}`
      : `Nova ${freshRequests.length} zahteva`;
    const body = freshRequests.length === 1
      ? `${first?.client || 'Gost'} • ${first?.time || 'upravo'}`
      : 'Otvori Live panel za detalje.';

    try {
      const notif = new Notification(title, { body, tag: 'pb-live-new-request' });
      setTimeout(() => notif.close(), 5000);
    } catch {
      /* ignore notification errors */
    }
  }, [playNewRequestTone]);

  useEffect(() => {
    if (!bandId) return; // live-settings only exist for bands
    let cancelled = false;

    const loadLiveSettings = async () => {
      try {
        const response = await fetch(`/api/bands/${encodeURIComponent(bandId)}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const band = await response.json();
        if (cancelled) return;
        setSettings((prev) => ({
          ...prev,
          maxRequests: normalizeMaxRequests(band?.maxPendingRequests),
        }));
      } catch (err) {
        console.error('Error loading live settings:', err);
      }
    };

    loadLiveSettings();

    return () => {
      cancelled = true;
    };
  }, [bandId, normalizeMaxRequests]);

  useEffect(() => {
    return () => {
      if (maxRequestsSaveTimerRef.current) {
        clearTimeout(maxRequestsSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    setNotifPermission(Notification.permission || 'default');
  }, []);

  useEffect(() => {
    if (!ownerId) {
      setAllSongs([]);
      setSongLoading(false);
      return;
    }

    let cancelled = false;

    const loadSongs = async () => {
      setSongLoading(true);
      try {
        const params = new URLSearchParams();
        if (bandId) params.set('bandId', bandId);
        else if (musicianId) params.set('musicianId', musicianId);

        const resp = await fetch(`/api/songs?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await resp.json();

        if (!cancelled) {
          setAllSongs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setAllSongs([]);
        }
        console.error('Error loading repertoire songs:', err);
      } finally {
        if (!cancelled) {
          setSongLoading(false);
        }
      }
    };

    loadSongs();

    return () => {
      cancelled = true;
    };
  }, [ownerId, bandId, musicianId, notifyNewRequests]);

  useEffect(() => {
    if (!ownerId) {
      setRequests([]);
      return;
    }

    let cancelled = false;

    const loadRequests = async () => {
      try {
        const params = new URLSearchParams();
        if (bandId) params.set('bandId', bandId);
        else if (musicianId) params.set('musicianId', musicianId);

        const resp = await fetch(`/api/live-requests?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await resp.json();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];

          const currentKnown = knownRequestIdsRef.current;
          const newIncoming = list.filter((req) => req?.id && !currentKnown.has(req.id));

          knownRequestIdsRef.current = new Set(list.map((req) => req.id).filter(Boolean));

          if (hasLoadedRequestsRef.current && newIncoming.length > 0) {
            notifyNewRequests(newIncoming);
          }
          hasLoadedRequestsRef.current = true;

          if (settingsRef.current.autoAccept) {
            const toAutoAccept = list.filter(
              (req) => req.status === 'pending' && !autoAcceptedRequestIdsRef.current.has(req.id)
            );
            toAutoAccept.forEach((req) => {
              autoAcceptedRequestIdsRef.current.add(req.id);
              updateRequestStatus(req.id, 'ACCEPTED');
            });
          } else {
            autoAcceptedRequestIdsRef.current = new Set();
          }

          const normalized = settingsRef.current.autoAccept
            ? list.map((req) =>
                req.status === 'pending'
                  ? { ...req, status: 'accepted' }
                  : req
              )
            : list;

          setRequests(normalized);
        }
      } catch (err) {
        if (!cancelled) {
          setRequests([]);
        }
        console.error('Error loading live requests:', err);
      }
    };

    loadRequests();
    const intervalId = setInterval(loadRequests, 2500);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ownerId, bandId, musicianId, notifyNewRequests]);


  const persistSetLists = useCallback((nextLists, storageKey = setListStorageKey) => {
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextLists));
    } catch {
      /* ignore */
    }
  }, [setListStorageKey]);

  const updateSetLists = useCallback((updater) => {
    setSetLists((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistSetLists(next);
      return next;
    });
  }, [persistSetLists]);

  useEffect(() => {
    if (typeof window === 'undefined' || !setListStorageKey) return;
    const flushSetLists = () => {
      persistSetLists(setListsRef.current, setListStorageKey);
    };
    window.addEventListener('beforeunload', flushSetLists);
    return () => {
      window.removeEventListener('beforeunload', flushSetLists);
    };
  }, [persistSetLists, setListStorageKey]);

  const selectedSetList = setLists.find((entry) => entry.id === selectedSetListId) || null;
  const selectedSetListSongCountById = (selectedSetList?.items || []).reduce((acc, item) => {
    const key = String(item.songId || '');
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    setSetListNameDraft(selectedSetList?.name || '');
  }, [selectedSetListId, selectedSetList?.name]);

  useEffect(() => {
    if (activeTab === 'addSong') {
      if (!selectedSetListId) {
        setShowSetlistSongDropdown(false);
        return;
      }
      setShowSetlistSongDropdown(true);
      return;
    }
    if (activeTab !== 'repertoire') return;
    if (!selectedSetListId) {
      setShowRepertoireBrowser(false);
      setShowSetlistSongDropdown(false);
      return;
    }
    setShowRepertoireBrowser(true);
  }, [activeTab, selectedSetListId]);

  const fontScale = settings.fontSize / 100;
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const handleSelectSong = async (song) => {
    if (song.lyrics) {
      setSelectedSong(song);
      return;
    }
    try {
      const resp = await fetch(`/api/songs/${song.id}`);
      const data = await resp.json();
      setSelectedSong(data);
      // Update cache
      setAllSongs((prev) =>
        Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : []
      );
    } catch (err) {
      setSelectedSong(song);
    }
  };

  const openSongFromSetListItem = useCallback(async (item) => {
    const matchedSong = allSongs.find((song) => song.id === item.songId);
    const fallbackSong = matchedSong || {
      id: item.songId,
      title: item.title,
      artist: item.artist,
      lyrics: null,
    };
    await handleSelectSong(fallbackSong);
    setActiveTab('cheatsheet');
  }, [allSongs]);

  const createSetList = useCallback(() => {
    const nextId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `setlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = {
      id: nextId,
      name: `Set lista ${setLists.length + 1}`,
      items: [],
    };
    updateSetLists((prev) => [...prev, next]);
    setSelectedSetListId(nextId);
    setShowRepertoireBrowser(true);
    setShowSetlistSongDropdown(true);
  }, [setLists.length, updateSetLists]);

  const renameSelectedSetList = useCallback((nextName) => {
    const trimmed = String(nextName || '').trim();
    if (!selectedSetListId || !trimmed) return;
    updateSetLists((prev) =>
      prev.map((entry) => (entry.id === selectedSetListId ? { ...entry, name: trimmed } : entry))
    );
  }, [selectedSetListId, updateSetLists]);

  const deleteSelectedSetList = useCallback(() => {
    if (!selectedSetListId) return;
    updateSetLists((prev) => {
      const next = prev.filter((entry) => entry.id !== selectedSetListId);
      setSelectedSetListId(next[0]?.id || '');
      return next;
    });
  }, [selectedSetListId, updateSetLists]);

  const addSongToSelectedSetList = useCallback((song) => {
    if (!selectedSetListId || !song?.id) return;
    const nextId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `setitem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let wasAdded = false;
    updateSetLists((prev) =>
      prev.map((entry) => {
        if (entry.id !== selectedSetListId) return entry;
        const exists = entry.items.some((item) => String(item.songId) === String(song.id));
        if (exists) return entry;
        wasAdded = true;
        return {
          ...entry,
          items: [
            ...entry.items,
            {
              id: nextId,
              songId: song.id,
              title: song.title || 'Bez naziva',
              artist: song.artist || '',
            },
          ],
        };
      })
    );
    if (wasAdded) {
      setLastAddedSongId(String(song.id));
    }
  }, [selectedSetListId, updateSetLists]);

  useEffect(() => {
    if (!lastAddedSongId) return;
    const timer = setTimeout(() => setLastAddedSongId(''), 1800);
    return () => clearTimeout(timer);
  }, [lastAddedSongId]);

  const removeSetListItem = useCallback((itemId) => {
    if (!selectedSetListId || !itemId) return;
    updateSetLists((prev) =>
      prev.map((entry) =>
        entry.id === selectedSetListId
          ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
          : entry
      )
    );
  }, [selectedSetListId, updateSetLists]);

  const moveSetListItem = useCallback((itemId, direction) => {
    if (!selectedSetListId || !itemId || !direction) return;
    updateSetLists((prev) =>
      prev.map((entry) => {
        if (entry.id !== selectedSetListId) return entry;
        const currentIndex = entry.items.findIndex((item) => item.id === itemId);
        if (currentIndex === -1) return entry;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= entry.items.length) return entry;
        const nextItems = [...entry.items];
        const [moved] = nextItems.splice(currentIndex, 1);
        nextItems.splice(targetIndex, 0, moved);
        return { ...entry, items: nextItems };
      })
    );
  }, [selectedSetListId, updateSetLists]);

  const refreshSelectedSong = useCallback(async () => {
    if (!selectedSong?.id) return;
    try {
      const resp = await fetch(`/api/songs/${selectedSong.id}`);
      const data = await resp.json();
      setSelectedSong(data);
      setAllSongs((prev) =>
        Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : []
      );
    } catch {
      // Ignore refresh errors and keep current state.
    }
  }, [selectedSong?.id]);

  useEffect(() => {
    if (activeTab !== 'cheatsheet') return;
    refreshSelectedSong();
  }, [activeTab, refreshSelectedSong]);

  const songsList = Array.isArray(allSongs) ? allSongs : [];

  const filteredSongs = songsList.filter((s) => {
    const q = songSearch.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q)
    );
  });

  const selectedSetListSongIndex = selectedSetList?.items.findIndex(
    (item) => item.songId === selectedSong?.id
  ) ?? -1;

  const openAdjacentSetListSong = useCallback(async (direction) => {
    if (!selectedSetList || selectedSetListSongIndex === -1) return;
    const targetIndex = direction === 'prev' ? selectedSetListSongIndex - 1 : selectedSetListSongIndex + 1;
    if (targetIndex < 0 || targetIndex >= selectedSetList.items.length) return;
    await openSongFromSetListItem(selectedSetList.items[targetIndex]);
  }, [openSongFromSetListItem, selectedSetList, selectedSetListSongIndex]);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (songComboRef.current && !songComboRef.current.contains(e.target)) {
        setShowSongDropdown(false);
      }
      if (setlistSongComboRef.current && !setlistSongComboRef.current.contains(e.target)) {
        setShowSetlistSongDropdown(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  // Transpose chords
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const renderLyrics = (text) => {
    if (!text) return null;
    const normalized = text.replace(/\r/g, '');
    return normalized.split('\n').map((line, i) => (
      <div key={i} className="lyrics-line">
        {line
          ? line.split(/(\[[A-G][#b]?(?:m|maj|min|sus|dim|aug)?[0-9]?\])/g).map((part, j) =>
              part.match(/^\[/) ? (
                <span key={j} className="chord-inline">{part.slice(1, -1)}</span>
              ) : (
                <span key={j}>{part}</span>
              )
            )
          : <span className="empty-line">&nbsp;</span>}
      </div>
    ));
  };

  const updateRequestStatus = async (id, status) => {
    try {
      await fetch('/api/live-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error('Error updating request status:', err);
    }
  };

  const handleAcceptRequest = async (req) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'accepted' } : r))
    );
    updateRequestStatus(req.id, 'ACCEPTED');

    await openRequestSong(req);
  };

  const openRequestSong = async (req) => {
    if (req.requestType === 'waiter_tip') {
      return;
    }

    setActiveTab('cheatsheet');

    const requestedTitle = (req.song || '').trim().toLowerCase();
    if (!requestedTitle) return;

    const matched = songsList.find(
      (s) => (s.title || '').trim().toLowerCase() === requestedTitle
    );

    if (matched) {
      await handleSelectSong(matched);
      return;
    }

    const looseMatched = songsList.find((s) =>
      (s.title || '').toLowerCase().includes(requestedTitle)
    );
    if (looseMatched) {
      await handleSelectSong(looseMatched);
    }
  };

  const handleSkipRequest = (req) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r))
    );
    updateRequestStatus(req.id, 'REJECTED');
  };

  const handleMarkPlayed = (req) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'played' } : r))
    );
    updateRequestStatus(req.id, 'PLAYED');
  };

  const requestDesktopNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const p = await Notification.requestPermission();
      setNotifPermission(p);
    } catch {
      /* ignore */
    }
  }, []);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'accepted'
  ).length;
  const requestHasLyrics = useCallback((req) => {
    const requestedTitle = String(req?.song || '').trim().toLowerCase();
    if (!requestedTitle) return false;

    const matched = songsList.find(
      (song) => (song.title || '').trim().toLowerCase() === requestedTitle
    );
    if (matched) return Boolean(matched.lyrics);

    const looseMatched = songsList.find((song) =>
      (song.title || '').toLowerCase().includes(requestedTitle)
    );
    return Boolean(looseMatched?.lyrics);
  }, [songsList]);
  const filteredRequests = requests.filter((r) =>
    requestView === 'active'
      ? r.status === 'pending' || r.status === 'accepted'
      : r.status === 'rejected' || r.status === 'played'
  );

  const handleExit = () => {
    persistSetLists(setListsRef.current);
    // In sub-views, treat exit as "step back".
    if (activeTab === 'cheatsheet' || activeTab === 'repertoire' || activeTab === 'addSong') {
      setActiveTab('requests');
      return;
    }
    // From main live view, exit to owner dashboard.
    if (bandId) {
      router.push('/bands');
      return;
    }
    if (musicianId) {
      router.push('/muzicari/profil');
      return;
    }
    router.push('/');
  };

  return (
    <div className={`live-dashboard ${isNightMode ? 'night-vision' : ''}`}>
      {/* HUD Header */}
      <header className="hud-header">
        <div className="hud-left">
          <button 
            className="hud-btn exit-btn" 
            onClick={handleExit}
          >
            <ArrowLeft size={20} />
            <span>IZLAZ</span>
          </button>
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <span>LIVE: {settings.venueName}</span>
          </div>
        </div>
        <div
          className={`hud-pending-orbit ${pendingCount > 0 ? 'has-pending' : ''}`}
          aria-live="polite"
          aria-label={`${pendingCount} zahteva na čekanju`}
        >
          <span className="hud-pending-orbit-num">{pendingCount}</span>
        </div>
        <div className="hud-controls">
          <button 
            className={`hud-btn ${isNightMode ? 'active' : ''}`}
            onClick={() => setIsNightMode(!isNightMode)}
          >
            {isNightMode ? <Eye size={20} /> : <EyeOff size={20} />}
            <span>NIGHT VISION</span>
          </button>
          <button 
            className={`hud-btn exit-btn ${showSettings ? 'settings-active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="hud-main">
        {/* Sidebar Nav */}
        <nav className="hud-side-nav">
          <button className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <MessageSquare size={24} />
            <span className="badge">{pendingCount}</span>
            <span className="nav-tooltip">Zahtevi</span>
          </button>
          <button className={`nav-item ${activeTab === 'cheatsheet' ? 'active' : ''}`} onClick={() => setActiveTab('cheatsheet')}>
            <Music size={24} />
            <span className="nav-tooltip">Tekst pesme</span>
          </button>
          <button className={`nav-item ${activeTab === 'repertoire' ? 'active' : ''}`} onClick={() => setActiveTab('repertoire')}>
            <ListMusic size={24} />
            <span className="nav-tooltip">Set liste</span>
          </button>
          <button className={`nav-item ${activeTab === 'addSong' ? 'active' : ''}`} onClick={() => { setActiveTab('addSong'); setShowSetlistSongDropdown(true); }}>
            <PlusCircle size={24} />
            <span className="nav-tooltip">Dodaj pesmu</span>
          </button>
        </nav>

        {/* Content Area */}
        <section className="hud-content">
          {activeTab === 'requests' && (
            <div className="request-feed">
              <h2 className={`requests-title ${isNightMode ? 'night-glow' : ''}`}>Zahtevi Gostiju</h2>
              <div className="request-view-toggle">
                <button
                  className={`mini-tab ${requestView === 'active' ? 'active' : ''}`}
                  onClick={() => setRequestView('active')}
                >
                  Aktivni
                </button>
                <button
                  className={`mini-tab ${requestView === 'history' ? 'active' : ''}`}
                  onClick={() => setRequestView('history')}
                >
                  Istorija
                </button>
              </div>
              {filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={48} />
                  <p>{requestView === 'active' ? 'Nema aktivnih zahteva' : 'Nema istorije zahteva'}</p>
                </div>
              ) : (
                <div className="feed-grid">
                  {filteredRequests.map(req => (
                    <div
                      key={req.id}
                      className={`request-card ${req.status} ${
                        req.requestType === 'waiter_tip' || req.requestType === 'song_with_tip'
                          ? 'waiter-tip'
                          : ''
                      }`}
                      style={{ fontSize: `${fontScale}em` }}
                    >
                      <div className="req-header">
                        <span className="time">{req.time}</span>
                        <span className="req-header-right">
                          {(req.requestType === 'waiter_tip' || req.requestType === 'song_with_tip') && (
                            <Banknote size={18} className="tip-money-icon" aria-hidden />
                          )}
                          {settings.showTips && req.tip && <span className="tip">{req.tip}</span>}
                          {req.tipAmountRsd != null && req.tipAmountRsd > 0 && (
                            <span className="tip-amount">{req.tipAmountRsd} RSD</span>
                          )}
                        </span>
                      </div>
                      <h3 className="song-title">{req.song}</h3>
                      <p className="client-name">od: {req.client}</p>
                      <div className="req-actions">
                        {req.status === 'pending' && (
                          <>
                            <button
                              className="btn-hud accept"
                              onClick={() => handleAcceptRequest(req)}
                            >
                              Prihvati
                            </button>
                            <button className="btn-hud skip" onClick={() => handleSkipRequest(req)}>
                              Preskoči
                            </button>
                          </>
                        )}
                        {req.status === 'accepted' && (
                          <>
                            <button className="btn-hud accept" onClick={() => openRequestSong(req)}>
                              {requestHasLyrics(req) ? 'Tekst' : 'Bez teksta'}
                            </button>
                            <button className="btn-hud skip" onClick={() => handleMarkPlayed(req)}>
                              Svirano
                            </button>
                          </>
                        )}
                        {(req.status === 'rejected' || req.status === 'played') && (
                          <span className="status-chip">{req.status === 'played' ? 'Svirano' : 'Preskočeno'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {settings.maxRequests > 0 && pendingCount >= settings.maxRequests && (
                <div className="max-requests-warning">
                  ⚠ Dostignut maksimalan broj zahteva na čekanju ({settings.maxRequests})
                </div>
              )}
            </div>
          )}

          {activeTab === 'repertoire' && (
            <div className="song-picker repertoire-open">
              {setLists.length === 0 ? (
                <div className="setlists-empty">
                  Napravite prvu set listu na <PlusCircle size={14} style={{ verticalAlign: 'middle' }} /> tabu.
                </div>
              ) : (
                <>
                  <div className="setlists-selector">
                    {setLists.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`setlist-chip ${entry.id === selectedSetListId ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSetListId(entry.id);
                        }}
                      >
                        {entry.name}
                      </button>
                    ))}
                  </div>

                  {selectedSetListId && (
                    <div className="setlist-repertoire-stack">
                      <div className="setlist-editor">
                        <div className="active-setlist-head">
                          <div className="setlist-editor-top">
                            <input
                              type="text"
                              value={setListNameDraft}
                              onChange={(e) => setSetListNameDraft(e.target.value)}
                              onBlur={() => renameSelectedSetList(setListNameDraft)}
                              className="setlist-name-input"
                              placeholder="Naziv set liste"
                            />
                            <button type="button" className="setlist-delete-btn" onClick={deleteSelectedSetList}>
                              Obriši
                            </button>
                          </div>

                          <div className="setlist-status-row">
                            <span>Dodato u listu: <strong>{selectedSetList.items.length}</strong></span>
                          </div>
                        </div>

                        <div className="setlist-items">
                          {selectedSetList.items.length === 0 ? (
                            <div className="setlists-empty small">
                              Još nema pesama u ovoj listi.
                              <button type="button" className="setlist-create-btn" style={{ marginTop: '0.5rem' }} onClick={() => { setActiveTab('addSong'); setShowSetlistSongDropdown(true); }}>
                                + Dodaj pesmu
                              </button>
                            </div>
                          ) : (
                            selectedSetList.items.map((item, index) => (
                              <div key={item.id} className={`setlist-item-row ${item.songId === lastAddedSongId ? 'just-added' : ''}`}>
                                <button
                                  type="button"
                                  className="setlist-item-main"
                                  onClick={() => openSongFromSetListItem(item)}
                                >
                                  <span className="setlist-item-order">{index + 1}.</span>
                                  <span className="setlist-item-copy">
                                    <span className="setlist-item-title">{item.title}</span>
                                    <span className="setlist-item-artist">{item.artist}</span>
                                  </span>
                                </button>
                                <div className="setlist-item-actions">
                                  <button type="button" onClick={() => moveSetListItem(item.id, 'up')}>↑</button>
                                  <button type="button" onClick={() => moveSetListItem(item.id, 'down')}>↓</button>
                                  <button type="button" onClick={() => removeSetListItem(item.id)}>×</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {activeTab === 'addSong' && (
            <div className="song-picker repertoire-open">
              <div className="setlists-panel-header">
                <button type="button" className="setlist-create-btn" onClick={createSetList}>
                  + Nova set lista
                </button>
              </div>

              {setLists.length === 0 ? (
                <div className="setlists-empty">
                  Kreirajte prvu set listu klikom na dugme iznad.
                </div>
              ) : (
                <>
                  <div className="setlists-selector">
                    {setLists.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`setlist-chip ${entry.id === selectedSetListId ? 'active' : ''}`}
                        onClick={() => setSelectedSetListId(entry.id)}
                      >
                        {entry.name}
                      </button>
                    ))}
                  </div>

                  {selectedSetListId && (
                    <div className="repertoire-browser">
                      <div className="repertoire-browser-head">
                        <h3>REPERTOAR — dodaj pesmu</h3>
                        <span className="setlist-count-badge">U listi: {selectedSetList?.items.length || 0}</span>
                        <button type="button" className="setlist-delete-btn" onClick={deleteSelectedSetList}>
                          Obriši listu
                        </button>
                      </div>
                      <div className="repertoire-combo" ref={setlistSongComboRef}>
                        <button
                          type="button"
                          className={`repertoire-combo-toggle ${showSetlistSongDropdown ? 'open' : ''}`}
                          onClick={() => setShowSetlistSongDropdown((prev) => !prev)}
                          aria-expanded={showSetlistSongDropdown}
                          aria-label="Pretraži i dodaj pesmu u set listu"
                        >
                          <span>{songSearch ? `Pretraga: ${songSearch}` : 'Pretraži i dodaj pesmu'}</span>
                          <ChevronDown size={16} />
                        </button>

                        {showSetlistSongDropdown && (
                          <div className="repertoire-combo-panel">
                            <input
                              type="text"
                              placeholder="Pretraži pesmu ili izvođača..."
                              value={songSearch}
                              onChange={(e) => setSongSearch(e.target.value)}
                              className="song-search-input repertoire-search-input"
                            />
                            <div className="repertoire-dropdown-list">
                              {songLoading ? (
                                <div className="song-loading compact">Učitavanje repertoara...</div>
                              ) : filteredSongs.length === 0 ? (
                                <div className="repertoire-empty">{songSearch ? 'Nema rezultata' : 'Repertoar je prazan'}</div>
                              ) : (
                                filteredSongs.slice(0, 24).map((song) => {
                                  const inSetListCount = selectedSetListSongCountById[String(song.id)] || 0;
                                  const isAlreadyInSetList = inSetListCount > 0;
                                  return (
                                    <div key={song.id} className="repertoire-dropdown-item">
                                      <button
                                        type="button"
                                        className="repertoire-dropdown-main"
                                        title={isAlreadyInSetList ? 'Pesma je već u set listi' : 'Dodaj u set listu'}
                                        onClick={() => {
                                          addSongToSelectedSetList(song);
                                        }}
                                      >
                                        <span className="song-picker-title">{song.title}</span>
                                        <span className="song-picker-sep">—</span>
                                        <span className="song-picker-artist">{song.artist}</span>
                                        {isAlreadyInSetList ? (
                                          <span className="song-in-setlist-pill">Već dodato</span>
                                        ) : null}
                                      </button>
                                      <div className="repertoire-item-actions">
                                        <button
                                          type="button"
                                          className="song-open-lyrics-btn"
                                          title="Otvori tekst pesme"
                                          onClick={async () => {
                                            await handleSelectSong(song);
                                            setShowSetlistSongDropdown(false);
                                            setActiveTab('cheatsheet');
                                          }}
                                        >
                                          Tekst
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'cheatsheet' && (
            <div className={`cheatsheet-view ${selectedSong ? 'has-lyrics' : ''}`}>
              <div className="song-detail-view">
                {/* --- Navigator: set lists + search (collapses when lyrics open) --- */}
                <div className={`cheatsheet-nav ${selectedSong ? 'collapsed' : ''}`}>
                  <h2 className="detail-title">PODSETNIK — REPERTOAR</h2>

                  <div className="song-picker-combo" ref={songComboRef}>
                    <div className="song-search-inline">
                      <input
                        type="text"
                        placeholder="Pretraži pesmu ili izvođača..."
                        value={songSearch}
                        onChange={(e) => {
                          setSongSearch(e.target.value);
                          setShowSongDropdown(true);
                        }}
                        onFocus={() => setShowSongDropdown(true)}
                        className="song-search-input"
                      />
                      <button
                        type="button"
                        className="song-dropdown-toggle"
                        onClick={() => setShowSongDropdown((v) => !v)}
                        aria-label="Prikaži listu pesama"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {showSongDropdown && !songLoading && filteredSongs.length > 0 && (
                      <div className="song-dropdown-list">
                        {filteredSongs.map((song) => (
                          <button
                            key={song.id}
                            className="song-dropdown-item"
                            onClick={async () => {
                              await handleSelectSong(song);
                              setShowSongDropdown(false);
                            }}
                          >
                            <span className="song-dropdown-title">{song.title}</span>
                            <span className="song-dropdown-artist">{song.artist}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {songLoading ? (
                    <p className="detail-artist">Učitavanje repertoara...</p>
                  ) : filteredSongs.length === 0 ? (
                    <p className="detail-artist">
                      {songSearch ? 'Nema rezultata za pretragu.' : 'Repertoar je prazan.'}
                    </p>
                  ) : null}

                  {setLists.length > 0 && (
                    <div className="cheatsheet-setlists">
                      {setLists.map((entry) => (
                        <div key={entry.id} className="cheatsheet-setlist-block">
                          <button
                            type="button"
                            className={`cheatsheet-setlist-toggle ${expandedCheatsheetSetListId === entry.id ? 'expanded' : ''}`}
                            onClick={() =>
                              setExpandedCheatsheetSetListId((prev) =>
                                prev === entry.id ? '' : entry.id
                              )
                            }
                          >
                            <span>{entry.name}</span>
                            <ChevronDown
                              size={14}
                              className={`cheatsheet-chevron ${expandedCheatsheetSetListId === entry.id ? 'open' : ''}`}
                            />
                          </button>
                          {expandedCheatsheetSetListId === entry.id && (
                            <div className="cheatsheet-setlist-songs">
                              {entry.items.length === 0 ? (
                                <div className="cheatsheet-setlist-empty">Nema pesama u ovoj set listi</div>
                              ) : (
                                entry.items.map((item, idx) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`cheatsheet-song-item ${item.songId === selectedSong?.id ? 'active' : ''}`}
                                    onClick={() => openSongFromSetListItem(item)}
                                  >
                                    <span className="cheatsheet-song-num">{idx + 1}.</span>
                                    <span className="cheatsheet-song-title">{item.title}</span>
                                    <span className="cheatsheet-song-artist">{item.artist}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* --- Song header + lyrics (visible when song selected) --- */}
                {selectedSong && (
                  <div className="cheatsheet-lyrics-section">
                    <div className="cheatsheet-song-header">
                      <button
                        type="button"
                        className="cheatsheet-back-btn"
                        onClick={() => setSelectedSong(null)}
                      >
                        <ArrowLeft size={14} />
                        <span>Set liste</span>
                      </button>
                      <div className="cheatsheet-song-info">
                        <h3 className="cheatsheet-now-title">{selectedSong.title}</h3>
                        <span className="cheatsheet-now-artist">{selectedSong.artist}</span>
                        {selectedSong.key && <span className="key-badge">Tonalitet: {selectedSong.key}</span>}
                      </div>
                    </div>

                    <div className="lyrics-display" ref={lyricsRef} style={{ fontSize: `${fontScale}em` }}>
                      {selectedSong.lyrics ? (
                        renderLyrics(selectedSong.lyrics)
                      ) : (
                        <div className="no-lyrics-msg">
                          <Music size={40} />
                          <p>Tekst za selektovanu pesmu još nije dodat.</p>
                          <p className="hint">Kliknite ispod da odmah dodate tekst za ovu pesmu.</p>
                          {selectedSong.id && (
                            <button
                              type="button"
                              className="add-lyrics-btn"
                              onClick={() => router.push(`/bands/song/${selectedSong.id}`)}
                            >
                              Dodaj tekst
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Performance Metrics */}
        <aside className="hud-metrics">
          <div className="metric-box">
            <Clock size={16} />
            <div className="label">VREME NA BINI</div>
            <div className="value">02:45:12</div>
          </div>
          <div className="metric-box">
            <Radio size={16} />
            <div className="label">BR. ZAHTEVA</div>
            <div className="value">{activeCount}</div>
          </div>
          <div className="metric-box">
            <Volume2 size={16} />
            <div className="label">ZVUK</div>
            <div className="value value-sm">{settings.soundEnabled ? 'UKLJ.' : 'ISKLJ.'}</div>
          </div>
        </aside>
      </main>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>PODEŠAVANJA</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              {/* Venue Name */}
              <div className="setting-group">
                <label className="setting-label">NAZIV LOKALA</label>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.venueName}
                  onChange={e => updateSetting('venueName', e.target.value)}
                  placeholder='npr. Kafana "Druga kuća"'
                />
                <p className="setting-hint">Prikazuje se u zaglavlju tokom nastupa</p>
              </div>

              {/* Max Requests */}
              <div className="setting-group">
                <label className="setting-label">MAKS. BROJ ZAHTEVA</label>
                <div className="setting-range-row">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={settings.maxRequests}
                    onChange={e => handleMaxRequestsChange(e.target.value)}
                    className="setting-range"
                  />
                  <span className="range-value">{settings.maxRequests === 0 ? '∞' : settings.maxRequests}</span>
                </div>
                <p className="setting-hint">Ograničite koliko neprihvaćenih zahteva može čekati na prihvat (0 = bez limita)</p>
              </div>

              {/* Font Size */}
              <div className="setting-group">
                <label className="setting-label">
                  <Type size={14} /> VELIČINA TEKSTA
                </label>
                <div className="setting-range-row">
                  <input
                    type="range"
                    min="80"
                    max="150"
                    step="10"
                    value={settings.fontSize}
                    onChange={e => updateSetting('fontSize', parseInt(e.target.value))}
                    className="setting-range"
                  />
                  <span className="range-value">{settings.fontSize}%</span>
                </div>
                <p className="setting-hint">Povećajte tekst za bolju vidljivost na bini</p>
              </div>

              {/* Toggle: Show Tips */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">PRIKAŽI NAPOJNICE</label>
                    <p className="setting-hint">Sakrij/prikaži iznose napojnica na zahtevima</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.showTips ? 'on' : 'off'}`}
                    onClick={() => updateSetting('showTips', !settings.showTips)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Toggle: Sound */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">
                      {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} ZVUČNA OBAVEŠTENJA
                    </label>
                    <p className="setting-hint">Zvučni signal za nove zahteve gostiju</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.soundEnabled ? 'on' : 'off'}`}
                    onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Desktop notifications */}
              <div className="setting-group">
                <label className="setting-label">
                  <Bell size={14} /> DESKTOP NOTIFIKACIJE
                </label>
                <p className="setting-hint">
                  Iskačuće obaveštenje za svaku novu narudžbinu (drugi tab, telefon u džepu). Pregledač mora da dozvoli
                  notifikacije za ovaj sajt.
                </p>
                <button
                  type="button"
                  className="notif-permission-btn"
                  onClick={requestDesktopNotifications}
                  disabled={notifPermission === 'unsupported'}
                >
                  {notifPermission === 'granted'
                    ? 'Dozvoljeno ✓'
                    : notifPermission === 'denied'
                      ? 'Odbijeno — proveri podešavanja sajta'
                      : 'Dozvoli notifikacije'}
                </button>
              </div>

              {/* Toggle: Auto-Accept */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">
                      {settings.autoAccept ? <Zap size={14} /> : <ZapOff size={14} />} AUTO PRIHVATANJE
                    </label>
                    <p className="setting-hint">Automatski prihvati sve dolazeće zahteve</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.autoAccept ? 'on' : 'off'}`}
                    onClick={() => updateSetting('autoAccept', !settings.autoAccept)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Reset Session */}
              <div className="setting-group danger-zone">
                <label className="setting-label danger">OPASNA ZONA</label>
                <button className="reset-btn" onClick={resetSession}>
                  <RotateCcw size={16} />
                  Resetuj Sesiju
                </button>
                <p className="setting-hint">Briše sve zahteve i resetuje brojače</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .live-dashboard {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 100vw;
          height: 100%;
          max-height: 100dvh;
          background: #000;
          color: #eee;
          display: flex;
          flex-direction: column;
          font-family: 'JetBrains Mono', monospace;
          overflow: hidden;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .night-vision {
          color: #00ff00;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
        }
        .night-vision .hud-header,
        .night-vision .setlists-panel,
        .night-vision .setlist-song-search,
        .night-vision .repertoire-browser,
        .night-vision .active-setlist-strip,
        .night-vision .request-card,
        .night-vision .setlist-item-main,
        .night-vision .song-picker-item,
        .night-vision .song-search-box,
        .night-vision .song-search-inline,
        .night-vision .song-dropdown-toggle,
        .night-vision .song-dropdown-list,
        .night-vision .song-select,
        .night-vision .settings-panel,
        .night-vision .setting-group {
          border-color: rgba(0, 255, 0, 0.18);
        }
        .night-vision .setting-hint,
        .night-vision .setlist-help-text,
        .night-vision .setlist-item-artist,
        .night-vision .song-picker-artist,
        .night-vision .detail-artist,
        .night-vision .no-lyrics-msg,
        .night-vision .no-lyrics-msg .hint,
        .night-vision .song-dropdown-artist,
        .night-vision .nav-item,
        .night-vision .hud-content h2 {
          color: rgba(0, 255, 0, 0.62);
        }
        .night-vision .setting-label,
        .night-vision .settings-header h2,
        .night-vision .setlists-panel-header h3,
        .night-vision .active-setlist-name,
        .night-vision .song-picker-title,
        .night-vision .setlist-item-title,
        .night-vision .detail-title,
        .night-vision .song-dropdown-title,
        .night-vision .status-indicator,
        .night-vision .lyrics-display {
          color: #b7ffb7 !important;
        }

        .hud-header {
          min-height: 52px;
          height: auto;
          flex-shrink: 0;
          border-bottom: 1px solid #222;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 0.35rem 1rem;
          background: #0a0a0a;
          z-index: 10;
          position: relative;
          flex-wrap: nowrap;
        }

        .hud-pending-orbit {
          flex-shrink: 0;
          min-width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #3f1d1d;
          border: 3px solid #7f1d1d;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35), 0 4px 14px rgba(220, 38, 38, 0.25);
        }

        .hud-pending-orbit.has-pending {
          background: #dc2626;
          border-color: #fecaca;
          animation: pending-orbit-pulse 1.4s ease-in-out infinite;
        }

        @keyframes pending-orbit-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35), 0 4px 14px rgba(220, 38, 38, 0.35);
          }
          50% {
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35), 0 4px 22px rgba(220, 38, 38, 0.55);
          }
        }

        .hud-pending-orbit-num {
          font-size: 1.35rem;
          font-weight: 900;
          color: #fff;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .night-vision .hud-pending-orbit.has-pending {
          color: #0a0a0a;
          background: #ff3333;
          border-color: #00ff00;
          box-shadow: 0 0 12px rgba(255, 51, 51, 0.6);
        }

        .night-vision .hud-pending-orbit.has-pending .hud-pending-orbit-num {
          color: #000;
        }

        .night-vision .hud-pending-orbit:not(.has-pending) {
          border-color: #333;
        }

        .settings-overlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fade-in 0.18s ease;
        }
        .settings-panel {
          width: min(640px, 100%);
          max-height: min(84vh, 780px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #050505;
          border: 1px solid #1f2937;
          border-radius: 16px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
          animation: slide-up 0.2s ease;
        }
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.95rem 1rem;
          border-bottom: 1px solid #161616;
        }
        .settings-header h2 {
          margin: 0;
          font-size: 0.86rem;
          letter-spacing: 0.12em;
          color: #e5e7eb;
          font-weight: 800;
        }
        .close-btn {
          width: 38px;
          height: 38px;
          border: 1px solid #242424;
          border-radius: 10px;
          background: #0b0b0b;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .close-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .night-vision .close-btn {
          border-color: rgba(0, 255, 0, 0.18);
          color: #7dff7d;
        }
        .night-vision .close-btn:hover {
          border-color: #00ff00;
          color: #00ff00;
        }
        .settings-body {
          padding: 0.95rem 1rem 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .setting-group {
          padding: 0.85rem 0.9rem;
          border: 1px solid #151515;
          border-radius: 10px;
          background: #090909;
          box-shadow: none;
        }
        .setting-label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.55rem;
          color: #e5e7eb;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .setting-hint {
          margin: 0.45rem 0 0;
          color: #6b7280;
          font-size: 0.72rem;
          line-height: 1.55;
        }
        .setting-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #242424;
          border-radius: 10px;
          background: #0d0d0d;
          color: #f3f4f6;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .notif-permission-btn {
          margin-top: 0.75rem;
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #333;
          background: #111;
          color: #e5e7eb;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: border-color 0.2s, background 0.2s;
        }

        .notif-permission-btn:hover:not(:disabled) {
          border-color: #00ff00;
          background: #0f1a0f;
        }
        .night-vision .notif-permission-btn {
          border-color: rgba(0, 255, 0, 0.2);
          color: #8dff8d;
          background: rgba(0, 255, 0, 0.05);
        }

        .notif-permission-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #ff0000;
          border-radius: 50%;
          animation: pulse 1s infinite alternate;
        }

        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }

        .hud-left { display: flex; align-items: center; gap: 1.5rem; }
        .hud-controls { display: flex; gap: 1rem; }
        .hud-btn {
          background: #111;
          border: 1px solid #333;
          color: #cbd5e1;
          padding: 6px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.7rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .hud-btn.active {
          border-color: #00ff00;
          color: #00ff00;
        }
        .hud-btn:hover {
          border-color: #4b5563;
          color: #f3f4f6;
        }
        .night-vision .hud-btn {
          border-color: rgba(0, 255, 0, 0.18);
          color: #8dff8d;
          background: rgba(0, 255, 0, 0.03);
        }
        .night-vision .hud-btn:hover,
        .night-vision .hud-btn.active {
          border-color: #00ff00;
          color: #00ff00;
          background: rgba(0, 255, 0, 0.08);
        }

        .exit-btn {
          border-color: #ef4444;
          color: #ef4444;
          transition: all 0.2s ease;
        }
        .exit-btn:hover {
          background: #ef4444;
          color: #000;
          border-color: #ef4444;
        }
        .settings-active {
          background: #ef4444 !important;
          color: #000 !important;
          border-color: #ef4444 !important;
        }

        .hud-main {
          flex: 1;
          display: grid;
          grid-template-columns: 80px 1fr 240px;
          min-height: 0;
          min-width: 0;
          gap: 0;
        }

        .hud-side-nav {
          border-right: 1px solid #222;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 2rem;
          gap: 1.5rem;
          flex-shrink: 0;
        }

        .nav-item {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          position: relative;
          transition: color 0.15s ease, transform 0.12s ease;
          padding: 8px;
          border-radius: 10px;
          min-width: 44px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .nav-item.active { color: #00ff00; }
        .nav-item:hover { color: #f3f4f6; }
        .night-vision .nav-item:hover,
        .night-vision .nav-item.active {
          color: #00ff00;
        }
        .nav-item .nav-tooltip {
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: rgba(10, 10, 10, 0.95);
          color: #e5e7eb;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 40;
        }
        .nav-item .nav-tooltip::before {
          content: '';
          position: absolute;
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-right: 5px solid rgba(10, 10, 10, 0.95);
        }
        .nav-item:hover .nav-tooltip {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .nav-item .badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff0000;
          color: white;
          font-size: 0.6rem;
          padding: 2px 5px;
          border-radius: 10px;
        }

        .hud-content {
          padding: 1.35rem 1.4rem;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          scrollbar-width: thin;
          scrollbar-color: #2a2a2a #0a0a0a;
        }
        .hud-content::-webkit-scrollbar {
          width: 6px;
        }
        .hud-content::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .hud-content::-webkit-scrollbar-thumb {
          background: #2a2a2a;
          border-radius: 3px;
        }
        .hud-content::-webkit-scrollbar-thumb:hover {
          background: #3a3a3a;
        }

        .hud-content h2 {
          font-size: 0.8rem;
          color: #555;
          text-transform: uppercase;
          margin-bottom: 1.4rem;
          letter-spacing: 2px;
        }
        .requests-title.night-glow {
          color: #00ff00 !important;
          text-shadow: 0 0 7px rgba(0, 255, 0, 0.5), 0 0 16px rgba(0, 255, 0, 0.22);
        }

        .feed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .request-view-toggle {
          display: inline-flex;
          border: 1px solid #222;
          border-radius: 999px;
          padding: 3px;
          gap: 4px;
          margin-bottom: 1.25rem;
        }
        .mini-tab {
          border: none;
          background: transparent;
          color: #777;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
        }
        .mini-tab.active {
          background: #00ff0012;
          color: #00ff00;
        }

        .request-card {
          background: #080808;
          border: 1px solid #1a1a1a;
          padding: 1.25rem;
          border-radius: 12px;
        }

        .request-card.waiter-tip {
          border-color: #22c55e;
          background: linear-gradient(145deg, rgba(34, 197, 94, 0.18), rgba(16, 185, 129, 0.08));
          box-shadow: 0 0 28px rgba(34, 197, 94, 0.2);
        }

        .request-card.waiter-tip .song-title {
          color: #86efac;
        }

        .request-card.waiter-tip .tip {
          color: #fef08a;
        }

        .request-card.accepted {
          border-color: #00ff0022;
          background: #00ff0005;
        }
        .request-card.skipped {
          border-color: #47556966;
          background: #0f172a22;
        }
        .request-card.played {
          border-color: #22c55e55;
          background: #16a34a14;
        }

        .req-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          margin-bottom: 1rem;
        }

        .req-header-right {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tip-money-icon {
          color: #fef08a;
          flex-shrink: 0;
        }
        .night-vision .tip-money-icon {
          color: #facc15;
          filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.35));
        }

        .tip-amount {
          font-weight: 900;
          color: #86efac;
          font-size: 0.72rem;
          letter-spacing: 0.03em;
        }

        .tip { color: #ffd700; font-weight: 900; }

        .req-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .btn-hud {
          flex: 1;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.78rem;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, transform 0.1s;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .btn-hud:active {
          transform: scale(0.97);
        }

        .btn-hud.accept {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.3);
        }
        .btn-hud.accept:hover {
          background: rgba(16, 185, 129, 0.25);
        }
        .btn-hud.accept:active {
          background: rgba(16, 185, 129, 0.45);
          color: #fff;
          border-color: #34d399;
          transform: scale(0.95);
        }

        .btn-hud.skip {
          background: transparent;
          color: #64748b;
          border-color: #1e293b;
        }
        .btn-hud.skip:hover {
          background: rgba(100, 116, 139, 0.1);
          color: #94a3b8;
        }
        .btn-hud.skip:active {
          background: rgba(100, 116, 139, 0.25);
          color: #e2e8f0;
          border-color: #64748b;
          transform: scale(0.95);
        }

        .night-vision .btn-hud.accept {
          background: rgba(0, 255, 0, 0.1);
          color: #4ade80;
          border-color: rgba(0, 255, 0, 0.2);
          box-shadow: none;
        }
        .night-vision .btn-hud.accept:hover {
          background: rgba(0, 255, 0, 0.18);
        }
        .night-vision .btn-hud.accept:active {
          background: rgba(0, 255, 0, 0.35);
          color: #fff;
          border-color: #00ff00;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.25);
          transform: scale(0.95);
        }
        .night-vision .btn-hud.skip {
          border-color: rgba(0, 255, 0, 0.12);
          color: rgba(0, 255, 0, 0.4);
        }
        .night-vision .btn-hud.skip:hover {
          background: rgba(0, 255, 0, 0.06);
          color: rgba(0, 255, 0, 0.6);
        }
        .night-vision .btn-hud.skip:active {
          background: rgba(0, 255, 0, 0.15);
          color: #00ff00;
          border-color: rgba(0, 255, 0, 0.4);
          transform: scale(0.95);
        }

        .status-chip {
          display: inline-block;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: #1a1a1a;
          color: #666;
          border: 1px solid #333;
        }
        .night-vision .status-chip {
          background: rgba(0, 255, 0, 0.05);
          color: rgba(0, 255, 0, 0.4);
          border-color: rgba(0, 255, 0, 0.12);
        }

        .setting-input {
          outline: none;
          transition: border-color 0.2s ease;
        }
        .setting-input:focus {
          border-color: #00ff00;
        }
        .setting-input::placeholder {
          color: #333;
        }
        .night-vision .setting-input {
          border-color: rgba(0, 255, 0, 0.18);
          background: rgba(0, 255, 0, 0.03);
          color: #b7ffb7;
        }
        .night-vision .setting-input::placeholder {
          color: rgba(0, 255, 0, 0.35);
        }

        .setting-range-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .setting-range {
          flex: 1;
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #222;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .setting-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #00ff00;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }
        .setting-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #00ff00;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }

        .range-value {
          font-size: 0.85rem;
          font-weight: 800;
          color: #00ff00;
          min-width: 32px;
          text-align: right;
        }

        .setting-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .setting-toggle-row .setting-label {
          margin-bottom: 0;
        }
        .setting-toggle-row .setting-hint {
          margin-top: 0.25rem;
        }

        .toggle-btn {
          width: 48px;
          height: 26px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.3s ease;
          flex-shrink: 0;
        }
        .toggle-btn.on {
          background: #00ff00;
        }
        .toggle-btn.off {
          background: #333;
        }

        .toggle-knob {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #000;
          position: absolute;
          top: 3px;
          transition: left 0.3s ease;
        }
        .toggle-btn.on .toggle-knob {
          left: 25px;
        }
        .toggle-btn.off .toggle-knob {
          left: 3px;
        }

        .danger-zone {
          margin-top: 0.5rem;
        }

        .danger-zone .danger {
          color: #ef4444;
        }

        .reset-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .reset-btn:hover {
          background: #ef4444;
          color: #000;
          border-color: #ef4444;
        }

        /* ======= CHEATSHEET / SONG PICKER ======= */
        .cheatsheet-view {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .song-picker {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding-bottom: 0.5rem;
        }

        .repertoire-browser {
          min-height: 0;
          flex-shrink: 0;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          background: #050505;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin: 0;
        }
        .setlist-repertoire-stack {
          margin: 0.05rem 0 0.35rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        @media (min-width: 1280px) {
          .setlist-repertoire-stack {
            align-items: stretch;
          }
        }
        .repertoire-search-input {
          width: 100%;
          border: 1px solid #1f2937;
          border-radius: 8px;
          background: #0a0a0a;
          color: #eee;
          padding: 0.5rem 0.65rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.74rem;
          outline: none;
        }
        .repertoire-search-input:focus {
          border-color: #00ff00;
        }
        .repertoire-browser-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem 0.75rem;
          flex-wrap: wrap;
        }
        .repertoire-browser-head h3 {
          margin: 0;
          font-size: 0.84rem;
          letter-spacing: 0.08em;
          color: #9ca3af;
        }
        .repertoire-combo {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          z-index: 8;
        }
        .repertoire-combo-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.62rem 0.75rem;
          border: 1px solid #1f2937;
          border-radius: 10px;
          background: #0a0a0a;
          color: #d1d5db;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          font-weight: 700;
          text-align: left;
        }
        .repertoire-combo-toggle.open {
          border-color: #00ff00;
          color: #00ff00;
        }
        .repertoire-combo-toggle svg {
          flex-shrink: 0;
          transition: transform 0.18s ease;
        }
        .repertoire-combo-toggle.open svg {
          transform: rotate(180deg);
        }
        .repertoire-combo-panel {
          position: absolute;
          top: calc(100% + 0.45rem);
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.7rem;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          background: #050505;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
          z-index: 24;
        }
        .repertoire-dropdown-list {
          border: 1px solid #1f1f1f;
          border-radius: 10px;
          background: #0b0b0b;
          max-height: min(35dvh, 280px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .repertoire-dropdown-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.35rem;
          align-items: center;
          padding: 0.4rem 0.5rem;
          border-bottom: 1px solid #161616;
        }
        .repertoire-dropdown-item:last-child {
          border-bottom: none;
        }
        .repertoire-dropdown-main {
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
          font: inherit;
          cursor: pointer;
          padding: 0.35rem 0.5rem;
          border-radius: 8px;
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 0 0.5rem;
          min-width: 0;
        }
        .song-in-setlist-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-top: 0;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          border: 1px solid rgba(0, 255, 0, 0.35);
          background: rgba(0, 255, 0, 0.1);
          color: #7dff7d;
          font-size: 0.66rem;
          font-weight: 700;
        }
        .repertoire-dropdown-main:has(.song-in-setlist-pill) {
          border: 1px dashed rgba(125, 255, 125, 0.35);
        }
        .repertoire-item-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .song-open-lyrics-btn {
          width: auto;
          min-width: 52px;
          min-height: 32px;
          padding: 0.35rem 0.5rem;
          border: 1px solid #1f2937;
          background: #0a0a0a;
          color: #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .song-open-lyrics-btn:hover {
          border-color: #38bdf8;
          color: #38bdf8;
        }
        .repertoire-dropdown-main:hover {
          background: #121212;
        }
        .repertoire-empty {
          color: #6b7280;
          font-size: 0.75rem;
          padding: 0.9rem;
          text-align: center;
        }
        .setlist-editor {
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          background: #050505;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .setlists-panel-header,
        .setlist-editor-top,
        .active-setlist-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .song-picker .setlists-panel-header {
          margin: 0;
        }
        .setlists-panel-header h3,
        .active-setlist-name {
          margin: 0;
          font-size: 0.84rem;
          letter-spacing: 0.08em;
          color: #9ca3af;
        }
        .setlists-selector,
        .active-setlist-items {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .setlists-selector {
          padding-bottom: 0.15rem;
          max-height: 5.5rem;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .setlist-chip,
        .active-setlist-item,
        .setlist-create-btn,
        .setlist-delete-btn,
        .song-add-to-setlist,
        .active-setlist-nav button,
        .setlist-item-actions button {
          border: 1px solid #1f2937;
          background: #0a0a0a;
          color: #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          transition: all 0.15s ease;
        }
        .setlist-chip,
        .active-setlist-item {
          padding: 0.42rem 0.62rem;
          font-size: 0.7rem;
          white-space: nowrap;
        }
        .setlist-chip.active,
        .active-setlist-item.active {
          border-color: #00ff00;
          color: #00ff00;
          background: rgba(0, 255, 0, 0.15);
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.3), inset 0 0 6px rgba(0, 255, 0, 0.1);
          font-weight: 700;
        }
        .night-vision .setlist-chip,
        .night-vision .active-setlist-item,
        .night-vision .setlist-create-btn,
        .night-vision .setlist-delete-btn,
        .night-vision .song-add-to-setlist,
        .night-vision .active-setlist-nav button,
        .night-vision .setlist-item-actions button {
          border-color: rgba(0, 255, 0, 0.18);
          color: #8dff8d;
          background: rgba(0, 255, 0, 0.03);
        }
        .setlist-create-btn,
        .setlist-delete-btn,
        .song-add-to-setlist,
        .active-setlist-nav button {
          padding: 0.52rem 0.72rem;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .setlist-create-btn:hover,
        .setlist-delete-btn:hover,
        .song-add-to-setlist:hover:not(:disabled),
        .setlist-chip:hover,
        .active-setlist-item:hover,
        .active-setlist-nav button:hover:not(:disabled),
        .setlist-item-actions button:hover {
          border-color: #00ff00;
          color: #00ff00;
        }
        .setlist-create-btn:active,
        .setlist-delete-btn:active,
        .song-add-to-setlist:active:not(:disabled),
        .setlist-chip:active,
        .active-setlist-item:active,
        .active-setlist-nav button:active:not(:disabled),
        .setlist-item-actions button:active {
          background: rgba(0, 255, 0, 0.18);
          border-color: #00ff00;
          color: #fff;
          transform: scale(0.95);
        }
        .night-vision .setlist-create-btn:active,
        .night-vision .setlist-delete-btn:active,
        .night-vision .song-add-to-setlist:active:not(:disabled),
        .night-vision .setlist-chip:active,
        .night-vision .active-setlist-item:active,
        .night-vision .active-setlist-nav button:active:not(:disabled),
        .night-vision .setlist-item-actions button:active {
          background: rgba(0, 255, 0, 0.25);
          border-color: #00ff00;
          color: #00ff00;
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.2);
          transform: scale(0.95);
        }
        .song-add-to-setlist:disabled,
        .active-setlist-nav button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .setlists-empty {
          border: 1px dashed #1f2937;
          border-radius: 10px;
          padding: 1rem;
          color: #6b7280;
          font-size: 0.76rem;
          line-height: 1.55;
        }
        .setlists-empty.small {
          padding: 0.85rem;
          font-size: 0.72rem;
        }
        .setlist-name-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #1f2937;
          border-radius: 8px;
          background: #0a0a0a;
          color: #eee;
          padding: 0.65rem 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          outline: none;
        }
        .setlist-status-row {
          margin-top: -0.15rem;
          margin-bottom: 0.45rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          color: #9ca3af;
          font-size: 0.72rem;
        }
        .setlist-status-row strong {
          color: #e2e8f0;
        }
        .setlist-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          padding: 0.1rem 0.55rem;
          border-radius: 999px;
          border: 1px solid #1f2937;
          background: #0d0d0d;
          color: #cbd5e1;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .setlist-items {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          min-height: 0;
          max-height: min(60dvh, 520px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .setlist-item-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.5rem;
          align-items: stretch;
        }
        .setlist-item-row.just-added .setlist-item-main {
          border-color: rgba(0, 255, 0, 0.62);
          box-shadow: 0 0 0 1px rgba(0, 255, 0, 0.3) inset;
        }
        .setlist-item-main,
        .song-picker-open {
          width: 100%;
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
          font: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0;
        }
        .setlist-item-main {
          padding: 0.75rem 0.85rem;
          border: 1px solid #111827;
          border-radius: 10px;
          background: #080808;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }
        .setlist-item-main:hover {
          border-color: rgba(0, 255, 0, 0.3);
          background: #0c0c0c;
        }
        .setlist-item-main:active {
          border-color: #00ff00;
          background: rgba(0, 255, 0, 0.1);
          transform: scale(0.98);
        }
        .setlist-item-order {
          color: #00ff00;
          font-size: 0.72rem;
          min-width: 1.6rem;
        }
        .setlist-item-copy {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }
        .setlist-item-title {
          color: #e5e7eb;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .setlist-item-artist {
          color: #6b7280;
          font-size: 0.68rem;
        }
        .setlist-item-actions {
          display: flex;
          gap: 0.35rem;
        }
        .setlist-item-actions button {
          width: 34px;
          min-width: 34px;
          padding: 0;
        }
        .active-setlist-strip {
          width: 100%;
          margin-bottom: 0.9rem;
          padding: 0.85rem;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          background: #070707;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .cheatsheet-setlists {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.9rem;
          width: 100%;
        }
        .cheatsheet-setlist-block {
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          background: #070707;
          overflow: hidden;
        }
        .cheatsheet-setlist-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          background: transparent;
          border: none;
          color: #d1d5db;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .cheatsheet-setlist-toggle:hover {
          background: #0d0d0d;
          color: #fff;
        }
        .cheatsheet-setlist-toggle.expanded {
          color: #00ff00;
          border-bottom: 1px solid #1a1a1a;
        }
        .cheatsheet-setlist-toggle:active {
          background: rgba(0, 255, 0, 0.1);
          transform: scale(0.98);
        }
        .cheatsheet-chevron {
          transition: transform 0.2s ease;
          color: #555;
          flex-shrink: 0;
        }
        .cheatsheet-chevron.open {
          transform: rotate(180deg);
          color: #00ff00;
        }
        .cheatsheet-setlist-songs {
          display: flex;
          flex-direction: column;
        }
        .cheatsheet-setlist-empty {
          padding: 0.6rem 0.85rem;
          color: #555;
          font-size: 0.72rem;
        }
        .cheatsheet-song-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 0.85rem;
          background: transparent;
          border: none;
          border-top: 1px solid #111;
          color: #d1d5db;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .cheatsheet-song-item:first-child {
          border-top: none;
        }
        .cheatsheet-song-item:hover {
          background: #0c0c0c;
        }
        .cheatsheet-song-item:active {
          background: rgba(0, 255, 0, 0.1);
        }
        .cheatsheet-song-item.active {
          background: rgba(0, 255, 0, 0.08);
          color: #00ff00;
        }
        .cheatsheet-song-num {
          color: #00ff00;
          font-size: 0.68rem;
          min-width: 1.5rem;
          flex-shrink: 0;
        }
        .cheatsheet-song-title {
          font-weight: 700;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cheatsheet-song-artist {
          color: #6b7280;
          font-size: 0.68rem;
          flex-shrink: 0;
        }
        .night-vision .cheatsheet-setlist-block {
          border-color: rgba(0, 255, 0, 0.12);
        }
        .night-vision .cheatsheet-setlist-toggle {
          color: rgba(0, 255, 0, 0.6);
        }
        .night-vision .cheatsheet-setlist-toggle:hover {
          color: #00ff00;
          background: rgba(0, 255, 0, 0.04);
        }
        .night-vision .cheatsheet-setlist-toggle.expanded {
          color: #00ff00;
          border-bottom-color: rgba(0, 255, 0, 0.12);
        }
        .night-vision .cheatsheet-song-item {
          color: rgba(0, 255, 0, 0.6);
          border-top-color: rgba(0, 255, 0, 0.06);
        }
        .night-vision .cheatsheet-song-item:hover {
          background: rgba(0, 255, 0, 0.04);
          color: #00ff00;
        }
        .night-vision .cheatsheet-song-item.active {
          background: rgba(0, 255, 0, 0.1);
          color: #00ff00;
        }

        .song-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 0.75rem;
          color: #888;
        }
        .song-search-box-compact {
          width: 100%;
          max-width: 560px;
        }
        .song-picker-combo {
          width: 100%;
          max-width: 560px;
          margin-bottom: 0.9rem;
          position: relative;
        }
        .song-search-inline {
          display: flex;
          align-items: center;
          background: #101010;
          border: 1px solid #2c2c2c;
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .song-search-inline:focus-within {
          border-color: #3f3f46;
          box-shadow: 0 0 0 2px rgba(161, 161, 170, 0.18);
        }
        .song-search-inline .song-search-input {
          margin: 0;
          border: none;
          padding: 10px 12px;
        }
        .song-dropdown-toggle {
          width: 42px;
          height: 42px;
          border: none;
          border-left: 1px solid #2c2c2c;
          background: #0d0d0d;
          color: #cbd5e1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: color 0.2s ease, background 0.2s ease;
        }
        .song-dropdown-toggle:hover {
          color: #00ff00;
          background: #121212;
        }
        .night-vision .song-dropdown-toggle {
          color: #8dff8d;
          border-left-color: rgba(0, 255, 0, 0.18);
          background: rgba(0, 255, 0, 0.03);
        }
        .night-vision .song-search-inline {
          border-color: rgba(0, 255, 0, 0.2);
          background: rgba(0, 0, 0, 0.72);
        }
        .night-vision .song-search-inline:focus-within {
          border-color: rgba(0, 255, 0, 0.55);
          box-shadow: 0 0 0 2px rgba(0, 255, 0, 0.14);
        }
        .song-dropdown-list {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          max-height: 280px;
          overflow-y: auto;
          background: #0b0b0b;
          border: 1px solid #1f1f1f;
          border-radius: 8px;
          z-index: 35;
          box-shadow: 0 14px 26px rgba(0, 0, 0, 0.35);
          scrollbar-width: auto;
          scrollbar-color: #6a6a6a #151515;
        }
        .song-dropdown-list::-webkit-scrollbar {
          width: 15px;
        }
        .song-dropdown-list::-webkit-scrollbar-track {
          background: #151515;
          border-radius: 8px;
        }
        .song-dropdown-list::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 8px;
          border: 1px solid #202020;
        }
        .song-dropdown-list::-webkit-scrollbar-thumb:hover {
          background: #7a7a7a;
        }
        .song-dropdown-item {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          color: #d1d5db;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          cursor: pointer;
        }
        .song-dropdown-item:hover {
          background: #141414;
        }
        .song-dropdown-title {
          font-size: 0.84rem;
          font-weight: 700;
        }
        .song-dropdown-artist {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .song-picker-title {
          color: #f1f5f9;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .song-picker-sep {
          color: #4b5563;
          font-size: 0.68rem;
        }
        .song-picker-artist {
          color: #94a3b8;
          font-size: 0.72rem;
        }
        .song-search-input {
          flex: 1;
          background: none;
          border: none;
          color: #e2e8f0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          outline: none;
        }
        .song-search-input::placeholder { color: #94a3b8; }
        .night-vision .song-search-input {
          color: #b7ffb7;
        }
        .night-vision .song-search-input::placeholder {
          color: rgba(141, 255, 141, 0.62);
        }

        .song-loading {
          color: #444;
          font-size: 0.8rem;
          padding: 2rem;
          text-align: center;
        }
        .song-loading.compact {
          padding: 0.9rem;
          font-size: 0.74rem;
        }

        .song-picker-list {
          flex: 1;
          min-height: 0;
          max-height: calc(100vh - 320px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 2px;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .song-picker-list::-webkit-scrollbar {
          width: 15px;
        }
        .song-picker-list::-webkit-scrollbar-track {
          background: #151515;
          border-radius: 8px;
        }
        .song-picker-list::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 8px;
          border: 1px solid #202020;
        }
        .song-picker-list::-webkit-scrollbar-thumb:hover {
          background: #7a7a7a;
        }

        .song-picker-item {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.65rem;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          padding: 0.8rem;
          background: #090909;
          color: #ccc;
          font-family: 'JetBrains Mono', monospace;
        }
        .song-picker-item:hover {
          background: #111;
          border-color: #333;
        }
        .song-picker-item.has-lyrics {
          border-left: 3px solid #00ff00;
        }
        .night-vision .song-picker-item.has-lyrics {
          box-shadow: inset 0 0 0 1px rgba(0, 255, 0, 0.08);
        }

        .song-picker-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .song-picker-title {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .song-picker-artist {
          font-size: 0.7rem;
          color: #555;
        }

        .song-picker-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .genre-tag {
          font-size: 0.6rem;
          color: #444;
          padding: 2px 8px;
          background: #111;
          border-radius: 4px;
          font-weight: 600;
        }
        .lyrics-tag {
          font-size: 0.55rem;
          color: #00ff00;
          padding: 2px 8px;
          background: rgba(0, 255, 0, 0.08);
          border: 1px solid rgba(0, 255, 0, 0.2);
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .no-lyrics-tag {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .night-vision .lyrics-tag {
          color: #0b0b0b;
          background: #00ff00;
          border-color: #00ff00;
          text-shadow: none;
        }
        .night-vision .no-lyrics-tag {
          color: rgba(0, 255, 0, 0.45);
        }

        /* Song Detail / Lyrics View */
        .song-detail-view {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .back-to-list {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #555;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          margin-bottom: 1.5rem;
          padding: 0;
          transition: color 0.2s;
        }
        .back-to-list:hover { color: #00ff00; }

        .cheatsheet-nav {
          padding-bottom: 1rem;
          border-bottom: 1px solid #1a1a1a;
          margin-bottom: 0.75rem;
        }
        .cheatsheet-nav.collapsed {
          display: none;
        }
        .cheatsheet-lyrics-section {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .cheatsheet-song-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 0.65rem;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #1a1a1a;
          flex-shrink: 0;
        }
        .cheatsheet-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(0, 255, 0, 0.08);
          border: 1px solid rgba(0, 255, 0, 0.25);
          border-radius: 6px;
          color: #4ade80;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.4rem 0.65rem;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }
        .cheatsheet-back-btn:hover {
          color: #00ff00;
          background: rgba(0, 255, 0, 0.15);
          border-color: rgba(0, 255, 0, 0.45);
        }
        .cheatsheet-back-btn:active {
          background: rgba(0, 255, 0, 0.22);
          transform: scale(0.95);
        }
        .cheatsheet-song-info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          min-width: 0;
        }
        .cheatsheet-now-title {
          font-size: 1rem;
          font-weight: 900;
          color: #eee;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cheatsheet-now-artist {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
        }
        .night-vision .cheatsheet-back-btn {
          border-color: rgba(0, 255, 0, 0.15);
          color: rgba(0, 255, 0, 0.5);
        }
        .night-vision .cheatsheet-back-btn:hover {
          color: #00ff00;
          border-color: rgba(0, 255, 0, 0.4);
        }
        .night-vision .cheatsheet-song-header {
          border-bottom-color: rgba(0, 255, 0, 0.1);
        }
        .night-vision .cheatsheet-now-title {
          color: #b7ffb7;
        }
        .night-vision .cheatsheet-now-artist {
          color: rgba(0, 255, 0, 0.45);
        }
        .song-detail-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #1a1a1a;
        }
        .detail-title {
          font-size: 1.4rem !important;
          font-weight: 900 !important;
          color: #eee !important;
          text-transform: none !important;
          letter-spacing: -0.5px !important;
          margin-bottom: 0.5rem !important;
        }
        .detail-artist {
          font-size: 0.85rem;
          color: #555;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .song-select {
          width: 100%;
          max-width: 560px;
          margin-bottom: 0.9rem;
          background: #111;
          border: 1px solid #222;
          color: #eee;
          padding: 10px 12px;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          outline: none;
        }
        .song-select:focus {
          border-color: #00ff00;
        }
        .key-badge {
          font-size: 0.65rem;
          color: #00ff00;
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.15);
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .lyrics-display {
          flex: 1;
          overflow-y: auto;
          max-height: calc(100vh - 260px);
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          line-height: 2;
          font-family: 'Outfit', 'JetBrains Mono', monospace;
          font-size: 1.1rem;
          color: #ccc;
          white-space: pre-wrap;
          padding-right: 0.35rem;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .lyrics-display::-webkit-scrollbar {
          width: 15px;
        }
        .lyrics-display::-webkit-scrollbar-track {
          background: #151515;
          border-radius: 8px;
        }
        .lyrics-display::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 8px;
          border: 1px solid #202020;
        }
        .lyrics-display::-webkit-scrollbar-thumb:hover {
          background: #7a7a7a;
        }
        .lyrics-line {
          margin-bottom: 2px;
          min-height: 1.55em;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chord-inline {
          color: #00ff00;
          font-weight: 900;
          margin: 0 2px;
          font-size: 0.85em;
          text-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
        }
        .empty-line {
          display: inline-block;
          width: 100%;
          min-height: 1.2em;
        }

        .no-lyrics-msg {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: #333;
          text-align: center;
        }
        .no-lyrics-msg .hint {
          font-size: 0.7rem;
          color: #444;
        }
        .add-lyrics-btn {
          margin-top: 0.8rem;
          border: 1px solid rgba(0, 255, 0, 0.35);
          background: rgba(0, 255, 0, 0.08);
          color: #00ff00;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .add-lyrics-btn:hover {
          background: rgba(0, 255, 0, 0.16);
          border-color: rgba(0, 255, 0, 0.6);
        }

        @media (max-width: 1024px) {
          .feed-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
        }

        /* Tablet: uži sidebar, bez metrika */
        @media (max-width: 900px) {
          .hud-main {
            grid-template-columns: 64px 1fr;
          }
          .hud-metrics {
            display: none;
          }
          .hud-side-nav {
            padding-top: 1rem;
            gap: 1rem;
          }
          .setlist-items {
            max-height: min(50dvh, 400px);
          }
        }

        /* Telefon: sadržaj punu širinu, tabovi DOLE palcu */
        @media (max-width: 720px) {
          .hud-header {
            padding: 0.4rem 0.65rem;
            gap: 0.4rem;
            flex-wrap: wrap;
          }
          .hud-left {
            gap: 0.5rem;
            flex: 1;
            min-width: 0;
          }
          .hud-controls {
            gap: 0.35rem;
            flex-shrink: 0;
          }
          .hud-btn {
            padding: 8px 10px;
            min-height: 44px;
            min-width: 44px;
            font-size: 0.62rem;
          }
          .hud-btn span {
            display: none;
          }
          .status-indicator {
            font-size: 0.62rem;
            min-width: 0;
          }
          .status-indicator span {
            max-width: min(42vw, 9rem);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .hud-pending-orbit {
            min-width: 42px;
            height: 42px;
            border-width: 2px;
          }
          .hud-pending-orbit-num {
            font-size: 1rem;
          }
          .hud-main {
            display: flex;
            flex-direction: column;
            grid-template-columns: unset;
            min-height: 0;
          }
          .hud-content {
            order: 1;
            flex: 1;
            min-height: 0;
            padding: 0.65rem 0.75rem 0.5rem;
          }
          .hud-side-nav {
            order: 2;
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            width: 100%;
            padding: 0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom, 0px));
            border-right: none;
            border-top: 1px solid #222;
            gap: 0;
            flex-shrink: 0;
          }
          .nav-item {
            flex: 1;
            max-width: 120px;
          }
          .nav-item .nav-tooltip {
            display: none;
          }
          .settings-overlay {
            backdrop-filter: none;
            background: rgba(0, 0, 0, 0.88);
          }
          .settings-panel {
            width: 100vw;
            max-width: 100vw;
            max-height: 100dvh;
            border-radius: 0;
            animation: none;
          }
          .settings-body {
            padding: 0.8rem 0.75rem calc(0.9rem + env(safe-area-inset-bottom, 0px));
          }
          .setting-group {
            padding: 0.75rem;
          }
          .setting-toggle-row {
            align-items: flex-start;
          }
          .feed-grid {
            grid-template-columns: 1fr;
            gap: 0.65rem;
          }
          .request-card {
            padding: 0.85rem;
          }
          .request-card.waiter-tip {
            box-shadow: none;
          }
          .req-actions {
            gap: 0.4rem;
            margin-top: 0.75rem;
          }
          .btn-hud {
            padding: 0.6rem 0.5rem;
            font-size: 0.72rem;
            min-height: 40px;
          }
          .status-chip {
            font-size: 0.65rem;
            padding: 0.3rem 0.6rem;
          }
          .song-title {
            font-size: 1.15rem;
          }
          .hud-content h2 {
            margin-bottom: 0.55rem;
            letter-spacing: 0.12em;
          }
          .song-picker-list {
            max-height: calc(100dvh - 220px);
          }
          .setlists-panel,
          .setlist-song-search,
          .repertoire-browser {
            padding: 0.75rem;
          }
          .setlists-panel-header,
          .setlist-editor-top,
          .active-setlist-head {
            flex-direction: column;
            align-items: stretch;
          }
          .song-picker .setlists-panel-header {
            flex-direction: row;
            align-items: center;
            flex-wrap: wrap;
          }
          .setlist-create-btn,
          .setlist-delete-btn,
          .song-add-to-setlist,
          .active-setlist-nav button {
            width: 100%;
            justify-content: center;
          }
          .song-picker .setlist-create-btn {
            width: auto;
            flex: 1;
            min-height: 42px;
          }
          .song-picker .setlists-selector {
            flex-wrap: nowrap;
            gap: 0.4rem;
            padding-bottom: 0.15rem;
            margin-bottom: 0.05rem;
          }
          .song-picker .setlist-chip {
            white-space: nowrap;
            flex: 0 0 auto;
            min-height: 38px;
            padding: 0.5rem 0.72rem;
          }
          .active-setlist-nav {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            width: 100%;
          }
          .setlist-item-row {
            grid-template-columns: 1fr;
            gap: 0.45rem;
          }
          .setlist-item-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.4rem;
          }
          .setlist-item-actions button {
            width: 100%;
            min-width: 0;
            min-height: 40px;
          }
          .setlist-items {
            max-height: min(55dvh, 420px);
          }
          .song-picker.repertoire-open .setlist-items {
            max-height: min(50dvh, 380px);
          }
          .setlist-song-search,
          .repertoire-browser {
            max-height: 38dvh;
          }
          .repertoire-combo-panel {
            position: static;
            padding: 0.55rem;
            border-radius: 8px;
            box-shadow: none;
          }
          .repertoire-combo-toggle {
            min-height: 44px;
            padding: 0.72rem 0.78rem;
            font-size: 0.78rem;
          }
          .repertoire-dropdown-list {
            max-height: min(46dvh, 320px);
          }
          .repertoire-dropdown-item {
            grid-template-columns: 1fr;
            padding: 0.5rem;
          }
          .repertoire-dropdown-main {
            padding: 0.5rem 0.45rem;
            gap: 0.18rem 0.45rem;
          }
          .repertoire-item-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .song-open-lyrics-btn {
            width: 100%;
            min-height: 40px;
          }
          .song-picker.repertoire-open .setlist-song-search {
            flex: 0 0 auto;
          }
          .song-picker.repertoire-open .repertoire-browser {
            flex: 0 0 auto;
            min-height: 0;
            max-height: none;
          }
          .song-picker.repertoire-open .setlist-items {
            max-height: min(50dvh, 380px);
          }
          .song-picker {
            gap: 0.4rem;
            padding-bottom: 0.35rem;
          }
          .setlist-name-input {
            min-height: 42px;
            font-size: 0.82rem;
          }
          .setlist-status-row {
            margin-top: 0;
            margin-bottom: 0.3rem;
            gap: 0.15rem;
          }
          .setlist-item-main {
            padding: 0.78rem 0.78rem;
          }
          .setlist-item-copy {
            gap: 0.15rem;
          }
          .song-picker-item {
            padding: 0.7rem;
          }
          .lyrics-display {
            font-size: 0.95rem;
            line-height: 1.75;
            max-height: calc(100dvh - 200px);
          }
          .cheatsheet-view.has-lyrics .cheatsheet-nav {
            display: none;
          }
          .cheatsheet-lyrics-section {
            flex: 1;
          }
          .cheatsheet-song-header {
            flex-wrap: wrap;
            gap: 0.4rem;
            padding-bottom: 0.5rem;
            margin-bottom: 0.4rem;
          }
          .cheatsheet-now-title {
            font-size: 0.9rem;
          }
          .cheatsheet-setlist-toggle {
            padding: 0.55rem 0.7rem;
            font-size: 0.72rem;
          }
          .cheatsheet-song-item {
            padding: 0.5rem 0.7rem;
            font-size: 0.72rem;
          }
          .detail-title {
            font-size: 1.2rem !important;
          }
          .night-vision {
            text-shadow: 0 0 3px rgba(0, 255, 0, 0.35);
          }
          .chord-inline {
            text-shadow: none;
          }
          .song-picker-combo,
          .song-select,
          .song-search-box-compact {
            max-width: 100%;
          }
        }

        @media (max-width: 560px) {
          .setlist-song-search {
            padding: 0.5rem;
          }
          .setlist-song-search .song-search-inline .song-search-input {
            font-size: 0.8rem;
            padding: 0.62rem 0.72rem;
          }
          .setlist-song-search .song-dropdown-toggle {
            width: 40px;
            height: 40px;
          }
          .repertoire-dropdown-item {
            grid-template-columns: 1fr;
            gap: 0.4rem;
          }
          .repertoire-item-actions {
            width: 100%;
            display: flex;
          }
          .repertoire-dropdown-item .song-open-lyrics-btn {
            width: 100%;
            min-width: 0;
          }
          .setlist-status-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pulse-dot,
          .hud-pending-orbit.has-pending {
            animation: none !important;
          }
          .settings-overlay {
            animation: none;
          }
          .settings-panel {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
