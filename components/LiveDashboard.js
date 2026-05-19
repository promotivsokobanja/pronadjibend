'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, ListMusic, Eye, EyeOff, MessageSquare, Music, Clock, Settings, ArrowLeft, X, Volume2, VolumeX, Zap, ZapOff, Type, RotateCcw, ChevronDown, Bell, Banknote, PlusCircle, HelpCircle, Play, Pause, Edit2, Check, QrCode, Coffee, Smartphone, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const QrModal = dynamic(() => import('./QrModal'), { ssr: false });

export default function LiveDashboard({ bandId, musicianId }) {
  const ownerId = bandId || musicianId;
  const ownerType = bandId ? 'band' : 'musician';
  const router = useRouter();
  const [isNightMode, setIsNightMode] = useState(true);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionStartRef = useRef((() => {
    if (typeof window === 'undefined') return Date.now();
    const key = `pb-live-session-start:${bandId || musicianId}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const ts = Number(saved);
      if (Number.isFinite(ts) && ts > 0) return ts;
    }
    const now = Date.now();
    sessionStorage.setItem(key, String(now));
    return now;
  })());
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQr, setShowQr] = useState(false);
  // Break mode
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const breakStartRef = useRef(null);
  // Wake Lock
  const wakeLockRef = useRef(null);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  // Setlist played progress (songId set)
  const [playedSongIds, setPlayedSongIds] = useState(new Set());
  // Guard: prevent rapid prev/next clicks from racing
  const navBusyRef = useRef(false);
  const [navPosition, setNavPosition] = useState(-1);
  const [requests, setRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestLoadError, setRequestLoadError] = useState('');
  const [requestActionError, setRequestActionError] = useState('');
  const [requestActionLoadingId, setRequestActionLoadingId] = useState('');
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
  const [repertoireCategoryFilter, setRepertoireCategoryFilter] = useState('Sve');
  const REPERTOIRE_CATEGORIES = ['Sve', 'Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Razno', 'Strane Muške', 'Strane Ženske'];
  const [cheatsheetSearch, setCheatsheetSearch] = useState('');
  // Global pesmarica search in cheatsheet
  const [globalResults, setGlobalResults] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const globalSearchTimerRef = useRef(null);
  const [addingSongId, setAddingSongId] = useState('');
  const [addedToRepToast, setAddedToRepToast] = useState('');
  // Cheatsheet per-song controls (transpose / edit / auto-scroll)
  const [liveKeyOffset, setLiveKeyOffset] = useState(0);
  const [liveIsEditing, setLiveIsEditing] = useState(false);
  const [liveEditContent, setLiveEditContent] = useState('');
  const [liveIsScrolling, setLiveIsScrolling] = useState(false);
  const [liveScrollSpeed, setLiveScrollSpeed] = useState(1);
  const [liveSaving, setLiveSaving] = useState(false);
  const lyricsRef = useRef(null);
  const songComboRef = useRef(null);
  const setlistSongComboRef = useRef(null);
  const hasLoadedRequestsRef = useRef(false);
  const knownRequestIdsRef = useRef(new Set());
  const autoAcceptedRequestIdsRef = useRef(new Set());

  // Set list state — loaded from API
  const [setLists, setSetLists] = useState([]);
  const [selectedSetListId, setSelectedSetListId] = useState('');
  const [setListNameDraft, setSetListNameDraft] = useState('');
  const [renamingChipId, setRenamingChipId] = useState('');
  const [chipNameDraft, setChipNameDraft] = useState('');
  const [setListsLoading, setSetListsLoading] = useState(false);
  const [songNavSetListId, setSongNavSetListId] = useState('');
  const setListsRef = useRef(setLists);

  useEffect(() => {
    setListsRef.current = setLists;
  }, [setLists]);

  /** Normalize API setlist into local shape */
  function normalizeSetList(entry) {
    const seen = new Set();
    const dedupedItems = (entry.items || []).reduce((acc, item) => {
      const sid = item.song?.id || item.songId;
      if (seen.has(sid)) return acc;
      seen.add(sid);
      acc.push({
        id: item.id,
        songId: sid,
        title: item.song?.title || item.title || '',
        artist: item.song?.artist || item.artist || '',
      });
      return acc;
    }, []);
    return {
      id: entry.id,
      name: entry.name || 'Set lista',
      isLive: Boolean(entry.isLive),
      items: dedupedItems,
    };
  }

  /** Load setlists from API */
  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    const load = async () => {
      setSetListsLoading(true);
      try {
        const param = bandId ? `bandId=${bandId}` : `musicianId=${musicianId}`;
        const resp = await fetch(`/api/setlists?${param}`, { cache: 'no-store' });
        const data = await resp.json();
        if (cancelled) return;
        const lists = Array.isArray(data) ? data.map(normalizeSetList) : [];
        setSetLists(lists);
        setSelectedSetListId((prev) => prev || lists[0]?.id || '');
      } catch (err) {
        console.error('Error loading setlists:', err);
      } finally {
        if (!cancelled) setSetListsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [ownerId, bandId, musicianId]);

  // Settings state
  const LS_SETTINGS_KEY = 'pb-live-settings';
  const [settings, setSettings] = useState(() => {
    const defaults = {
      venueName: 'Kafana "Druga kuća"',
      maxRequests: 10,
      showTips: true,
      soundEnabled: true,
      autoAccept: false,
      allowGuestTips: true,
      allowFullRepertoireLive: false,
      fontSize: 100,
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || '{}');
      return {
        ...defaults,
        venueName: typeof saved.venueName === 'string' ? saved.venueName : defaults.venueName,
        showTips: typeof saved.showTips === 'boolean' ? saved.showTips : defaults.showTips,
        soundEnabled: typeof saved.soundEnabled === 'boolean' ? saved.soundEnabled : defaults.soundEnabled,
        autoAccept: typeof saved.autoAccept === 'boolean' ? saved.autoAccept : defaults.autoAccept,
        fontSize: typeof saved.fontSize === 'number' ? saved.fontSize : defaults.fontSize,
      };
    } catch { return defaults; }
  });
  const [notifPermission, setNotifPermission] = useState('default');
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const normalizeMaxRequests = useCallback((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 10;
    const normalized = Math.floor(parsed);
    if (normalized < 0) return 0;
    if (normalized > 50) return 50;
    return normalized;
  }, []);

  const saveSharedLiveSettings = useCallback(async (patch) => {
    if (!ownerId || !patch || typeof patch !== 'object') return null;
    const url = bandId
      ? `/api/bands/${encodeURIComponent(bandId)}/live-settings`
      : `/api/musicians/${encodeURIComponent(musicianId)}/live-settings`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Greška pri čuvanju live podešavanja.');
      }
      return response.json();
    } catch (err) {
      console.error('Error saving shared live settings:', err);
      return null;
    }
  }, [ownerId, bandId, musicianId]);

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        const { maxRequests, ...toSave } = next;
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(toSave));
      } catch { /* ignore storage errors */ }
      return next;
    });
  };

  const maxRequestsSaveTimerRef = useRef(null);

  const handleMaxRequestsChange = (rawValue) => {
    const nextValue = normalizeMaxRequests(rawValue);
    updateSetting('maxRequests', nextValue);
    if (!bandId) return; // settings save only for bands
    if (maxRequestsSaveTimerRef.current) {
      clearTimeout(maxRequestsSaveTimerRef.current);
    }
    maxRequestsSaveTimerRef.current = setTimeout(() => {
      saveSharedLiveSettings({ maxPendingRequests: nextValue });
      maxRequestsSaveTimerRef.current = null;
    }, 220);
  };

  const handleSharedToggleChange = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    const patch = key === 'allowGuestTips'
      ? { allowTips: value }
      : key === 'allowFullRepertoireLive'
        ? { allowFullRepertoireLive: value }
        : null;

    if (!patch || !ownerId) return;

    const saved = await saveSharedLiveSettings(patch);
    if (!saved) {
      setSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const resetSession = async () => {
    setRequestActionError('');
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
      // Reset session timer
      const key = `pb-live-session-start:${ownerId}`;
      const now = Date.now();
      sessionStorage.setItem(key, String(now));
      sessionStartRef.current = now;
      setSessionElapsed(0);
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
    if (!ownerId) return;
    let cancelled = false;

    const loadLiveSettings = async () => {
      try {
        const url = bandId
          ? `/api/bands/${encodeURIComponent(bandId)}/live-settings`
          : `/api/musicians/${encodeURIComponent(musicianId)}/live-settings`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setSettings((prev) => ({
          ...prev,
          maxRequests: normalizeMaxRequests(data?.maxPendingRequests ?? prev.maxRequests),
          allowGuestTips: typeof data?.allowTips === 'boolean' ? data.allowTips : prev.allowGuestTips,
          allowFullRepertoireLive: typeof data?.allowFullRepertoireLive === 'boolean' ? data.allowFullRepertoireLive : prev.allowFullRepertoireLive,
        }));
      } catch (err) {
        console.error('Error loading live settings:', err);
      }
    };

    loadLiveSettings();

    return () => {
      cancelled = true;
    };
  }, [ownerId, bandId, musicianId, normalizeMaxRequests]);

  useEffect(() => {
    return () => {
      if (maxRequestsSaveTimerRef.current) {
        clearTimeout(maxRequestsSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const formatElapsed = (totalSec) => {
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ── Wake Lock: keep screen on during performance ──
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsWakeLocked(true);
      wakeLockRef.current.addEventListener('release', () => setIsWakeLocked(false));
    } catch { /* ignore — user denied or unsupported */ }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try { await wakeLockRef.current?.release(); } catch { /* ignore */ }
    wakeLockRef.current = null;
    setIsWakeLocked(false);
  }, []);

  useEffect(() => {
    requestWakeLock();
    const onVisChange = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // ── Break mode timer ──
  const toggleBreak = useCallback(() => {
    setIsOnBreak((prev) => {
      if (!prev) {
        breakStartRef.current = Date.now();
        setBreakElapsed(0);
        return true;
      }
      breakStartRef.current = null;
      return false;
    });
  }, []);

  useEffect(() => {
    if (!isOnBreak) return;
    const tick = setInterval(() => {
      if (breakStartRef.current) {
        setBreakElapsed(Math.floor((Date.now() - breakStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isOnBreak]);

  // ── Total tips from session ──
  const totalTipsRsd = requests.reduce((sum, r) => sum + (Number(r.tipAmountRsd) || 0), 0);

  // ── Setlist progress: toggle song as played ──
  const toggleSongPlayed = useCallback((songId) => {
    if (!songId) return;
    setPlayedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, bandId, musicianId]);

  useEffect(() => {
    if (!ownerId) {
      setRequests([]);
      setRequestsLoading(false);
      setRequestLoadError('');
      return;
    }

    let cancelled = false;

    const loadRequests = async () => {
      if (!hasLoadedRequestsRef.current && !cancelled) {
        setRequestsLoading(true);
      }
      try {
        if (!cancelled) {
          setRequestLoadError('');
        }
        const params = new URLSearchParams();
        if (bandId) params.set('bandId', bandId);
        else if (musicianId) params.set('musicianId', musicianId);
        params.set('statusFilter', 'active');

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

          if (settings.autoAccept) {
            const toAutoAccept = list.filter(
              (req) => req.status === 'pending' && !autoAcceptedRequestIdsRef.current.has(req.id)
            );
            toAutoAccept.forEach((req) => {
              autoAcceptedRequestIdsRef.current.add(req.id);
              updateRequestStatus(req.id, 'ACCEPTED').catch((err) => {
                autoAcceptedRequestIdsRef.current.delete(req.id);
                setRequestActionError(err?.message || 'Auto-prihvatanje zahteva nije uspelo.');
              });
            });
          } else {
            autoAcceptedRequestIdsRef.current = new Set();
          }

          const normalized = settings.autoAccept
            ? list.map((req) =>
                req.status === 'pending'
                  ? { ...req, status: 'accepted' }
                  : req
              )
            : list;

          setRequests(normalized);
          setRequestsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          // Only show error and clear on first load; keep existing data on transient failures
          if (!hasLoadedRequestsRef.current) {
            setRequests([]);
            setRequestLoadError('Zahtevi trenutno nisu dostupni. Proverite vezu i pokušajte ponovo.');
          }
          setRequestsLoading(false);
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

  /** Sync a single setlist to the API (with 1 retry for offline resilience) */
  const syncSetListToApi = useCallback(async (setListId, patchBody) => {
    const doFetch = () => fetch(`/api/setlists/${encodeURIComponent(setListId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody),
    });
    try {
      const resp = await doFetch();
      if (!resp.ok) throw new Error('sync failed');
    } catch (err) {
      // Retry once after 2s
      try {
        await new Promise((r) => setTimeout(r, 2000));
        await doFetch();
      } catch {
        console.error('Error syncing setlist (after retry):', err);
      }
    }
  }, []);

  const updateSetLists = useCallback((updater) => {
    setSetLists((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  /** Toggle isLive for a setlist */
  const toggleSetListLive = useCallback(async (setListId) => {
    const entry = setListsRef.current.find((e) => e.id === setListId);
    const nextIsLive = entry ? !entry.isLive : true;
    setSetLists((prev) =>
      prev.map((e) =>
        e.id === setListId ? { ...e, isLive: nextIsLive } : e
      )
    );
    await syncSetListToApi(setListId, { isLive: nextIsLive });
  }, [syncSetListToApi]);

  const hasAnyLiveSetList = setLists.some((entry) => entry.isLive);

  const selectedSetList = setLists.find((entry) => entry.id === selectedSetListId) || null;
  const navSetList = setLists.find((entry) => entry.id === songNavSetListId) || null;
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

  const handleSelectSong = useCallback(async (song) => {
    if (song.lyrics) {
      setSelectedSong(song);
      return;
    }
    try {
      const resp = await fetch(`/api/songs/${song.id}`);
      if (!resp.ok) {
        setSelectedSong(song);
        return;
      }
      const data = await resp.json();
      setSelectedSong(data);
      // Update cache
      setAllSongs((prev) =>
        Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : []
      );
    } catch (err) {
      setSelectedSong(song);
    }
  }, []);

  const openSongFromSetListItem = useCallback(async (item, setListId, itemIndex) => {
    const matchedSong = allSongs.find((song) => song.id === item.songId);
    const fallbackSong = matchedSong || {
      id: item.songId,
      title: item.title,
      artist: item.artist,
      lyrics: null,
    };
    const listId = setListId || selectedSetListId;
    setSongNavSetListId(listId);
    // Set position for correct navigation (handles duplicates)
    if (typeof itemIndex === 'number') {
      setNavPosition(itemIndex);
    } else {
      const list = setListsRef.current.find((e) => e.id === listId);
      setNavPosition(list?.items.findIndex((i) => i.songId === item.songId) ?? -1);
    }
    await handleSelectSong(fallbackSong);
    setActiveTab('cheatsheet');
  }, [allSongs, selectedSetListId]);

  const createSetList = useCallback(async () => {
    const tempName = `Set lista ${setLists.length + 1}`;
    try {
      const resp = await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška');
      const normalized = normalizeSetList(data);
      updateSetLists((prev) => [...prev, normalized]);
      setSelectedSetListId(normalized.id);
      setShowRepertoireBrowser(true);
      setShowSetlistSongDropdown(true);
    } catch (err) {
      console.error('Error creating setlist:', err);
    }
  }, [setLists.length, updateSetLists]);

  const renameSelectedSetList = useCallback((nextName) => {
    const trimmed = String(nextName || '').trim();
    if (!selectedSetListId || !trimmed) return;
    updateSetLists((prev) =>
      prev.map((entry) => (entry.id === selectedSetListId ? { ...entry, name: trimmed } : entry))
    );
    syncSetListToApi(selectedSetListId, { name: trimmed });
  }, [selectedSetListId, updateSetLists, syncSetListToApi]);

  const renameSetListById = useCallback((id, nextName) => {
    const trimmed = String(nextName || '').trim();
    if (!id || !trimmed) return;
    updateSetLists((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry))
    );
    syncSetListToApi(id, { name: trimmed });
  }, [updateSetLists, syncSetListToApi]);

  const longPressTimerRef = useRef(null);

  const startChipRename = useCallback((entry) => {
    setRenamingChipId(entry.id);
    setChipNameDraft(entry.name);
  }, []);

  const commitChipRename = useCallback(() => {
    if (renamingChipId && chipNameDraft.trim()) {
      renameSetListById(renamingChipId, chipNameDraft);
    }
    setRenamingChipId('');
    setChipNameDraft('');
  }, [renamingChipId, chipNameDraft, renameSetListById]);

  const cancelChipRename = useCallback(() => {
    setRenamingChipId('');
    setChipNameDraft('');
  }, []);

  const deleteSelectedSetList = useCallback(async () => {
    if (!selectedSetListId) return;
    if (!confirm('Da li ste sigurni da želite da obrišete ovu set listu?')) return;
    try {
      await fetch(`/api/setlists/${encodeURIComponent(selectedSetListId)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting setlist:', err);
    }
    updateSetLists((prev) => {
      const next = prev.filter((entry) => entry.id !== selectedSetListId);
      setSelectedSetListId(next[0]?.id || '');
      return next;
    });
  }, [selectedSetListId, updateSetLists]);

  const removeSongFromSetListBySongId = useCallback((songId) => {
    if (!selectedSetListId || !songId) return;
    const current = setListsRef.current.find((e) => e.id === selectedSetListId);
    if (!current) return;
    const nextItems = current.items.filter((item) => String(item.songId) !== String(songId));
    if (nextItems.length === current.items.length) return;
    updateSetLists((prev) =>
      prev.map((entry) =>
        entry.id === selectedSetListId ? { ...entry, items: nextItems } : entry
      )
    );
    syncSetListToApi(selectedSetListId, { items: nextItems.map((i) => ({ songId: i.songId })) });
  }, [selectedSetListId, updateSetLists, syncSetListToApi]);

  const addSongToSelectedSetList = useCallback((song) => {
    if (!selectedSetListId || !song?.id) return;
    // Read current items from ref to avoid closure stale data
    const current = setListsRef.current.find((e) => e.id === selectedSetListId);
    if (!current) return;
    const exists = current.items.some((item) => String(item.songId) === String(song.id));
    if (exists) return;

    const nextId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `setitem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextItems = [
      ...current.items,
      {
        id: nextId,
        songId: song.id,
        title: song.title || 'Bez naziva',
        artist: song.artist || '',
      },
    ];
    updateSetLists((prev) =>
      prev.map((entry) =>
        entry.id === selectedSetListId ? { ...entry, items: nextItems } : entry
      )
    );
    setLastAddedSongId(String(song.id));
    syncSetListToApi(selectedSetListId, { items: nextItems.map((i) => ({ songId: i.songId })) });
  }, [selectedSetListId, updateSetLists, syncSetListToApi]);

  useEffect(() => {
    if (!lastAddedSongId) return;
    const timer = setTimeout(() => setLastAddedSongId(''), 1800);
    return () => clearTimeout(timer);
  }, [lastAddedSongId]);

  const syncItemsTimerRef = useRef(null);

  /** Sync items to API with debounce (avoids rapid-fire during reorder) */
  const syncItemsDebounced = useCallback((setListId) => {
    if (syncItemsTimerRef.current) clearTimeout(syncItemsTimerRef.current);
    syncItemsTimerRef.current = setTimeout(() => {
      const entry = setListsRef.current.find((e) => e.id === setListId);
      if (entry) {
        syncSetListToApi(setListId, { items: entry.items.map((i) => ({ songId: i.songId })) });
      }
    }, 400);
  }, [syncSetListToApi]);

  const removeSetListItem = useCallback((itemId) => {
    if (!selectedSetListId || !itemId) return;
    updateSetLists((prev) =>
      prev.map((entry) =>
        entry.id === selectedSetListId
          ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
          : entry
      )
    );
    syncItemsDebounced(selectedSetListId);
  }, [selectedSetListId, updateSetLists, syncItemsDebounced]);

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
    syncItemsDebounced(selectedSetListId);
  }, [selectedSetListId, updateSetLists, syncItemsDebounced]);

  const songsList = Array.isArray(allSongs) ? allSongs : [];

  // ── Is selected song from personal repertoire? ──
  const selectedSongInRepertoire = selectedSong
    ? songsList.some((s) => s.id === selectedSong.id)
    : true;

  const refreshSelectedSong = useCallback(async () => {
    if (!selectedSong?.id) return;
    // Skip refresh for pesmarica songs (not in own repertoire)
    if (!selectedSongInRepertoire) return;
    try {
      const resp = await fetch(`/api/songs/${selectedSong.id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setSelectedSong(data);
      setAllSongs((prev) =>
        Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : []
      );
    } catch {
      // Ignore refresh errors and keep current state.
    }
  }, [selectedSong?.id, selectedSongInRepertoire]);

  useEffect(() => {
    if (activeTab !== 'cheatsheet') return;
    refreshSelectedSong();
  }, [activeTab, refreshSelectedSong]);

  const filteredSongs = songsList.filter((s) => {
    if (repertoireCategoryFilter !== 'Sve') {
      const cat = String(s.category || '').trim();
      if (cat !== repertoireCategoryFilter) return false;
    }
    const q = songSearch.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q)
    );
  });

  const cheatsheetFilteredSongs = songsList.filter((s) => {
    const q = cheatsheetSearch.toLowerCase();
    if (!q) return true;
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q)
    );
  });

  // ── Repertoire prev/next navigation (fallback when no setlist) ──
  const repertoireSongIndex = selectedSong
    ? cheatsheetFilteredSongs.findIndex((s) => s.id === selectedSong.id)
    : -1;

  const openAdjacentRepertoireSong = useCallback(async (direction) => {
    if (navBusyRef.current) return;
    const idx = repertoireSongIndex;
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cheatsheetFilteredSongs.length) return;
    navBusyRef.current = true;
    try {
      const targetSong = cheatsheetFilteredSongs[targetIdx];
      // Use directly if lyrics already loaded to prevent flash
      if (targetSong.lyrics) {
        setSelectedSong(targetSong);
      } else {
        await handleSelectSong(targetSong);
      }
      if (navigator.vibrate) navigator.vibrate(30);
    } finally {
      setTimeout(() => { navBusyRef.current = false; }, 300);
    }
  }, [repertoireSongIndex, cheatsheetFilteredSongs, handleSelectSong]);

  // ── Debounced global pesmarica search ──
  useEffect(() => {
    if (globalSearchTimerRef.current) clearTimeout(globalSearchTimerRef.current);
    const q = cheatsheetSearch.trim();
    if (q.length < 2) {
      setGlobalResults([]);
      setGlobalSearchLoading(false);
      return;
    }
    setGlobalSearchLoading(true);
    globalSearchTimerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/pesmarica?search=${encodeURIComponent(q)}&suggest=1`);
        const data = await resp.json();
        // Filter out songs already in personal repertoire
        const ownIds = new Set(songsList.map((s) => `${(s.title||'').toLowerCase()}|${(s.artist||'').toLowerCase()}`));
        const filtered = (data.songs || []).filter(
          (s) => !ownIds.has(`${(s.title||'').toLowerCase()}|${(s.artist||'').toLowerCase()}`)
        );
        setGlobalResults(filtered);
      } catch {
        setGlobalResults([]);
      } finally {
        setGlobalSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(globalSearchTimerRef.current);
  }, [cheatsheetSearch, songsList]);

  // ── Add a global pesmarica song to personal repertoire ──
  const addGlobalSongToRepertoire = useCallback(async (song) => {
    if (addingSongId) return;
    setAddingSongId(song.id);
    try {
      const resp = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song.title,
          artist: song.artist,
          lyrics: song.lyrics || null,
          category: song.category || null,
          bandId: bandId || undefined,
          musicianId: musicianId || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška');
      const newSong = data.song || data;
      // Add to local songs list
      setAllSongs((prev) => Array.isArray(prev) ? [...prev, newSong] : [newSong]);
      // Remove from global results
      setGlobalResults((prev) => prev.filter((s) => s.id !== song.id));
      // If this song is currently selected, update to the new repertoire copy
      setSelectedSong((prev) => prev?.id === song.id ? newSong : prev);
      // Show success toast
      const cat = newSong.category || song.category || 'Razno';
      setAddedToRepToast(`✓ Dodata u repertoar (${cat})`);
      setTimeout(() => setAddedToRepToast(''), 3500);
    } catch (err) {
      console.error('Error adding song to repertoire:', err);
    } finally {
      setAddingSongId('');
    }
  }, [addingSongId, bandId, musicianId]);

  // Use navPosition as source of truth for set list position (handles duplicates)
  const selectedSetListSongIndex = navPosition !== -1 && navSetList
    ? navPosition
    : (navSetList?.items.findIndex((item) => item.songId === selectedSong?.id) ?? -1);

  // Prefetch lyrics for all songs in the active nav set list
  useEffect(() => {
    if (!navSetList?.items?.length) return;
    let cancelled = false;
    const prefetch = async () => {
      for (const item of navSetList.items) {
        if (cancelled) break;
        const cached = allSongs.find((s) => s.id === item.songId && s.lyrics);
        if (cached) continue;
        try {
          const resp = await fetch(`/api/songs/${item.songId}`);
          if (!resp.ok || cancelled) continue;
          const data = await resp.json();
          if (cancelled) break;
          setAllSongs((prev) =>
            Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : prev
          );
        } catch { /* silent prefetch */ }
      }
    };
    prefetch();
    return () => { cancelled = true; };
  }, [navSetList?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdjacentSetListSong = useCallback(async (direction) => {
    if (navBusyRef.current) return;
    if (!navSetList) return;
    const curIdx = navPosition;
    if (curIdx === -1) return;
    const targetIndex = direction === 'prev' ? curIdx - 1 : curIdx + 1;
    if (targetIndex < 0 || targetIndex >= navSetList.items.length) return;
    navBusyRef.current = true;
    setNavPosition(targetIndex);
    try {
      const item = navSetList.items[targetIndex];
      // Use cached song directly to avoid flash (no extra renders)
      const cachedSong = allSongs.find((s) => s.id === item.songId && s.lyrics);
      if (cachedSong) {
        setSelectedSong(cachedSong);
      } else {
        const matchedSong = allSongs.find((s) => s.id === item.songId);
        const fallbackSong = matchedSong || {
          id: item.songId,
          title: item.title,
          artist: item.artist,
          lyrics: null,
        };
        await handleSelectSong(fallbackSong);
      }
      if (navigator.vibrate) navigator.vibrate(30);
    } catch {
      setNavPosition(curIdx);
    } finally {
      setTimeout(() => { navBusyRef.current = false; }, 300);
    }
  }, [navSetList, allSongs, navPosition]);

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
  const transposeChord = (chord, offset) => {
    if (!offset) return chord;
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;
    const root = match[1];
    const suffix = match[2] || '';
    const normRoot = root === 'Db' ? 'C#'
      : root === 'Eb' ? 'D#'
      : root === 'Gb' ? 'F#'
      : root === 'Ab' ? 'G#'
      : root === 'Bb' ? 'A#'
      : root;
    const idx = keys.indexOf(normRoot);
    if (idx === -1) return chord;
    const newRoot = keys[(idx + offset + 12) % 12];
    return newRoot + suffix;
  };
  const renderLyrics = (text, offset = 0) => {
    if (!text) return null;
    const normalized = text.replace(/\r/g, '');
    return normalized.split('\n').map((line, i) => (
      <div key={i} className="lyrics-line">
        {line
          ? line.split(/(\[[A-G][#b]?(?:m|maj|min|sus|dim|aug)?[0-9]?\])/g).map((part, j) =>
              part.match(/^\[/) ? (
                <span key={j} className="chord-inline">{transposeChord(part.slice(1, -1), offset)}</span>
              ) : (
                <span key={j}>{part}</span>
              )
            )
          : <span className="empty-line">&nbsp;</span>}
      </div>
    ));
  };

  // Reset per-song controls when switching songs
  useEffect(() => {
    setLiveKeyOffset(0);
    setLiveIsEditing(false);
    setLiveEditContent(selectedSong?.lyrics || '');
    setLiveIsScrolling(false);
  }, [selectedSong?.id]);

  // Swipe left/right on lyrics to navigate songs
  const swipeRef = useRef({ startX: 0, startY: 0 });
  useEffect(() => {
    const el = lyricsRef.current;
    if (!el) return;
    const onTouchStart = (e) => {
      const t = e.touches[0];
      swipeRef.current = { startX: t.clientX, startY: t.clientY };
    };
    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeRef.current.startX;
      const dy = t.clientY - swipeRef.current.startY;
      // Require horizontal swipe > 60px and more horizontal than vertical
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      if (dx < 0) {
        // Swipe left → next song
        if (navSetList && selectedSetListSongIndex !== -1) openAdjacentSetListSong('next');
        else if (repertoireSongIndex !== -1) openAdjacentRepertoireSong('next');
      } else {
        // Swipe right → prev song
        if (navSetList && selectedSetListSongIndex !== -1) openAdjacentSetListSong('prev');
        else if (repertoireSongIndex !== -1) openAdjacentRepertoireSong('prev');
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  });

  // Auto-scroll effect for cheatsheet lyrics
  useEffect(() => {
    if (!liveIsScrolling) return;
    const interval = setInterval(() => {
      if (lyricsRef.current) {
        const el = lyricsRef.current;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setLiveIsScrolling(false);
          return;
        }
        el.scrollTop += 1;
      }
    }, Math.max(10, Math.round(50 / liveScrollSpeed)));
    return () => clearInterval(interval);
  }, [liveIsScrolling, liveScrollSpeed]);

  const handleLiveSaveLyrics = async () => {
    if (!selectedSong?.id || liveSaving) return;
    setLiveSaving(true);
    try {
      let songId = selectedSong.id;

      // If song is not in our repertoire, add it first then save edits on the copy
      if (!selectedSongInRepertoire) {
        const addResp = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedSong.title,
            artist: selectedSong.artist,
            lyrics: liveEditContent,
            category: selectedSong.category || null,
            bandId: bandId || undefined,
            musicianId: musicianId || undefined,
          }),
        });
        const addData = await addResp.json();
        if (!addResp.ok) throw new Error(addData.error || 'Greška pri dodavanju u repertoar.');
        const newSong = addData.song || addData;
        songId = newSong.id;
        setAllSongs((prev) => Array.isArray(prev) ? [...prev, newSong] : [newSong]);
        setGlobalResults((prev) => prev.filter((s) => s.id !== selectedSong.id));
        const updated = { ...newSong, lyrics: liveEditContent };
        setSelectedSong(updated);
        setLiveIsEditing(false);
        setAddedToRepToast(`✓ Dodata u repertoar i sačuvana`);
        setTimeout(() => setAddedToRepToast(''), 3500);
        return;
      }

      const resp = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: liveEditContent }),
      });
      if (!resp.ok) throw new Error('save failed');
      const updated = { ...selectedSong, lyrics: liveEditContent };
      setSelectedSong(updated);
      setAllSongs((prev) => Array.isArray(prev) ? prev.map((s) => s.id === updated.id ? updated : s) : []);
      setLiveIsEditing(false);
    } catch (err) {
      alert('Greška pri čuvanju teksta.');
    } finally {
      setLiveSaving(false);
    }
  };

  const updateRequestStatus = async (id, status) => {
    try {
      const response = await fetch('/api/live-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Greška pri ažuriranju live zahteva.');
      }
      return true;
    } catch (err) {
      console.error('Error updating request status:', err);
      throw err;
    }
  };

  const applyRequestStatusChange = useCallback(async (req, nextStatus, onSuccess) => {
    if (!req?.id || requestActionLoadingId === req.id) return false;
    const previousStatus = req.status;
    setRequestActionError('');
    setRequestActionLoadingId(req.id);
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: nextStatus.toLowerCase() } : r))
    );

    try {
      await updateRequestStatus(req.id, nextStatus);
      // Move to history locally if status is terminal
      const lowerStatus = nextStatus.toLowerCase();
      if (lowerStatus === 'rejected' || lowerStatus === 'played') {
        setHistoryRequests((prev) => [{ ...req, status: lowerStatus, time: 'upravo' }, ...prev]);
      }
      if (onSuccess) {
        await onSuccess();
      }
      return true;
    } catch (err) {
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: previousStatus } : r))
      );
      setRequestActionError(err?.message || 'Promena statusa nije sačuvana.');
      return false;
    } finally {
      setRequestActionLoadingId((current) => (current === req.id ? '' : current));
    }
  }, [requestActionLoadingId]);

  const handleAcceptRequest = async (req) => {
    await applyRequestStatusChange(req, 'ACCEPTED', async () => {
      await openRequestSong(req);
    });
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

    const songToOpen = matched || songsList.find((s) =>
      (s.title || '').toLowerCase().includes(requestedTitle)
    );

    if (songToOpen) {
      // Find which set list contains this song and set navigation context
      const containingList = setLists.find((sl) =>
        sl.items.some((item) => item.songId === songToOpen.id)
      );
      setSongNavSetListId(containingList?.id || '');
      if (containingList) {
        setNavPosition(containingList.items.findIndex((i) => i.songId === songToOpen.id));
      } else {
        setNavPosition(-1);
      }
      await handleSelectSong(songToOpen);
    }
  };

  const handleSkipRequest = (req) => {
    applyRequestStatusChange(req, 'REJECTED');
  };

  const handleMarkPlayed = (req) => {
    applyRequestStatusChange(req, 'PLAYED');
  };

  const [clearingHistory, setClearingHistory] = useState(false);
  const clearHistory = useCallback(async () => {
    if (clearingHistory) return;
    if (!window.confirm('Obrisati sve odsvirana i preskočene zahteve iz istorije?')) return;
    setClearingHistory(true);
    try {
      const param = bandId ? `bandId=${bandId}` : `musicianId=${musicianId}`;
      const resp = await fetch(`/api/live-requests?${param}&statusFilter=history`, { method: 'DELETE' });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Greška pri brisanju istorije.');
      }
      setRequests((prev) => prev.filter((r) => r.status !== 'played' && r.status !== 'rejected'));
      setHistoryRequests([]);
    } catch (err) {
      setRequestActionError(err?.message || 'Brisanje istorije nije uspelo.');
    } finally {
      setClearingHistory(false);
    }
  }, [clearingHistory, bandId, musicianId]);

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
  const loadHistory = useCallback(async () => {
    if (!ownerId) return;
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (bandId) params.set('bandId', bandId);
      else if (musicianId) params.set('musicianId', musicianId);
      params.set('statusFilter', 'history');
      const resp = await fetch(`/api/live-requests?${params.toString()}`, { cache: 'no-store' });
      const data = await resp.json();
      setHistoryRequests(Array.isArray(data) ? data : []);
    } catch {
      setHistoryRequests([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [ownerId, bandId, musicianId]);

  const filteredRequests = requestView === 'active'
    ? requests.filter((r) => r.status === 'pending' || r.status === 'accepted')
    : historyRequests;

  const handleExit = () => {
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
    <div className={`live-dashboard ${isNightMode ? 'night-vision' : 'light-mode'}`}>
      <header className="hud-header">
        <div className="hud-left">
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
            className={`hud-btn break-btn ${isOnBreak ? 'break-active' : ''}`}
            onClick={toggleBreak}
            aria-label={isOnBreak ? 'Završi pauzu' : 'Pauza'}
            title={isOnBreak ? 'Završi pauzu' : 'Pauza između setova'}
          >
            <Coffee size={20} />
            {isOnBreak ? <span className="break-timer-inline">{formatElapsed(breakElapsed)}</span> : <span>PAUZA</span>}
          </button>
          <button
            className={`hud-btn ${isNightMode ? 'active' : ''}`}
            onClick={() => setIsNightMode(!isNightMode)}
          >
            {isNightMode ? <Eye size={20} /> : <EyeOff size={20} />}
            <span>NIGHT VISION</span>
          </button>
          <button
            className="hud-btn"
            onClick={() => setShowQr(true)}
            aria-label="QR kod"
            title="QR kod za goste"
          >
            <QrCode size={20} />
          </button>
          <button
            className={`hud-btn ${showHelp ? 'settings-active' : ''}`}
            onClick={() => setShowHelp(true)}
            aria-label="Pomoć / uputstvo"
            title="Pomoć"
          >
            <HelpCircle size={20} />
          </button>
          <button
            className={`hud-btn ${showSettings ? 'settings-active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Podešavanja"
            title="Podešavanja"
          >
            <Settings size={20} />
          </button>
          <button
            className="hud-btn exit-btn hud-exit-x"
            onClick={handleExit}
            aria-label="Izlaz iz Live panela"
            title="Izlaz"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Mobile metrics strip — visible only ≤900px where hud-metrics is hidden */}
      <div className="mobile-metrics-strip">
        <span className="mms-item">
          <Clock size={12} />
          {formatElapsed(sessionElapsed)}
        </span>
        {totalTipsRsd > 0 && (
          <span className="mms-item mms-tips">
            <Banknote size={12} />
            {totalTipsRsd.toLocaleString('sr-RS')} RSD
          </span>
        )}
        {isWakeLocked && (
          <span className="mms-item mms-wl">
            <Smartphone size={12} />
            Ekran aktivan
          </span>
        )}
      </div>

      <main className="hud-main">
        <nav className="hud-side-nav">
          <button className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <MessageSquare size={24} />
            <span className="badge">{pendingCount}</span>
            <span className="nav-tooltip">Zahtevi</span>
            <span className="nav-label">Zahtevi</span>
          </button>
          <button className={`nav-item ${activeTab === 'cheatsheet' ? 'active' : ''}`} onClick={() => setActiveTab('cheatsheet')}>
            <Music size={24} />
            <span className="nav-tooltip">Tekst</span>
            <span className="nav-label">Tekst</span>
          </button>
          <button className={`nav-item ${activeTab === 'repertoire' ? 'active' : ''}`} onClick={() => setActiveTab('repertoire')}>
            <ListMusic size={24} />
            <span className="nav-tooltip">Set liste</span>
            <span className="nav-label">Set liste</span>
          </button>
          <button className={`nav-item ${activeTab === 'addSong' ? 'active' : ''}`} onClick={() => { setActiveTab('addSong'); setShowSetlistSongDropdown(true); }}>
            <PlusCircle size={24} />
            <span className="nav-tooltip">Dodaj</span>
            <span className="nav-label">Dodaj</span>
          </button>
        </nav>

        <section className="hud-content">
          {activeTab === 'requests' && (
            <div className="request-feed">
              <h2 className="requests-title night-glow">ZAHTEVI PUBLIKE</h2>
              {requestActionError && (
                <div className="live-inline-error">
                  {requestActionError}
                </div>
              )}
              {requestLoadError && (
                <div className="live-inline-error">
                  {requestLoadError}
                </div>
              )}
              <div className="request-view-toggle">
                <button
                  className={`mini-tab ${requestView === 'active' ? 'active' : ''}`}
                  onClick={() => setRequestView('active')}
                >
                  Aktivni
                </button>
                <button
                  className={`mini-tab ${requestView === 'history' ? 'active' : ''}`}
                  onClick={() => { setRequestView('history'); loadHistory(); }}
                >
                  Istorija
                </button>
              </div>
              {requestView === 'history' && filteredRequests.length > 0 && (
                <div className="clear-history-row">
                  <button
                    className="btn-hud clear-history-btn"
                    onClick={clearHistory}
                    disabled={clearingHistory}
                    title="Obriši sve odsvirana i preskočene zahteve"
                  >
                    <RotateCcw size={15} />
                    {clearingHistory ? 'Brisanje…' : 'Obriši istoriju'}
                  </button>
                </div>
              )}
              {(requestsLoading || (requestView === 'history' && historyLoading)) ? (
                <div className="live-state-card">
                  <MessageSquare size={38} />
                  <div className="live-state-copy">
                    <strong>Učitavanje zahteva…</strong>
                    <span>Čekam najnovije live porudžbine i osvežavam red čekanja.</span>
                  </div>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="empty-state live-state-card">
                  <MessageSquare size={48} />
                  <div className="live-state-copy">
                    <strong>{requestView === 'active' ? 'Nema aktivnih zahteva' : 'Nema istorije zahteva'}</strong>
                    <span>
                      {requestView === 'active'
                        ? 'Kada gosti pošalju novu pesmu ili bakšiš, pojaviće se ovde.'
                        : 'Ovde će ostati trag odsviranih i preskočenih zahteva tokom sesije.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="feed-grid">
                  {filteredRequests.map((req) => (
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
                              disabled={requestActionLoadingId === req.id}
                            >
                              {requestActionLoadingId === req.id ? 'Sačekaj...' : 'Prihvati'}
                            </button>
                            <button
                              className="btn-hud skip"
                              onClick={() => handleSkipRequest(req)}
                              disabled={requestActionLoadingId === req.id}
                            >
                              {requestActionLoadingId === req.id ? 'Sačekaj...' : 'Preskoči'}
                            </button>
                          </>
                        )}
                        {req.status === 'accepted' && (
                          <>
                            <button className="btn-hud accept" onClick={() => openRequestSong(req)}>
                              {requestHasLyrics(req) ? 'Tekst' : 'Bez teksta'}
                            </button>
                            <button
                              className="btn-hud skip"
                              onClick={() => handleMarkPlayed(req)}
                              disabled={requestActionLoadingId === req.id}
                            >
                              {requestActionLoadingId === req.id ? 'Sačekaj...' : 'Svirano'}
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
              {!hasAnyLiveSetList && setLists.length > 0 && (
                <div className="no-live-warning">
                  <Radio size={16} />
                  <span>Nijedna pesma nije dostupna za naručivanje. Aktivirajte barem jednu set listu.</span>
                </div>
              )}
              {setListsLoading ? (
                <div className="live-state-card compact">
                  <ListMusic size={34} />
                  <div className="live-state-copy">
                    <strong>Učitavanje set lista…</strong>
                    <span>Pripremam vaše live liste i dostupne pesme za nastup.</span>
                  </div>
                </div>
              ) : setLists.length === 0 ? (
                <div className="setlists-empty live-state-card compact">
                  <PlusCircle size={30} />
                  <div className="live-state-copy">
                    <strong>Još nema set lista</strong>
                    <span>Napravite prvu set listu na <PlusCircle size={14} style={{ verticalAlign: 'middle' }} /> tabu da biste uključili pesme za live naručivanje.</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="setlists-selector">
                    {setLists.map((entry) => (
                      <div key={entry.id} className={`setlist-chip-wrap ${entry.isLive ? 'is-live' : ''}`}>
                        <button
                          type="button"
                          className={`setlist-chip ${entry.id === selectedSetListId ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedSetListId(entry.id);
                          }}
                        >
                          {entry.isLive && <span className="live-dot"></span>}
                          {entry.name}
                        </button>
                        <button
                          type="button"
                          className={`live-toggle-btn ${entry.isLive ? 'on' : 'off'}`}
                          onClick={() => toggleSetListLive(entry.id)}
                          title={entry.isLive ? 'Isključi Live' : 'Uključi Live'}
                        >
                          <Radio size={12} />
                          <span>{entry.isLive ? 'LIVE' : 'Off'}</span>
                        </button>
                      </div>
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
                            <span>Dodato u listu: <strong>{selectedSetList?.items.length || 0}</strong></span>
                            {selectedSetList && selectedSetList.items.length > 0 && (() => {
                              const playedInList = selectedSetList.items.filter(i => playedSongIds.has(i.songId)).length;
                              return playedInList > 0 ? (
                                <span className="setlist-progress-badge">
                                  <CheckCircle2 size={12} />
                                  {playedInList}/{selectedSetList.items.length}
                                </span>
                              ) : null;
                            })()}
                            {selectedSetList && (
                              <button
                                type="button"
                                className={`live-toggle-btn inline ${selectedSetList.isLive ? 'on' : 'off'}`}
                                onClick={() => toggleSetListLive(selectedSetListId)}
                              >
                                <Radio size={12} />
                                <span>{selectedSetList.isLive ? 'Dostupno LIVE' : 'Nedostupno'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="setlist-items">
                          {selectedSetList.items.length === 0 ? (
                            <div className="setlists-empty small live-state-card compact">
                              <Music size={26} />
                              <div className="live-state-copy">
                                <strong>Još nema pesama u ovoj listi</strong>
                                <span>Dodajte prvu pesmu da bi lista bila spremna za live režim.</span>
                              </div>
                              <button type="button" className="setlist-create-btn" style={{ marginTop: '0.5rem' }} onClick={() => { setActiveTab('addSong'); setShowSetlistSongDropdown(true); }}>
                                + Dodaj pesmu
                              </button>
                            </div>
                          ) : (
                            selectedSetList.items.map((item, index) => {
                              const isSongPlayed = playedSongIds.has(item.songId);
                              return (
                              <div key={item.id} className={`setlist-item-row ${item.songId === lastAddedSongId ? 'just-added' : ''} ${isSongPlayed ? 'song-played' : ''}`}>
                                <button
                                  type="button"
                                  className={`setlist-item-main ${isSongPlayed ? 'played' : ''}`}
                                  onClick={() => openSongFromSetListItem(item, selectedSetListId, index)}
                                >
                                  <span className="setlist-item-order">{index + 1}.</span>
                                  <span className="setlist-item-copy">
                                    <span className={`setlist-item-title ${isSongPlayed ? 'played-through' : ''}`}>{item.title}</span>
                                    <span className="setlist-item-artist">{item.artist}</span>
                                  </span>
                                </button>
                                <div className="setlist-item-actions">
                                  <button
                                    type="button"
                                    className={`setlist-played-btn ${isSongPlayed ? 'is-played' : ''}`}
                                    onClick={() => toggleSongPlayed(item.songId)}
                                    title={isSongPlayed ? 'Označi kao neodsvirano' : 'Označi kao odsvirano'}
                                    aria-label={isSongPlayed ? 'Neodsvirano' : 'Odsvirano'}
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                  <button type="button" onClick={() => moveSetListItem(item.id, 'up')}>↑</button>
                                  <button type="button" onClick={() => moveSetListItem(item.id, 'down')}>↓</button>
                                  <button type="button" onClick={() => removeSetListItem(item.id)}>×</button>
                                </div>
                              </div>
                              );
                            })
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
                      <div key={entry.id} className={`setlist-chip-wrap ${entry.isLive ? 'is-live' : ''}`}>
                        {renamingChipId === entry.id ? (
                          <input
                            type="text"
                            className="setlist-chip-rename-input"
                            value={chipNameDraft}
                            onChange={(e) => setChipNameDraft(e.target.value)}
                            onBlur={commitChipRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.target.blur(); }
                              if (e.key === 'Escape') cancelChipRename();
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className={`setlist-chip ${entry.id === selectedSetListId ? 'active' : ''}`}
                            onClick={() => setSelectedSetListId(entry.id)}
                            onDoubleClick={(e) => { e.preventDefault(); startChipRename(entry); }}
                            onTouchStart={() => {
                              longPressTimerRef.current = setTimeout(() => { startChipRename(entry); }, 600);
                            }}
                            onTouchEnd={() => { clearTimeout(longPressTimerRef.current); }}
                            onTouchMove={() => { clearTimeout(longPressTimerRef.current); }}
                            title="Drži dugo ili dvaput klikni za preimenovanje"
                          >
                            {entry.isLive && <span className="live-dot"></span>}
                            {entry.name}
                            {entry.id === selectedSetListId && (
                              <span
                                className="chip-edit-icon"
                                onClick={(e) => { e.stopPropagation(); startChipRename(entry); }}
                                role="button"
                                aria-label="Preimenuj set listu"
                              >
                                <Edit2 size={11} />
                              </span>
                            )}
                          </button>
                        )}
                      </div>
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
                            <div className="repertoire-combo-sticky-search">
                              <input
                                type="text"
                                placeholder="Pretraži pesmu ili izvođača..."
                                value={songSearch}
                                onChange={(e) => setSongSearch(e.target.value)}
                                className="song-search-input repertoire-search-input"
                              />
                              <div className="repertoire-cat-scroll">
                                {REPERTOIRE_CATEGORIES.map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    className={`repertoire-cat-chip ${repertoireCategoryFilter === cat ? 'active' : ''}`}
                                    onClick={() => setRepertoireCategoryFilter(cat)}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                              <span className="repertoire-combo-count">{filteredSongs.length} pesama</span>
                            </div>
                            <div className="repertoire-dropdown-list">
                              {songLoading ? (
                                <div className="song-loading compact">Učitavanje repertoara...</div>
                              ) : filteredSongs.length === 0 ? (
                                <div className="repertoire-empty">{songSearch ? 'Nema rezultata' : 'Repertoar je prazan'}</div>
                              ) : (
                                filteredSongs.map((song) => {
                                  const inSetListCount = selectedSetListSongCountById[String(song.id)] || 0;
                                  const isAlreadyInSetList = inSetListCount > 0;
                                  return (
                                    <div key={song.id} className="repertoire-dropdown-item">
                                      <button
                                        type="button"
                                        className="repertoire-dropdown-main"
                                        title={isAlreadyInSetList ? 'Klikni da ukloniš iz set liste' : 'Dodaj u set listu'}
                                        onClick={() => {
                                          if (isAlreadyInSetList) {
                                            removeSongFromSetListBySongId(song.id);
                                          } else {
                                            addSongToSelectedSetList(song);
                                          }
                                        }}
                                      >
                                        <span className="song-picker-title">{song.title}</span>
                                        <span className="song-picker-sep">—</span>
                                        <span className="song-picker-artist">{song.artist}</span>
                                        {isAlreadyInSetList ? (
                                          <span className="song-in-setlist-pill removable">✕ Ukloni</span>
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
                        value={cheatsheetSearch}
                        onChange={(e) => {
                          setCheatsheetSearch(e.target.value);
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

                    {showSongDropdown && !songLoading && (cheatsheetFilteredSongs.length > 0 || globalResults.length > 0 || globalSearchLoading) && (
                      <div className="song-dropdown-list">
                        {cheatsheetFilteredSongs.length > 0 && (
                          <>
                            {cheatsheetSearch.trim().length >= 2 && <div className="dropdown-section-label">Moj repertoar</div>}
                            {cheatsheetFilteredSongs.map((song) => (
                              <button
                                key={song.id}
                                className="song-dropdown-item"
                                onClick={async () => {
                                  setSongNavSetListId(''); setNavPosition(-1);
                                  await handleSelectSong(song);
                                  setShowSongDropdown(false);
                                }}
                              >
                                <span className="song-dropdown-title">{song.title}</span>
                                <span className="song-dropdown-artist">{song.artist}</span>
                              </button>
                            ))}
                          </>
                        )}
                        {cheatsheetSearch.trim().length >= 2 && (globalResults.length > 0 || globalSearchLoading) && (
                          <>
                            <div className="dropdown-section-label pesmarica-label">
                              Pesmarica
                              {globalSearchLoading && <span className="dropdown-loading-dot">…</span>}
                            </div>
                            {globalResults.map((song) => (
                              <div key={song.id} className="song-dropdown-item global-item">
                                <button
                                  type="button"
                                  className="global-song-info"
                                  onClick={async () => {
                                    setSongNavSetListId(''); setNavPosition(-1);
                                    await handleSelectSong(song);
                                    setShowSongDropdown(false);
                                  }}
                                >
                                  <span className="song-dropdown-title">{song.title}</span>
                                  <span className="song-dropdown-artist">{song.artist}</span>
                                </button>
                                <button
                                  type="button"
                                  className="global-add-btn"
                                  onClick={() => addGlobalSongToRepertoire(song)}
                                  disabled={addingSongId === song.id}
                                  title="Dodaj u moj repertoar"
                                  aria-label="Dodaj u repertoar"
                                >
                                  {addingSongId === song.id ? <RotateCcw size={13} className="spin-icon" /> : <PlusCircle size={13} />}
                                </button>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {songLoading ? (
                    <div className="live-state-card compact">
                      <Music size={28} />
                      <div className="live-state-copy">
                        <strong>Učitavanje repertoara…</strong>
                        <span>Pripremam pesme i tekstove za brzu pretragu tokom nastupa.</span>
                      </div>
                    </div>
                  ) : cheatsheetFilteredSongs.length === 0 && globalResults.length === 0 ? (
                    <div className="live-state-card compact">
                      <Music size={28} />
                      <div className="live-state-copy">
                        <strong>{cheatsheetSearch ? 'Nema rezultata' : 'Repertoar je prazan'}</strong>
                        <span>
                          {cheatsheetSearch
                            ? 'Nema rezultata ni u repertoaru ni u pesmarici.'
                            : 'Dodajte pesme u repertoar ili pretražite pesmaricu.'}
                        </span>
                      </div>
                    </div>
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
                                    onClick={() => openSongFromSetListItem(item, entry.id, idx)}
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
                        onClick={() => { setSelectedSong(null); setSongNavSetListId(''); setNavPosition(-1); }}
                      >
                        <ArrowLeft size={14} />
                        <span>Set liste</span>
                      </button>
                      {navSetList && selectedSetListSongIndex !== -1 ? (
                        <div className="cheatsheet-nav-arrows">
                          <button
                            type="button"
                            className="cheatsheet-arrow-btn"
                            disabled={selectedSetListSongIndex <= 0}
                            onClick={() => openAdjacentSetListSong('prev')}
                            aria-label="Prethodna pesma"
                            title="Prethodna pesma u set listi"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="cheatsheet-song-counter">
                            {selectedSetListSongIndex + 1}/{navSetList.items.length}
                          </span>
                          <button
                            type="button"
                            className="cheatsheet-arrow-btn"
                            disabled={selectedSetListSongIndex >= navSetList.items.length - 1}
                            onClick={() => openAdjacentSetListSong('next')}
                            aria-label="Sledeća pesma"
                            title="Sledeća pesma u set listi"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      ) : repertoireSongIndex !== -1 && cheatsheetFilteredSongs.length > 1 && (
                        <div className="cheatsheet-nav-arrows">
                          <button
                            type="button"
                            className="cheatsheet-arrow-btn"
                            disabled={repertoireSongIndex <= 0}
                            onClick={() => openAdjacentRepertoireSong('prev')}
                            aria-label="Prethodna pesma"
                            title="Prethodna pesma u repertoaru"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="cheatsheet-song-counter">
                            {repertoireSongIndex + 1}/{cheatsheetFilteredSongs.length}
                          </span>
                          <button
                            type="button"
                            className="cheatsheet-arrow-btn"
                            disabled={repertoireSongIndex >= cheatsheetFilteredSongs.length - 1}
                            onClick={() => openAdjacentRepertoireSong('next')}
                            aria-label="Sledeća pesma"
                            title="Sledeća pesma u repertoaru"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      )}
                      <div className="cheatsheet-song-info">
                        <h3 className="cheatsheet-now-title">{selectedSong.title}</h3>
                        <span className="cheatsheet-now-artist">{selectedSong.artist}</span>
                      </div>
                      {!selectedSongInRepertoire && selectedSong.id && (
                        <div className="add-to-repertoire-banner">
                          <span className="add-rep-label">Pesma nije u vašem repertoaru</span>
                          <button
                            type="button"
                            className="add-rep-btn"
                            onClick={() => addGlobalSongToRepertoire(selectedSong)}
                            disabled={addingSongId === selectedSong.id}
                          >
                            <PlusCircle size={14} />
                            {addingSongId === selectedSong.id ? 'Dodavanje…' : 'Dodaj u repertoar'}
                          </button>
                        </div>
                      )}
                      {addedToRepToast && (
                        <div className="added-to-rep-toast">
                          <CheckCircle2 size={14} />
                          <span>{addedToRepToast}</span>
                        </div>
                      )}
                      {selectedSong.lyrics !== null && selectedSong.id && (
                        <div className="cheatsheet-tools">
                          <button
                            type="button"
                            className={`cheat-tool-btn ${liveIsEditing ? 'active' : ''}`}
                            onClick={() => liveIsEditing ? handleLiveSaveLyrics() : setLiveIsEditing(true)}
                            disabled={liveSaving}
                            title={liveIsEditing ? 'Sačuvaj' : 'Izmeni tekst'}
                          >
                            {liveIsEditing ? <Check size={14} /> : <Edit2 size={14} />}
                            <span className="cheat-tool-label">{liveIsEditing ? (liveSaving ? 'ČUVAM...' : 'SAČUVAJ') : 'IZMENI'}</span>
                          </button>
                          {!liveIsEditing && (
                            <div className="cheat-transpose">
                              <button type="button" onClick={() => setLiveKeyOffset((o) => o - 1)} title="Snizi za pola koraka">-b</button>
                              <span className="cheat-key">{keys[(keys.indexOf(selectedSong.key || 'C') + liveKeyOffset + 12) % 12]}</span>
                              <button type="button" onClick={() => setLiveKeyOffset((o) => o + 1)} title="Podigni za pola koraka">+#</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {liveIsEditing ? (
                      <textarea
                        className="cheat-edit-area"
                        value={liveEditContent}
                        onChange={(e) => setLiveEditContent(e.target.value)}
                        placeholder="Nalepi tekst i akorde (koristi [G] format za akorde)..."
                      />
                    ) : (
                      <div className="lyrics-display" ref={lyricsRef} style={{ fontSize: `${fontScale}em` }}>
                        <div className="lyrics-inner">
                          {selectedSong.lyrics ? (
                            renderLyrics(selectedSong.lyrics, liveKeyOffset)
                          ) : (
                            <div className="no-lyrics-msg">
                              <Music size={40} />
                              <p>Tekst za selektovanu pesmu još nije dodat.</p>
                              <p className="hint">Kliknite ispod da odmah dodate tekst za ovu pesmu.</p>
                              {selectedSong.id && (
                                <button
                                  type="button"
                                  className="add-lyrics-btn"
                                  onClick={() => setLiveIsEditing(true)}
                                >
                                  Dodaj tekst
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!liveIsEditing && selectedSong.lyrics && (
                      <div className="cheat-footer">
                        <div className="cheat-speed">
                          <button type="button" className={liveScrollSpeed === 1 ? 'active' : ''} onClick={() => setLiveScrollSpeed(1)}>x1</button>
                          <button type="button" className={liveScrollSpeed === 1.5 ? 'active' : ''} onClick={() => setLiveScrollSpeed(1.5)}>x1.5</button>
                          <button type="button" className={liveScrollSpeed === 2 ? 'active' : ''} onClick={() => setLiveScrollSpeed(2)}>x2</button>
                        </div>
                        <button
                          type="button"
                          className="cheat-play-btn"
                          onClick={() => setLiveIsScrolling((s) => !s)}
                          aria-label={liveIsScrolling ? 'Pauziraj auto-skrol' : 'Pokreni auto-skrol'}
                          title={liveIsScrolling ? 'Pauza' : 'Start'}
                        >
                          {liveIsScrolling ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <div className="cheat-status">
                          <span>{liveIsScrolling ? 'SKROL' : 'PAUZA'}</span>
                          <span>KEY {liveKeyOffset > 0 ? `+${liveKeyOffset}` : liveKeyOffset}</span>
                        </div>
                      </div>
                    )}
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
            <div className="value">{formatElapsed(sessionElapsed)}</div>
          </div>
          <div className="metric-box">
            <Radio size={16} />
            <div className="label">BR. ZAHTEVA</div>
            <div className="value">{activeCount}</div>
          </div>
          {totalTipsRsd > 0 && (
            <div className="metric-box metric-tips">
              <Banknote size={16} />
              <div className="label">BAKŠIŠ</div>
              <div className="value">{totalTipsRsd.toLocaleString('sr-RS')} RSD</div>
            </div>
          )}
          {isOnBreak && (
            <div className="metric-box metric-break">
              <Coffee size={16} />
              <div className="label">PAUZA</div>
              <div className="value">{formatElapsed(breakElapsed)}</div>
            </div>
          )}
          <div className="metric-box">
            <Volume2 size={16} />
            <div className="label">ZVUK</div>
            <div className="value value-sm">{settings.soundEnabled ? 'UKLJ.' : 'ISKLJ.'}</div>
          </div>
          <div className="metric-box metric-wakelock">
            <Smartphone size={16} />
            <div className="label">EKRAN</div>
            <div className={`value value-sm ${isWakeLocked ? 'wl-on' : 'wl-off'}`}>
              {isWakeLocked ? 'AKTIVAN' : 'AUTO'}
            </div>
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
                <p className="setting-sync-note">Važi na svim uređajima za ovaj live nastup.</p>
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
                <p className="setting-device-note">Lokalna preferenca ovog uređaja.</p>
              </div>

              {/* Toggle: Show tip amounts locally */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">PRIKAŽI NAPOJNICE</label>
                    <p className="setting-hint">Sakrij/prikaži iznose napojnica samo na ovom uređaju</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.showTips ? 'on' : 'off'}`}
                    onClick={() => updateSetting('showTips', !settings.showTips)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
                <p className="setting-device-note">Lokalna preferenca ovog uređaja.</p>
              </div>

              {/* Toggle: Allow guest tips across devices */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">DOZVOLI BAKŠIŠ GOSTIMA</label>
                    <p className="setting-hint">Uključi ili isključi bakšiš u live zahtevima za ceo nastup</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.allowGuestTips ? 'on' : 'off'}`}
                    onClick={() => handleSharedToggleChange('allowGuestTips', !settings.allowGuestTips)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
                <p className="setting-sync-note">Važi na svim uređajima za ovaj live nastup.</p>
              </div>

              {/* Toggle: Sound */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">
                      {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} ZVUČNA OBAVEŠTENJA
                    </label>
                    <p className="setting-hint">Zvučni signal za nove zahteve gostiju na ovom uređaju</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.soundEnabled ? 'on' : 'off'}`}
                    onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
                <p className="setting-device-note">Lokalna preferenca ovog uređaja.</p>
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
                    <p className="setting-hint">Automatski prihvati sve dolazeće zahteve na ovom uređaju</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.autoAccept ? 'on' : 'off'}`}
                    onClick={() => updateSetting('autoAccept', !settings.autoAccept)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
                <p className="setting-device-note">Lokalna preferenca ovog uređaja.</p>
              </div>

              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">
                      <ListMusic size={14} /> PUN REPERTOAR U LIVE REŽIMU
                    </label>
                    <p className="setting-hint">Kad je uključeno, gosti mogu tražiti i pesme van aktivnih live set lista</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.allowFullRepertoireLive ? 'on' : 'off'}`}
                    onClick={() => handleSharedToggleChange('allowFullRepertoireLive', !settings.allowFullRepertoireLive)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
                <p className="setting-sync-note">Važi na svim uređajima za ovaj live nastup.</p>
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

      {/* Help Panel Overlay */}
      {showHelp && (
        <div className="settings-overlay" onClick={() => setShowHelp(false)}>
          <div className="settings-panel help-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>POMOĆ — KAKO KORISTITI LIVE PANEL</h2>
              <button className="close-btn" onClick={() => setShowHelp(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body help-body">
              <div className="help-section">
                <h3><MessageSquare size={16} /> Zahtevi gostiju</h3>
                <p>Gosti skeniraju <strong>QR kod</strong> i iz svojih telefona šalju želje za pesme. Novi zahtevi se pojavljuju ovde automatski uz zvučni signal, a gost na svojoj strani vidi da li je zahtev na čekanju, prihvaćen ili odbijen.</p>
                <ul>
                  <li><strong>Prihvati</strong> — zahtev prelazi u listu potvrđenih pesama i automatski otvara tekst pesme.</li>
                  <li><strong>Preskoči</strong> — zahtev se arhivira i ne svira; gost vidi status &ldquo;Odbijena&rdquo;.</li>
                  <li><strong>Tekst</strong> — otvara tekst pesme u Podsetniku (ako postoji u repertoaru).</li>
                  <li><strong>Svirano</strong> — označite kad odsvirate pesmu; gost dobija notifikaciju &ldquo;Odsvirana&rdquo;.</li>
                  <li>Tab <strong>Aktivni / Istorija</strong> — Aktivni prikazuje trenutne zahteve na čekanju i prihvaćene. Istorija prikazuje sve odrađene i preskočene.</li>
                  <li>Kartice sa ikonom <Banknote size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> su napojnice / bakšiš od gostiju preko konobara.</li>
                  <li><strong>Obriši istoriju</strong> — briše samo odrađene zahteve iz istorije, ne utiče na aktivne.</li>
                </ul>
              </div>

              <div className="help-section">
                <h3><ListMusic size={16} /> Set liste (Repertoar)</h3>
                <p>Pravite liste pesama koje ste spremni da svirate. Gosti vide <strong>samo pesme iz aktivnih (LIVE) set lista</strong> kad otvore QR link.</p>
                <ul>
                  <li><strong>LIVE / Off</strong> dugme pored liste — uključuje/isključuje dostupnost za goste. Možete imati više aktivnih lista istovremeno.</li>
                  <li>Klik na pesmu u listi — otvara tekst pesme u Podsetniku.</li>
                  <li>Strelice <strong>↑ ↓</strong> — menjaju redosled pesama u listi.</li>
                  <li><strong>×</strong> — briše pesmu iz set liste (ne briše iz vašeg repertoara).</li>
                  <li><strong>Preimenuj</strong> — dugačak pritisak (hold) na chip ime liste za preimenovanje.</li>
                  <li><strong>Obriši set listu</strong> — trajno briše celu listu.</li>
                </ul>
              </div>

              <div className="help-section">
                <h3><PlusCircle size={16} /> Dodaj pesmu</h3>
                <p>Dodavanje pesama u set listu iz vašeg repertoara ili iz globalne pesmarice.</p>
                <ul>
                  <li><strong>+ Nova set lista</strong> — kreira novu praznu listu.</li>
                  <li>Izaberite set listu (chips na vrhu), zatim pretražite pesmu.</li>
                  <li>Filteri po kategorijama: Muške/Ženske Zabavne, Narodne, Strane, Razno.</li>
                  <li>Pesme označene sa <strong>Već dodato</strong> su već u trenutnoj listi.</li>
                  <li><strong>Tekst</strong> — otvara tekst pesme bez dodavanja u listu.</li>
                  <li><strong>Globalna pesmarica</strong> — pretražite pesme koje nisu u vašem repertoaru i dodajte ih jednim klikom.</li>
                </ul>
              </div>

              <div className="help-section">
                <h3><Music size={16} /> Podsetnik (tekstovi pesama)</h3>
                <p>Brz pristup tekstovima i akordima tokom nastupa sa naprednim alatima.</p>
                <ul>
                  <li>Pretražite pesmu ili otvorite set listu — klik na pesmu otvara tekst.</li>
                  <li>Akordi su označeni <span style={{ color: '#8b5cf6', fontWeight: 700 }}>ljubičastom bojom</span> unutar teksta.</li>
                  <li><strong>Transpozicija (♯ / ♭)</strong> — pomeranje tonaliteta gore/dole za pola tona. Reset vraća originalni tonalitet.</li>
                  <li><strong>Auto-scroll</strong> — automatsko skrolovanje teksta tokom sviranja. Podešavajte brzinu sa + / - dugmićima.</li>
                  <li><strong>Uredi</strong> — direktno menjajte tekst pesme iz Live panela bez izlaska. Sačuvajte kad završite.</li>
                  <li><strong>← Prethodna / Sledeća →</strong> — prelazite na prethodnu/sledeću pesmu u set listi bez vraćanja na listu.</li>
                  <li>Veličinu slova menjate u <strong>Podešavanjima</strong> (80%–150%).</li>
                </ul>
              </div>

              <div className="help-section">
                <h3><QrCode size={16} /> QR kod za goste</h3>
                <p>Generišite QR kod koji gosti skeniraju da otvore vašu Live stranicu. Kliknite ikonu QR koda u zaglavlju.</p>
                <ul>
                  <li>Odštampajte ga kao flajer i stavite na stolove u lokalu.</li>
                  <li>QR link vodi direktno na vašu Live stranicu sa repertoarom i naručivanjem.</li>
                </ul>
              </div>

              <div className="help-section">
                <h3><Coffee size={16} /> Pauza</h3>
                <p>Aktivirajte pauzu kad pravite break između setova. Tajmer pauze se prikazuje na vrhu ekrana. Kliknite ponovo da završite pauzu.</p>
              </div>

              <div className="help-section">
                <h3><Smartphone size={16} /> Ekran ne spava</h3>
                <p>Live panel automatski drži ekran upaljen (Wake Lock) — telefon neće zaključati ekran dok je panel otvoren. Idealno za postavljanje telefona na stalak tokom nastupa.</p>
              </div>

              <div className="help-section">
                <h3><Clock size={16} /> Session timer</h3>
                <p>Tajmer u zaglavlju beleži koliko traje nastup. Ne resetuje se ako osvežite stranicu — pamti se do kraja sesije ili dok ne resetujete ručno.</p>
              </div>

              <div className="help-section">
                <h3><Eye size={16} /> Night Vision</h3>
                <p>Specijalni režim sa <strong>ljubičastim akcentima na tamnoj pozadini</strong> — ne smeta publici, čuva vid, idealan za mračnu binu. Uključeno je podrazumevano.</p>
              </div>

              <div className="help-section">
                <h3><Settings size={16} /> Podešavanja</h3>
                <ul>
                  <li><strong>Naziv lokala</strong> — prikazuje se u zaglavlju tokom nastupa (lokalno).</li>
                  <li><strong>Maks. broj zahteva</strong> — ograničenje zahteva na čekanju (0 = bez limita). Deljeno podešavanje — važi za sve uređaje.</li>
                  <li><strong>Veličina teksta</strong> — lokalno skaliranje za bolju vidljivost na bini (80%–150%).</li>
                  <li><strong>Prikaži napojnice</strong> — lokalno sakrij/prikaži iznose bakšiša u dashboardu.</li>
                  <li><strong>Dozvoli bakšiš gostima</strong> — deljeno pravilo. Kad je isključeno, gosti ne mogu da šalju bakšiš.</li>
                  <li><strong>Pun repertoar u live režimu</strong> — deljeno pravilo. Kad je uključeno, gosti vide sve pesme iz repertoara, ne samo set liste.</li>
                  <li><strong>Zvučna obaveštenja</strong> — zvučni signal za nove zahteve (lokalno, ovaj uređaj).</li>
                  <li><strong>Desktop notifikacije</strong> — sistemski pop-up kad stigne zahtev (dozvolite u pregledaču).</li>
                  <li><strong>Auto prihvatanje</strong> — automatski prihvata sve dolazeće zahteve bez ručne potvrde.</li>
                  <li><strong>Resetuj sesiju</strong> — briše SVE zahteve i resetuje brojače. Oprez: ne može se poništiti!</li>
                </ul>
              </div>

              <div className="help-section help-tip">
                <h3><Radio size={16} /> Saveti za nastup</h3>
                <ul>
                  <li>Odštampajte <strong>QR flajer</strong> i stavite ga na stolove — gosti direktno šalju zahteve bez dolaska do vas.</li>
                  <li>Uključite <strong>Auto prihvatanje</strong> ako ne želite da ručno odobravate svaki zahtev.</li>
                  <li>Koristite <strong>set liste</strong> da organizujete pesme po setovima (npr. &ldquo;1. set&rdquo;, &ldquo;2. set&rdquo;, &ldquo;Bis&rdquo;).</li>
                  <li>Postavite telefon na stalak i koristite <strong>auto-scroll</strong> za hands-free čitanje teksta.</li>
                  <li>Napravite pauzu između setova klikom na <strong>Pauza</strong> dugme — pratite koliko traje break.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQr && <QrModal bandId={bandId} musicianId={musicianId} onClose={() => setShowQr(false)} />}

      {/* Break Mode Banner */}
      {isOnBreak && (
        <div className="break-banner">
          <Coffee size={18} />
          <span className="break-banner-label">PAUZA</span>
          <span className="break-banner-timer">{formatElapsed(breakElapsed)}</span>
          <button className="break-banner-end" onClick={toggleBreak}>Nastavi</button>
        </div>
      )}

      <style jsx global>{`
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
          background: #050505;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          font-family: 'JetBrains Mono', monospace;
          overflow: hidden;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .night-vision {
          background:
            radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.2), transparent 55%),
            radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.18), transparent 60%),
            #03030b;
          color: #f1f5f9;
          text-shadow: 0 0 3px rgba(139, 92, 246, 0.2);
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
          border-color: rgba(139, 92, 246, 0.18);
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
          color: #cbd5e1;
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
          color: #ffffff !important;
        }

        .hud-header {
          min-height: 52px;
          height: auto;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 0.35rem 1rem;
          background: rgba(5, 6, 15, 0.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
          color: #fff;
          background: #dc2626;
          border-color: #fca5a5;
          box-shadow: 0 0 16px rgba(220, 38, 38, 0.5);
        }

        .night-vision .hud-pending-orbit.has-pending .hud-pending-orbit-num {
          color: #fff;
        }

        .night-vision .hud-pending-orbit:not(.has-pending) {
          border-color: rgba(139, 92, 246, 0.2);
        }

        .settings-overlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          background: rgba(0, 0, 0, 0.72);
          -webkit-backdrop-filter: blur(3px);
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
          border-color: rgba(139, 92, 246, 0.18);
          color: #f8fafc;
        }
        .night-vision .close-btn:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .settings-body {
          padding: 0.95rem 1rem 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          scrollbar-width: thin;
          scrollbar-color: #4a4a4a #0f0f0f;
        }
        .settings-body::-webkit-scrollbar {
          width: 8px;
        }
        .settings-body::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .settings-body::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .settings-body::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
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
          border: 1px solid rgba(255, 255, 255, 0.1);
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
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.06);
        }
        .night-vision .notif-permission-btn {
          border-color: rgba(139, 92, 246, 0.2);
          color: #f8fafc;
          background: rgba(139, 92, 246, 0.05);
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
          border: 1px solid rgba(255, 255, 255, 0.1);
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
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .hud-btn:hover {
          border-color: #4b5563;
          color: #f3f4f6;
        }
        .night-vision .hud-btn {
          border-color: rgba(139, 92, 246, 0.18);
          color: #f8fafc;
          background: rgba(139, 92, 246, 0.03);
        }
        .night-vision .hud-btn:hover,
        .night-vision .hud-btn.active {
          border-color: #8b5cf6;
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
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
          border-right: 1px solid rgba(255, 255, 255, 0.06);
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
          color: #d1d5db;
          cursor: pointer;
          position: relative;
          transition: color 0.15s ease, transform 0.12s ease, background 0.15s ease;
          padding: 8px;
          border-radius: 10px;
          min-width: 44px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .nav-item.active { color: #a78bfa; background: rgba(139, 92, 246, 0.12); }
        .nav-item:hover { color: #f3f4f6; background: rgba(255, 255, 255, 0.06); }
        .night-vision .nav-item:hover,
        .night-vision .nav-item.active {
          color: #c4b5fd;
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
        .nav-label {
          display: none;
        }

        .hud-content {
          padding: 1.35rem 1.4rem;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          scrollbar-width: thin;
          scrollbar-color: #4a4a4a #0f0f0f;
        }
        .hud-content::-webkit-scrollbar {
          width: 8px;
        }
        .hud-content::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .hud-content::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .hud-content::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }

        .hud-content h2 {
          font-size: 0.8rem;
          color: #555;
          text-transform: uppercase;
          margin-bottom: 1.4rem;
          letter-spacing: 2px;
        }
        .requests-title.night-glow {
          color: #c4b5fd !important;
          text-shadow: 0 0 7px rgba(139, 92, 246, 0.5), 0 0 16px rgba(139, 92, 246, 0.22);
        }

        .feed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .request-feed {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          min-width: 0;
        }
        .request-view-toggle {
          display: inline-flex;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          padding: 3px;
          gap: 4px;
          margin-bottom: 0;
          width: fit-content;
          max-width: 100%;
        }
        .clear-history-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .clear-history-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          min-height: 38px;
        }
        .clear-history-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .clear-history-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .light-mode .clear-history-btn {
          border-color: rgba(220, 38, 38, 0.25);
          background: rgba(220, 38, 38, 0.06);
          color: #dc2626;
        }
        .light-mode .clear-history-btn:hover {
          background: rgba(220, 38, 38, 0.12);
        }
        .live-inline-error,
        .max-requests-warning {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          width: 100%;
          border-radius: 10px;
          padding: 0.75rem 0.9rem;
          font-size: 0.78rem;
          line-height: 1.45;
          word-break: break-word;
        }
        .live-inline-error {
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
        }
        .max-requests-warning {
          border: 1px solid rgba(250, 204, 21, 0.35);
          background: rgba(250, 204, 21, 0.08);
          color: #fde68a;
        }

        .request-card {
          background: #080808;
          border: 1px solid #1a1a1a;
          padding: 1.25rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 0.75rem;
        }

        .request-card.waiter-tip {
          border-color: #22c55e;
          background: linear-gradient(145deg, rgba(34, 197, 94, 0.18), rgba(16, 185, 129, 0.08));
          box-shadow: 0 0 28px rgba(34, 197, 94, 0.2);
        }

        .req-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.7rem;
          margin-bottom: 0;
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

        .song-title {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .client-name {
          margin: 0;
          color: #94a3b8;
          overflow-wrap: anywhere;
        }

        .req-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: auto;
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
          min-height: 42px;
          min-width: 0;
        }
        .btn-hud:active {
          transform: scale(0.97);
        }
        .btn-hud:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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
          background: rgba(139, 92, 246, 0.1);
          color: #f8fafc;
          border-color: rgba(139, 92, 246, 0.2);
          box-shadow: none;
        }
        .night-vision .btn-hud.accept:hover {
          background: rgba(139, 92, 246, 0.18);
        }
        .night-vision .btn-hud.accept:active {
          background: rgba(139, 92, 246, 0.35);
          color: #fff;
          border-color: #8b5cf6;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.25);
          transform: scale(0.95);
        }
        .night-vision .btn-hud.skip {
          border-color: rgba(139, 92, 246, 0.18);
          color: #94a3b8;
        }
        .night-vision .btn-hud.skip:hover {
          background: rgba(139, 92, 246, 0.06);
          color: #cbd5e1;
        }
        .night-vision .btn-hud.skip:active {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border-color: rgba(139, 92, 246, 0.4);
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
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .night-vision .status-chip {
          background: rgba(139, 92, 246, 0.08);
          color: #cbd5e1;
          border-color: rgba(139, 92, 246, 0.18);
        }

        .setting-input {
          outline: none;
          transition: border-color 0.2s ease;
        }
        .setting-input:focus {
          border-color: #8b5cf6;
        }
        .setting-input::placeholder {
          color: #333;
        }
        .night-vision .setting-input {
          border-color: rgba(139, 92, 246, 0.18);
          background: rgba(139, 92, 246, 0.03);
          color: #e2e8f0;
        }
        .night-vision .setting-input::placeholder {
          color: #64748b;
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
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }
        .setting-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }

        .range-value {
          font-size: 0.85rem;
          font-weight: 800;
          color: #c4b5fd;
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
          background: #8b5cf6;
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
          border-color: #8b5cf6;
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
          border-color: #8b5cf6;
          color: #8b5cf6;
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
          gap: 0;
          padding: 0;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          background: #050505;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
          z-index: 24;
          overflow: hidden;
        }
        .repertoire-combo-sticky-search {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #050505;
          padding: 0.6rem 0.7rem 0.45rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          border-bottom: 1px solid #1a1a1a;
        }
        .repertoire-cat-scroll {
          display: flex;
          gap: 0.3rem;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding: 0.15rem 0;
        }
        .repertoire-cat-scroll::-webkit-scrollbar { display: none; }
        .repertoire-cat-chip {
          flex-shrink: 0;
          padding: 0.28rem 0.55rem;
          border-radius: 999px;
          border: 1px solid #1f2937;
          background: transparent;
          color: #6b7280;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .repertoire-cat-chip:hover {
          border-color: #374151;
          color: #9ca3af;
        }
        .repertoire-cat-chip.active {
          border-color: #8b5cf6;
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
        }
        .repertoire-combo-count {
          font-size: 0.62rem;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.04em;
        }
        .repertoire-dropdown-list {
          border: none;
          border-radius: 0 0 12px 12px;
          background: #0b0b0b;
          max-height: min(55dvh, 520px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #4a4a4a #0f0f0f;
          -webkit-overflow-scrolling: touch;
        }
        .repertoire-dropdown-item::-webkit-scrollbar {
          width: 8px;
        }
        .repertoire-dropdown-item::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .repertoire-dropdown-item::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .repertoire-dropdown-item::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
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
          border: 1px solid rgba(139, 92, 246, 0.35);
          background: rgba(139, 92, 246, 0.1);
          color: #f8fafc;
          font-size: 0.66rem;
          font-weight: 700;
        }
        .repertoire-dropdown-main:has(.song-in-setlist-pill) {
          border: 1px dashed rgba(139, 92, 246, 0.35);
        }
        .song-in-setlist-pill.removable {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .song-in-setlist-pill.removable:hover,
        .repertoire-dropdown-main:hover .song-in-setlist-pill.removable {
          background: rgba(239, 68, 68, 0.18);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
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
          scrollbar-color: #4a4a4a #0f0f0f;
        }
        .setlist-chip::-webkit-scrollbar,
        .active-setlist-item::-webkit-scrollbar {
          width: 8px;
        }
        .setlist-chip::-webkit-scrollbar-track,
        .active-setlist-item::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .setlist-chip::-webkit-scrollbar-thumb,
        .active-setlist-item::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .setlist-chip::-webkit-scrollbar-thumb:hover,
        .active-setlist-item::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        .setlist-chip,
        .active-setlist-item,
        .setlist-create-btn,
        .setlist-delete-btn,
        .song-add-to-setlist,
        .active-setlist-nav button,
        .setlist-item-actions button {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
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
        .night-vision .setlist-chip.active,
        .night-vision .active-setlist-item.active {
          border-color: #a78bfa;
          color: #fff;
          background: rgba(139, 92, 246, 0.18);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.3), inset 0 0 6px rgba(139, 92, 246, 0.1);
          font-weight: 700;
        }

        .setlist-chip-wrap {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 2px;
        }
        .chip-edit-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 0.3rem;
          opacity: 0.5;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .chip-edit-icon:hover {
          opacity: 1;
        }
        @media (max-width: 720px) {
          .chip-edit-icon {
            opacity: 0.7;
            padding: 4px;
            min-width: 24px;
            min-height: 24px;
          }
        }
        .setlist-chip-rename-input {
          font-family: inherit;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          border: 1.5px solid #8b5cf6;
          background: rgba(139, 92, 246, 0.12);
          color: #f1f5f9;
          outline: none;
          min-width: 80px;
          max-width: 180px;
          text-align: center;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.35);
        }
        .light-mode .setlist-chip-rename-input {
          background: #f5f3ff;
          border-color: #7c3aed;
          color: #1e1b4b;
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.15);
        }
        .night-vision .setlist-chip-rename-input {
          background: rgba(139, 92, 246, 0.15);
          border-color: #a78bfa;
          color: #fff;
        }
        .setlist-chip-wrap.is-live .setlist-chip {
          border-color: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
        }
        .setlist-chip-wrap.is-live .setlist-chip.active {
          border-color: #ef4444;
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.18);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
        }
        .live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          margin-right: 4px;
          animation: pulse 1s infinite alternate;
          vertical-align: middle;
        }
        .live-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          background: #111;
          color: #777;
          font-size: 0.55rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          transition: all 0.15s ease;
        }
        .live-toggle-btn.on {
          border-color: #ef4444;
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.15);
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.3);
        }
        .live-toggle-btn.on:hover {
          background: rgba(239, 68, 68, 0.25);
        }
        .live-toggle-btn.off:hover {
          border-color: #555;
          color: #aaa;
        }
        .live-toggle-btn.inline {
          padding: 3px 10px;
          font-size: 0.6rem;
        }
        .no-live-warning {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.7rem 1rem;
          margin-bottom: 0.75rem;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          font-size: 0.72rem;
          font-weight: 600;
          line-height: 1.4;
        }
        .night-vision .live-toggle-btn.on {
          border-color: #ff3333;
          color: #ff6666;
          background: rgba(255, 51, 51, 0.12);
        }
        .night-vision .setlist-chip-wrap.is-live .setlist-chip {
          border-color: #ff3333;
          box-shadow: 0 0 8px rgba(255, 51, 51, 0.3);
        }
        .night-vision .setlist-chip-wrap.is-live .setlist-chip.active {
          border-color: #ff3333;
          color: #ff6666;
          background: rgba(255, 51, 51, 0.15);
        }
        .night-vision .no-live-warning {
          border-color: rgba(255, 51, 51, 0.3);
          background: rgba(255, 51, 51, 0.06);
          color: #ff6666;
        }
        .night-vision .setlist-chip,
        .night-vision .active-setlist-item,
        .night-vision .setlist-create-btn,
        .night-vision .setlist-delete-btn,
        .night-vision .song-add-to-setlist,
        .night-vision .active-setlist-nav button,
        .night-vision .setlist-item-actions button {
          border-color: rgba(139, 92, 246, 0.22);
          color: #f8fafc;
          background: rgba(139, 92, 246, 0.05);
        }
        .night-vision .setlist-item-main {
          background: #0a0a0b;
          border-color: rgba(255, 255, 255, 0.06);
          color: #f1f5f9;
        }
        .night-vision .setlist-item-order {
          color: #a78bfa;
        }
        .night-vision .setlist-item-title {
          color: #f1f5f9;
        }
        .night-vision .active-setlist-strip {
          background: rgba(10, 10, 11, 0.7);
          border-color: rgba(255, 255, 255, 0.06);
        }
        .night-vision .setlist-name-input {
          background: #0a0a0b;
          border-color: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
        }
        .night-vision .setlists-empty {
          border-color: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
        }

        /* ── Night-vision: brighten all remaining dim elements ── */
        .night-vision .repertoire-cat-chip {
          border-color: rgba(139, 92, 246, 0.2);
          color: #cbd5e1;
        }
        .night-vision .repertoire-cat-chip:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #f1f5f9;
        }
        .night-vision .repertoire-cat-chip.active {
          border-color: #a78bfa;
          color: #f8fafc;
          background: rgba(139, 92, 246, 0.15);
        }
        .night-vision .repertoire-combo-toggle {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(5, 5, 15, 0.8);
          color: #e2e8f0;
        }
        .night-vision .repertoire-combo-toggle.open {
          border-color: #a78bfa;
          color: #f8fafc;
        }
        .night-vision .repertoire-combo-count {
          color: #cbd5e1;
        }
        .night-vision .repertoire-empty {
          color: #94a3b8;
        }
        .night-vision .repertoire-dropdown-main {
          color: #e2e8f0;
        }
        .night-vision .repertoire-dropdown-main:hover {
          background: rgba(139, 92, 246, 0.05);
        }
        .night-vision .repertoire-dropdown-item {
          border-bottom-color: rgba(255, 255, 255, 0.04);
        }
        .night-vision .song-open-lyrics-btn {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(139, 92, 246, 0.05);
          color: #e2e8f0;
        }
        .night-vision .song-open-lyrics-btn:hover {
          border-color: #a78bfa;
          color: #f8fafc;
        }
        .night-vision .setlists-panel-header h3,
        .night-vision .active-setlist-name {
          color: #e2e8f0;
        }
        .night-vision .setlist-status-row {
          color: #cbd5e1;
        }
        .night-vision .setlist-count-badge {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(139, 92, 246, 0.06);
          color: #e2e8f0;
        }
        .night-vision .repertoire-combo-sticky-search {
          background: rgba(5, 5, 15, 0.95);
          border-bottom-color: rgba(255, 255, 255, 0.06);
        }
        .night-vision .song-search-box {
          background: rgba(5, 5, 15, 0.8);
          color: #cbd5e1;
        }
        .night-vision .setlist-chip.active,
        .night-vision .active-setlist-item.active {
          border-color: #8b5cf6;
          color: #fff;
          background: rgba(139, 92, 246, 0.2);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3), inset 0 0 6px rgba(139, 92, 246, 0.1);
          font-weight: 700;
        }
        .setlist-create-btn,
        .setlist-delete-btn,
        .song-add-to-setlist,
        .active-setlist-nav button {
          padding: 0.52rem 0.72rem;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .night-vision .setlist-create-btn:hover,
        .night-vision .setlist-delete-btn:hover,
        .night-vision .song-add-to-setlist:hover:not(:disabled),
        .night-vision .setlist-chip:hover,
        .night-vision .active-setlist-item:hover,
        .night-vision .active-setlist-nav button:hover:not(:disabled),
        .night-vision .setlist-item-actions button:hover {
          border-color: #8b5cf6;
          color: #f8fafc;
        }
        .night-vision .setlist-create-btn:active,
        .night-vision .setlist-delete-btn:active,
        .night-vision .song-add-to-setlist:active:not(:disabled),
        .night-vision .setlist-chip:active,
        .night-vision .active-setlist-item:active,
        .night-vision .active-setlist-nav button:active:not(:disabled),
        .night-vision .setlist-item-actions button:active {
          background: rgba(139, 92, 246, 0.18);
          border-color: #8b5cf6;
          color: #fff;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
          transform: scale(0.95);
        }
        .song-add-to-setlist:disabled,
        .active-setlist-nav button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .setlists-empty {
          border: 1px dashed #e2e8f0;
          border-radius: 10px;
          padding: 1rem;
          color: #64748b;
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
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #0f172a;
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
          scrollbar-color: #4a4a4a #0f0f0f;
        }
        .setlist-items-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .setlist-items-scroll::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .setlist-items-scroll::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .setlist-items-scroll::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        .setlist-item-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.5rem;
          align-items: stretch;
        }
        .night-vision .setlist-item-row.just-added .setlist-item-main {
          border-color: rgba(139, 92, 246, 0.55);
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.25) inset;
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
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #0f172a;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }
        .night-vision .setlist-item-main:hover {
          border-color: rgba(139, 92, 246, 0.3);
          background: #0e0e10;
        }
        .night-vision .setlist-item-main:active {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
          transform: scale(0.98);
        }
        .setlist-item-order {
          color: #7c3aed;
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
          color: #0f172a;
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
          border: none;
          border-radius: 12px;
          background: transparent;
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
          color: #8b5cf6;
          border-bottom: 1px solid #1a1a1a;
        }
        .cheatsheet-setlist-toggle:active {
          background: rgba(139, 92, 246, 0.1);
          transform: scale(0.98);
        }
        .cheatsheet-chevron {
          transition: transform 0.2s ease;
          color: #555;
          flex-shrink: 0;
        }
        .cheatsheet-chevron.open {
          transform: rotate(180deg);
          color: #8b5cf6;
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
          background: rgba(139, 92, 246, 0.1);
        }
        .cheatsheet-song-item.active {
          background: rgba(139, 92, 246, 0.08);
          color: #a78bfa;
        }
        .cheatsheet-song-num {
          color: #a78bfa;
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
          border-color: rgba(139, 92, 246, 0.12);
        }
        .night-vision .cheatsheet-setlist-toggle {
          color: #e2e8f0;
        }
        .night-vision .cheatsheet-setlist-toggle:hover {
          color: #fff;
          background: rgba(139, 92, 246, 0.06);
        }
        .night-vision .cheatsheet-setlist-toggle.expanded {
          color: #f8fafc;
          border-bottom-color: rgba(139, 92, 246, 0.18);
        }
        .night-vision .cheatsheet-song-item {
          color: #e2e8f0;
          border-top-color: rgba(255, 255, 255, 0.06);
        }
        .night-vision .cheatsheet-song-item:hover {
          background: rgba(139, 92, 246, 0.06);
          color: #fff;
        }
        .night-vision .cheatsheet-song-item.active {
          background: rgba(139, 92, 246, 0.12);
          color: #fff;
        }

        .song-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.08);
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
          margin: 0 auto 0.9rem;
          position: relative;
        }
        .cheatsheet-nav .detail-title {
          text-align: center;
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
          color: #8b5cf6;
          background: #121212;
        }
        .night-vision .song-dropdown-toggle {
          color: #f8fafc;
          border-left-color: rgba(139, 92, 246, 0.18);
          background: rgba(139, 92, 246, 0.03);
        }
        .night-vision .song-search-inline {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(0, 0, 0, 0.72);
        }
        .night-vision .song-search-inline:focus-within {
          border-color: rgba(139, 92, 246, 0.55);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.14);
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
          scrollbar-width: thin;
          scrollbar-color: #4a4a4a #0f0f0f;
        }
        .song-dropdown-list::-webkit-scrollbar {
          width: 8px;
        }
        .song-dropdown-list::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .song-dropdown-list::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .song-dropdown-list::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
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

        /* ── Dropdown section labels + global pesmarica items ── */
        .dropdown-section-label {
          padding: 6px 12px 4px;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8b5cf6;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          user-select: none;
        }
        .pesmarica-label {
          color: #f59e0b;
          border-bottom-color: rgba(245, 158, 11, 0.15);
          margin-top: 4px;
        }
        .dropdown-loading-dot {
          margin-left: 4px;
          animation: blink-dot 1s steps(3, end) infinite;
        }
        @keyframes blink-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .song-dropdown-item.global-item {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          padding: 6px 12px;
          border-left: 2px solid rgba(245, 158, 11, 0.25);
        }
        .song-dropdown-item.global-item:hover {
          border-left-color: #f59e0b;
        }
        .global-song-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: none;
          border: none;
          color: inherit;
          text-align: left;
          cursor: pointer;
          padding: 4px 0;
        }
        .global-add-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
          color: #22c55e;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .global-add-btn:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.18);
          border-color: #22c55e;
          color: #4ade80;
        }
        .global-add-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .spin-icon {
          animation: spin-anim 0.8s linear infinite;
        }
        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Night vision overrides */
        .night-vision .dropdown-section-label {
          color: #a78bfa;
          border-bottom-color: rgba(139, 92, 246, 0.15);
        }
        .night-vision .pesmarica-label {
          color: #fbbf24;
          border-bottom-color: rgba(251, 191, 36, 0.15);
        }
        .night-vision .global-item {
          border-left-color: rgba(251, 191, 36, 0.2);
        }
        .night-vision .global-item:hover {
          border-left-color: #fbbf24;
        }

        /* Light mode overrides */
        .light-mode .dropdown-section-label {
          color: #7c3aed;
          border-bottom-color: rgba(124, 58, 237, 0.12);
        }
        .light-mode .pesmarica-label {
          color: #d97706;
          border-bottom-color: rgba(217, 119, 6, 0.12);
        }
        .light-mode .global-item {
          border-left-color: rgba(217, 119, 6, 0.2);
        }
        .light-mode .global-item:hover {
          border-left-color: #d97706;
        }
        .light-mode .global-add-btn {
          border-color: rgba(22, 163, 74, 0.3);
          background: rgba(22, 163, 74, 0.06);
          color: #16a34a;
        }
        .light-mode .global-add-btn:hover:not(:disabled) {
          background: rgba(22, 163, 74, 0.14);
          border-color: #16a34a;
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
          color: #e2e8f0;
        }
        .night-vision .song-search-input::placeholder {
          color: #94a3b8;
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
          scrollbar-color: #4a4a4a #0f0f0f;
        }
        .song-picker-list::-webkit-scrollbar {
          width: 8px;
        }
        .song-picker-list::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .song-picker-list::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .song-picker-list::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
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
          border-color: rgba(255, 255, 255, 0.1);
        }
        .song-picker-item.has-lyrics {
          border-left: 3px solid #8b5cf6;
        }
        .night-vision .song-picker-item.has-lyrics {
          box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.08);
        }
        .night-vision .song-picker-item {
          border-color: rgba(255, 255, 255, 0.06);
          background: rgba(5, 5, 15, 0.6);
          color: #e2e8f0;
        }
        .night-vision .song-picker-item:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.2);
        }
        .night-vision .song-picker-artist {
          color: #94a3b8;
        }
        .night-vision .genre-tag {
          background: rgba(139, 92, 246, 0.08);
          color: #94a3b8;
        }
        .night-vision .song-loading {
          color: #94a3b8;
        }
        .night-vision .song-dropdown-artist {
          color: #94a3b8;
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
          color: #8b5cf6;
          padding: 2px 8px;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.2);
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
          background: #8b5cf6;
          border-color: #8b5cf6;
          text-shadow: none;
        }
        .night-vision .no-lyrics-tag {
          color: #94a3b8;
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
        .back-to-list:hover { color: #8b5cf6; }

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
          background: rgba(239, 68, 68, 0.12);
          border: 1.5px solid rgba(239, 68, 68, 0.5);
          border-radius: 8px;
          color: #fca5a5;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          font-weight: 900;
          padding: 0.45rem 0.75rem;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .cheatsheet-back-btn:hover {
          color: #ffffff;
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.7);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
        }
        .cheatsheet-back-btn:active {
          background: rgba(239, 68, 68, 0.35);
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
        .add-to-repertoire-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
          margin-top: 0.5rem;
        }
        .add-rep-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #86efac;
        }
        .add-rep-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: filter 0.15s;
          white-space: nowrap;
          min-height: 34px;
        }
        .add-rep-btn:hover {
          filter: brightness(1.1);
        }
        .add-rep-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .light-mode .add-to-repertoire-banner {
          border-color: rgba(34, 197, 94, 0.25);
          background: rgba(34, 197, 94, 0.05);
        }
        .light-mode .add-rep-label {
          color: #15803d;
        }
        .added-to-rep-toast {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.4);
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
          font-size: 0.78rem;
          font-weight: 700;
          margin-top: 0.5rem;
          animation: toastFadeIn 0.3s ease;
        }
        .light-mode .added-to-rep-toast {
          background: rgba(34, 197, 94, 0.08);
          border-color: rgba(34, 197, 94, 0.3);
          color: #15803d;
        }
        @keyframes toastFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .night-vision .cheatsheet-back-btn {
          border-color: rgba(239, 68, 68, 0.45);
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }
        .night-vision .cheatsheet-back-btn:hover {
          color: #ffffff;
          border-color: rgba(239, 68, 68, 0.7);
          background: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
        }
        .night-vision .cheatsheet-song-header {
          border-bottom-color: rgba(139, 92, 246, 0.1);
        }
        .night-vision .cheatsheet-now-title {
          color: #e2e8f0;
        }
        .night-vision .cheatsheet-now-artist {
          color: #94a3b8;
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
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #eee;
          padding: 10px 12px;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          outline: none;
        }
        .song-select:focus {
          border-color: #8b5cf6;
        }
        .key-badge {
          font-size: 0.65rem;
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.15);
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
          scrollbar-width: thin;
          scrollbar-color: #4a4a4a #0f0f0f;
          width: 100%;
          max-width: 100%;
          padding: 0;
        }
        .lyrics-inner {
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          padding: 0 1.5rem 1rem;
        }
        @media (max-width: 640px) {
          .lyrics-inner {
            padding: 0 0.75rem 0.75rem;
          }
        }
        .lyrics-display::-webkit-scrollbar {
          width: 8px;
        }
        .lyrics-display::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 4px;
        }
        .lyrics-display::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        .lyrics-display::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        .lyrics-line {
          margin-bottom: 2px;
          min-height: 1.55em;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .cheatsheet-tools {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .cheat-tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          color: #cbd5e1;
          padding: 0.4rem 0.65rem;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.7rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: 0.18s ease;
          min-height: 34px;
        }
        .cheat-tool-btn:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .cheat-tool-btn.active {
          background: rgba(139, 92, 246, 0.08);
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .cheat-tool-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .cheat-transpose {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 0.2rem 0.35rem;
        }
        .cheat-transpose button {
          background: transparent;
          border: none;
          color: #cbd5e1;
          font-weight: 900;
          font-size: 0.78rem;
          cursor: pointer;
          padding: 0.25rem 0.45rem;
          border-radius: 6px;
          min-width: 30px;
          min-height: 28px;
          transition: 0.15s ease;
        }
        .cheat-transpose button:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .cheat-key {
          color: #8b5cf6;
          font-weight: 950;
          font-size: 0.88rem;
          min-width: 22px;
          text-align: center;
          padding: 0 0.25rem;
        }
        .cheat-edit-area {
          flex: 1;
          width: 100%;
          background: #050505;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          font-family: 'Courier New', monospace;
          font-size: 0.95rem;
          line-height: 1.6;
          padding: 1rem;
          outline: none;
          resize: none;
          border-radius: 8px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.4) transparent;
        }
        .cheat-edit-area:focus { border-color: #8b5cf6; }
        .cheat-edit-area::-webkit-scrollbar { width: 8px; }
        .cheat-edit-area::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.35);
          border-radius: 999px;
        }
        .cheat-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.6rem 0.2rem 0;
          margin-top: 0.4rem;
          border-top: 1px solid #1a1a1a;
          flex-shrink: 0;
        }
        .cheat-speed {
          display: flex;
          gap: 0.3rem;
        }
        .cheat-speed button {
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          color: #64748b;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          font-weight: 800;
          font-size: 0.7rem;
          cursor: pointer;
          transition: 0.15s ease;
          min-height: 32px;
        }
        .cheat-speed button:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .cheat-speed button.active {
          background: #8b5cf6;
          color: #000;
          border-color: #8b5cf6;
        }
        .cheat-play-btn {
          background: #8b5cf6;
          color: #000;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: 0.18s ease;
          box-shadow: 0 0 18px rgba(139, 92, 246, 0.35);
        }
        .cheat-play-btn:hover { transform: scale(1.06); }
        .cheat-play-btn:active { transform: scale(0.97); }
        .cheat-status {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: right;
          font-size: 0.6rem;
          font-weight: 900;
          color: #4b5563;
          letter-spacing: 0.08em;
        }
        .cheat-status span:first-child { color: #8b5cf6; }
        @media (max-width: 640px) {
          .cheatsheet-tools {
            width: 100%;
            justify-content: flex-start;
            margin-left: 0;
          }
          .cheat-tool-label {
            display: none;
          }
          .cheat-tool-btn {
            padding: 0.4rem 0.55rem;
          }
          .cheat-footer {
            padding: 0.5rem 0 0;
          }
          .cheat-play-btn {
            width: 40px;
            height: 40px;
          }
          .cheat-speed button {
            padding: 0.3rem 0.5rem;
            font-size: 0.68rem;
          }
          .cheat-status {
            font-size: 0.55rem;
          }
        }

        .chord-inline {
          color: #8b5cf6;
          font-weight: 900;
          margin: 0 2px;
          font-size: 0.85em;
          text-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
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
          border: 1px solid rgba(139, 92, 246, 0.35);
          background: rgba(139, 92, 246, 0.08);
          color: #8b5cf6;
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
          background: rgba(139, 92, 246, 0.16);
          border-color: rgba(139, 92, 246, 0.6);
        }

        /* ======= MOBILE METRICS STRIP (visible only ≤900px) ======= */
        .mobile-metrics-strip {
          display: none; /* hidden on desktop */
        }

        /* ======= BREAK MODE BANNER ======= */
        .break-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.65rem 1rem;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.92), rgba(217, 119, 6, 0.92));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #000;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          box-shadow: 0 -4px 24px rgba(245, 158, 11, 0.35);
        }
        .break-banner-label {
          text-transform: uppercase;
        }
        .break-banner-timer {
          font-size: 0.85rem;
          font-weight: 900;
        }
        .break-banner-end {
          border: 2px solid #000;
          background: rgba(0, 0, 0, 0.15);
          color: #000;
          padding: 0.4rem 1rem;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
          text-transform: uppercase;
          min-height: 36px;
        }
        .break-banner-end:hover {
          background: #000;
          color: #f59e0b;
        }

        /* ======= BREAK BUTTON IN HEADER ======= */
        .hud-btn.break-btn {
          border-color: rgba(245, 158, 11, 0.35);
          color: #f59e0b;
        }
        .hud-btn.break-btn:hover {
          border-color: #f59e0b;
          color: #fbbf24;
        }
        .hud-btn.break-active {
          background: rgba(245, 158, 11, 0.15) !important;
          border-color: #f59e0b !important;
          color: #fbbf24 !important;
          animation: break-pulse 2s ease-in-out infinite;
        }
        .break-timer-inline {
          font-size: 0.7rem;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }
        @keyframes break-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          50% { box-shadow: 0 0 12px 2px rgba(245, 158, 11, 0.25); }
        }

        /* ======= METRICS: TIPS, BREAK, WAKE LOCK ======= */
        .metric-tips .value {
          color: #22c55e !important;
        }
        .night-vision .metric-tips .value {
          color: #4ade80 !important;
          text-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
        }
        .metric-break .value {
          color: #f59e0b !important;
        }
        .wl-on { color: #22c55e !important; }
        .wl-off { color: #6b7280 !important; }
        .night-vision .wl-on {
          color: #4ade80 !important;
          text-shadow: 0 0 6px rgba(74, 222, 128, 0.3);
        }

        /* ======= CHEATSHEET PREV/NEXT ARROWS ======= */
        .cheatsheet-nav-arrows {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .cheatsheet-arrow-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: 1.5px solid rgba(59, 130, 246, 0.5);
          border-radius: 10px;
          background: rgba(59, 130, 246, 0.1);
          color: #93c5fd;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .cheatsheet-arrow-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #ffffff;
          background: rgba(59, 130, 246, 0.2);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
        }
        .cheatsheet-arrow-btn:active:not(:disabled) {
          transform: scale(0.92);
          background: rgba(59, 130, 246, 0.3);
        }
        .cheatsheet-arrow-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .cheatsheet-song-counter {
          font-size: 0.68rem;
          font-weight: 800;
          color: #8b5cf6;
          min-width: 2.5rem;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .light-mode .cheatsheet-arrow-btn {
          border-color: rgba(59, 130, 246, 0.35);
          background: rgba(59, 130, 246, 0.06);
          color: #2563eb;
        }
        .light-mode .cheatsheet-arrow-btn:hover:not(:disabled) {
          border-color: #2563eb;
          color: #ffffff;
          background: rgba(37, 99, 235, 0.85);
        }

        /* Mobile/tablet: larger touch targets */
        @media (max-width: 768px) {
          .cheatsheet-back-btn {
            padding: 0.5rem 0.85rem;
            font-size: 0.73rem;
            min-height: 38px;
          }
          .cheatsheet-arrow-btn {
            width: 42px;
            height: 42px;
          }
          .cheatsheet-song-header {
            gap: 0.5rem;
            flex-wrap: wrap;
          }
        }
        @media (max-width: 480px) {
          .cheatsheet-back-btn {
            padding: 0.55rem 0.7rem;
            font-size: 0.7rem;
            min-height: 40px;
          }
          .cheatsheet-arrow-btn {
            width: 44px;
            height: 44px;
            border-radius: 12px;
          }
          .cheatsheet-nav-arrows {
            gap: 0.35rem;
          }
          .cheatsheet-song-counter {
            font-size: 0.72rem;
            min-width: 2.8rem;
          }
        }

        /* ======= SETLIST PLAYED PROGRESS ======= */
        .setlist-played-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          transition: all 0.15s ease;
        }
        .setlist-played-btn:hover {
          color: #22c55e !important;
          border-color: rgba(34, 197, 94, 0.5) !important;
        }
        .setlist-played-btn.is-played {
          color: #22c55e !important;
          border-color: rgba(34, 197, 94, 0.45) !important;
          background: rgba(34, 197, 94, 0.1) !important;
        }
        .night-vision .setlist-played-btn.is-played {
          color: #4ade80 !important;
          border-color: rgba(74, 222, 128, 0.35) !important;
          background: rgba(74, 222, 128, 0.08) !important;
        }
        .setlist-item-main.played {
          opacity: 0.55;
        }
        .played-through {
          text-decoration: line-through;
          text-decoration-color: rgba(139, 92, 246, 0.45);
        }
        .setlist-progress-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
          color: #22c55e;
          font-size: 0.68rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .night-vision .setlist-progress-badge {
          color: #4ade80;
          border-color: rgba(74, 222, 128, 0.25);
          background: rgba(74, 222, 128, 0.06);
        }
        .light-mode .setlist-progress-badge {
          color: #16a34a;
          border-color: rgba(22, 163, 74, 0.3);
          background: rgba(22, 163, 74, 0.08);
        }
        .light-mode .setlist-played-btn.is-played {
          color: #16a34a !important;
          border-color: rgba(22, 163, 74, 0.35) !important;
          background: rgba(22, 163, 74, 0.08) !important;
        }
        .light-mode .setlist-item-main.played {
          opacity: 0.5;
        }
        .light-mode .played-through {
          text-decoration-color: rgba(124, 58, 237, 0.4);
        }
        .light-mode .metric-tips .value {
          color: #16a34a !important;
        }
        .light-mode .wl-on {
          color: #16a34a !important;
        }
        .light-mode .break-btn {
          border-color: rgba(217, 119, 6, 0.35);
          color: #d97706;
        }
        .light-mode .break-btn:hover {
          border-color: #d97706;
        }
        .light-mode .break-active {
          background: rgba(245, 158, 11, 0.12) !important;
          border-color: #d97706 !important;
          color: #d97706 !important;
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
          .mobile-metrics-strip {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 0.3rem 0.75rem;
            background: rgba(5, 6, 15, 0.65);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.65rem;
            font-weight: 700;
            color: rgba(226, 232, 240, 0.7);
            letter-spacing: 0.04em;
            flex-shrink: 0;
            flex-wrap: wrap;
          }
          .mms-item {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            white-space: nowrap;
          }
          .mms-tips {
            color: #4ade80;
          }
          .mms-wl {
            color: #4ade80;
            opacity: 0.7;
          }
          .night-vision .mobile-metrics-strip {
            background: rgba(3, 3, 11, 0.6);
            border-bottom-color: rgba(139, 92, 246, 0.1);
          }
          .light-mode .mobile-metrics-strip {
            background: rgba(255, 255, 255, 0.6);
            border-bottom-color: #e5e7eb;
            color: #64748b;
          }
          .light-mode .mms-tips {
            color: #16a34a;
          }
          .light-mode .mms-wl {
            color: #16a34a;
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
          .hud-btn.break-active .break-timer-inline {
            display: inline;
            font-size: 0.62rem;
          }
          .break-banner {
            bottom: calc(56px + env(safe-area-inset-bottom, 0px));
            padding: 0.45rem 0.75rem;
            font-size: 0.7rem;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
          }
          .break-banner-end {
            padding: 0.35rem 0.8rem;
            font-size: 0.65rem;
            min-height: 34px;
          }
          .cheatsheet-nav-arrows {
            gap: 0.15rem;
          }
          .cheatsheet-arrow-btn {
            width: 38px;
            height: 38px;
          }
          .cheatsheet-song-counter {
            font-size: 0.62rem;
            min-width: 2rem;
          }
          .add-to-repertoire-banner {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.55rem 0.75rem;
          }
          .add-rep-label {
            font-size: 0.72rem;
            text-align: center;
          }
          .add-rep-btn {
            justify-content: center;
            min-height: 40px;
            font-size: 0.78rem;
          }
          .added-to-rep-toast {
            font-size: 0.75rem;
            padding: 0.45rem 0.7rem;
          }
          .clear-history-row {
            justify-content: center;
          }
          .clear-history-btn {
            width: 100%;
            justify-content: center;
            min-height: 42px;
          }
          .setlist-item-actions {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.4rem;
          }
          .setlist-played-btn {
            min-height: 40px;
          }
          .global-add-btn {
            width: 38px;
            height: 38px;
          }
          .hud-exit-x {
            min-width: 44px;
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
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            gap: 0;
            flex-shrink: 0;
          }
          .nav-item {
            flex: 1;
            max-width: 120px;
            flex-direction: column;
            gap: 2px;
          }
          .nav-item .nav-tooltip {
            display: none;
          }
          .nav-label {
            display: block;
            font-size: 0.6rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            opacity: 0.7;
          }
          .nav-item.active .nav-label {
            opacity: 1;
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
            text-align: center;
          }
          .request-view-toggle {
            justify-content: center;
          }
          .song-picker .setlists-selector {
            justify-content: flex-start;
            padding: 0 0.1rem 0.25rem;
          }
          .setlist-chip-rename-input {
            min-height: 38px;
            font-size: 0.75rem;
            max-width: 200px;
          }
          .repertoire-browser-head {
            justify-content: center;
            text-align: center;
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
            grid-template-columns: repeat(4, 1fr);
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
            padding: 0;
            border-radius: 8px;
            box-shadow: none;
          }
          .repertoire-combo-sticky-search {
            padding: 0.5rem 0.55rem 0.4rem;
          }
          .repertoire-cat-chip {
            padding: 0.35rem 0.6rem;
            font-size: 0.65rem;
            min-height: 32px;
          }
          .repertoire-combo-toggle {
            min-height: 44px;
            padding: 0.72rem 0.78rem;
            font-size: 0.78rem;
          }
          .repertoire-dropdown-list {
            max-height: min(50dvh, 420px);
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
            text-shadow: 0 0 3px rgba(139, 92, 246, 0.35);
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

        /* Landscape telefon: sidebar → donji bar */
        @media (max-width: 900px) and (max-height: 500px) and (orientation: landscape) {
          .hud-main {
            display: flex;
            flex-direction: column;
            grid-template-columns: unset;
          }
          .hud-content {
            order: 1;
            flex: 1;
            min-height: 0;
            padding: 0.5rem 0.75rem;
          }
          .hud-side-nav {
            order: 2;
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            width: 100%;
            padding: 0.25rem 0.25rem calc(0.25rem + env(safe-area-inset-bottom, 0px));
            border-right: none;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            gap: 0;
            flex-shrink: 0;
          }
          .nav-item {
            flex: 1;
            max-width: 120px;
            flex-direction: column;
            gap: 2px;
          }
          .nav-item .nav-tooltip {
            display: none;
          }
          .nav-label {
            display: block;
            font-size: 0.55rem;
            font-weight: 700;
            opacity: 0.7;
          }
          .nav-item.active .nav-label {
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .hud-controls {
            gap: 0.25rem;
          }
          .hud-btn {
            padding: 6px 8px;
            min-height: 40px;
            min-width: 40px;
          }
          .mobile-metrics-strip {
            font-size: 0.58rem;
            gap: 0.6rem;
            padding: 0.25rem 0.5rem;
          }
          .setlist-chip-rename-input {
            font-size: 0.68rem;
            padding: 0.3rem 0.55rem;
            min-width: 70px;
            max-width: 150px;
          }
          .global-add-btn {
            width: 36px;
            height: 36px;
          }
          .dropdown-section-label {
            font-size: 0.58rem;
            padding: 5px 10px 3px;
          }
          .status-indicator span {
            max-width: min(34vw, 7.5rem);
          }
          .request-view-toggle {
            width: 100%;
          }
          .mini-tab {
            flex: 1;
            text-align: center;
          }
          .feed-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .request-card {
            padding: 0.8rem;
            border-radius: 10px;
          }
          .req-header {
            flex-direction: column;
            align-items: stretch;
          }
          .req-header-right {
            justify-content: flex-start;
          }
          .req-actions {
            flex-direction: column;
          }
          .btn-hud,
          .status-chip {
            width: 100%;
            justify-content: center;
            text-align: center;
          }
          .live-inline-error,
          .max-requests-warning {
            padding: 0.7rem 0.8rem;
            font-size: 0.74rem;
          }
          .add-to-repertoire-banner {
            padding: 0.5rem 0.6rem;
            gap: 0.4rem;
            border-radius: 8px;
          }
          .add-rep-label {
            font-size: 0.68rem;
          }
          .add-rep-btn {
            font-size: 0.72rem;
            padding: 0.4rem 0.7rem;
            min-height: 38px;
          }
          .clear-history-btn {
            font-size: 0.72rem;
            padding: 0.4rem 0.75rem;
            min-height: 40px;
          }
          .added-to-rep-toast {
            font-size: 0.7rem;
            padding: 0.4rem 0.6rem;
            gap: 0.3rem;
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
          .hud-pending-orbit.has-pending,
          .hud-btn.break-active {
            animation: none !important;
          }
          .settings-overlay {
            animation: none;
          }
          .settings-panel {
            animation: none;
          }
        }

        /* Help panel */
        .help-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .help-section {
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          background: #070707;
          padding: 0.85rem 1rem;
        }
        .help-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem;
          font-size: 0.85rem;
          color: #8b5cf6;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 800;
        }
        .help-section p {
          margin: 0 0 0.55rem;
          color: #cbd5e1;
          font-size: 0.82rem;
          line-height: 1.55;
        }
        .help-section ul {
          margin: 0;
          padding-left: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .help-section li {
          color: #d1d5db;
          font-size: 0.78rem;
          line-height: 1.5;
        }
        .help-section strong {
          color: #f3f4f6;
        }
        .help-tip {
          border-color: rgba(139, 92, 246, 0.25);
          background: rgba(139, 92, 246, 0.04);
        }
        .night-vision .help-section p,
        .night-vision .help-section li {
          color: #cbd5e1;
        }
        .night-vision .help-section strong {
          color: #e2e8f0;
        }

        /* =====================================================
           LIGHT MODE (Night Vision OFF) — brand-consistent theme.
           Uses same palette as rest of site: soft white/slate bg,
           glass-card surfaces, purple (#8b5cf6) accents.
           ===================================================== */
        .light-mode {
          background:
            radial-gradient(1200px 600px at 15% -10%, rgba(139, 92, 246, 0.08), transparent 55%),
            radial-gradient(900px 500px at 100% 100%, rgba(99, 102, 241, 0.06), transparent 60%),
            linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
          color: #0f172a;
          font-family: 'Inter', system-ui, sans-serif;
          text-shadow: none;
        }
        .light-mode .hud-header {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom-color: rgba(148, 163, 184, 0.22);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .light-mode .status-indicator {
          color: #334155;
          background: rgba(139, 92, 246, 0.07);
          border: 1px solid rgba(139, 92, 246, 0.18);
          border-radius: 999px;
        }
        .light-mode .status-indicator .pulse-dot {
          background: #8b5cf6;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.55);
        }
        .light-mode .hud-btn {
          background: rgba(255, 255, 255, 0.85);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          border-color: rgba(148, 163, 184, 0.25);
          color: #475569;
          border-radius: 10px;
        }
        .light-mode .hud-btn:hover {
          border-color: rgba(139, 92, 246, 0.45);
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.06);
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.1);
        }
        .light-mode .hud-btn.active {
          border-color: rgba(139, 92, 246, 0.55);
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }
        .light-mode .hud-btn.settings-active {
          background: #ef4444 !important;
          color: #fff !important;
          border-color: #ef4444 !important;
        }
        .light-mode .exit-btn {
          border-color: rgba(239, 68, 68, 0.45);
          color: #dc2626;
          background: rgba(255, 255, 255, 0.85);
        }
        .light-mode .exit-btn:hover {
          background: #ef4444;
          color: #fff;
          border-color: #ef4444;
        }
        .light-mode .hud-pending-orbit {
          background: rgba(254, 226, 226, 0.7);
          border-color: rgba(252, 165, 165, 0.6);
        }
        .light-mode .hud-pending-orbit-num {
          color: #b91c1c;
        }
        .light-mode .hud-pending-orbit.has-pending {
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          border-color: #ef4444;
        }

        /* Sidebar nav */
        .light-mode .hud-side-nav {
          background: rgba(255, 255, 255, 0.7);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          border-right: 1px solid rgba(148, 163, 184, 0.22);
        }
        .light-mode .nav-item {
          color: #64748b;
          background: transparent;
          border-radius: 10px;
        }
        .light-mode .nav-item:hover {
          background: rgba(139, 92, 246, 0.07);
          color: #8b5cf6;
        }
        .light-mode .nav-item.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.14), rgba(99, 102, 241, 0.1));
          color: #7c3aed;
          box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.22);
        }
        .light-mode .nav-item .badge {
          background: #ef4444;
          color: #fff;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
        }
        .light-mode .nav-tooltip {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
        }

        /* Main content */
        .light-mode .hud-content {
          background: transparent;
          color: #0f172a;
        }
        .light-mode .hud-content h2,
        .light-mode .detail-title {
          color: #0f172a;
        }
        .light-mode .detail-artist,
        .light-mode .setting-hint,
        .light-mode .setlist-help-text,
        .light-mode .setlist-item-artist,
        .light-mode .song-picker-artist,
        .light-mode .song-dropdown-artist,
        .light-mode .cheatsheet-now-artist {
          color: #64748b;
        }

        /* Request cards — glass style matching site */
        .light-mode .request-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(139, 92, 246, 0.04);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .light-mode .request-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05), 0 12px 32px rgba(139, 92, 246, 0.08);
          transform: translateY(-1px);
        }
        .light-mode .request-card.waiter-tip {
          background: linear-gradient(135deg, rgba(255, 251, 235, 0.95), rgba(254, 243, 199, 0.85));
          border-color: rgba(251, 191, 36, 0.5);
        }
        .light-mode .req-header .time {
          color: #64748b;
        }
        .light-mode .req-header .table-num,
        .light-mode .song-title {
          color: #0f172a;
        }
        .light-mode .artist-name {
          color: #64748b;
        }
        .light-mode .tip-amount {
          color: #16a34a;
        }
        .light-mode .status-chip {
          background: #f1f5f9;
          color: #475569;
        }
        .light-mode .status-chip.accepted {
          background: rgba(22, 163, 74, 0.1);
          color: #15803d;
        }
        .light-mode .status-chip.rejected {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
        }
        .light-mode .status-chip.played {
          background: rgba(124, 58, 237, 0.1);
          color: #6d28d9;
        }

        /* Action buttons */
        .light-mode .btn-hud {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.25);
          color: #475569;
          border-radius: 10px;
          font-weight: 700;
        }
        .light-mode .btn-hud:hover {
          border-color: rgba(148, 163, 184, 0.5);
          background: rgba(248, 250, 252, 0.95);
        }
        .light-mode .btn-hud.accept {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
        }
        .light-mode .btn-hud.accept:hover {
          background: linear-gradient(135deg, #16a34a, #15803d);
          box-shadow: 0 6px 18px rgba(22, 163, 74, 0.35);
        }
        .light-mode .btn-hud.reject {
          background: rgba(255, 255, 255, 0.9);
          color: #dc2626;
          border-color: rgba(239, 68, 68, 0.4);
        }
        .light-mode .btn-hud.reject:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }
        .light-mode .btn-hud.played {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .light-mode .btn-hud.played:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          box-shadow: 0 6px 18px rgba(139, 92, 246, 0.4);
        }
        .light-mode .request-view-toggle button {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.22);
          color: #64748b;
          border-radius: 999px;
        }
        .light-mode .request-view-toggle button.active {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .night-vision .request-view-toggle {
          border-color: rgba(139, 92, 246, 0.15);
        }
        .night-vision .request-view-toggle button {
          background: transparent;
          border: 1px solid rgba(139, 92, 246, 0.15);
          color: #94a3b8;
          border-radius: 999px;
          font-weight: 700;
          padding: 0.4rem 0.85rem;
          font-size: 0.72rem;
          cursor: pointer;
        }
        .night-vision .request-view-toggle button.active {
          background: rgba(139, 92, 246, 0.18);
          color: #f8fafc;
          border-color: #a78bfa;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
        }

        /* Right metrics panel */
        .light-mode .hud-metrics {
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-left: 1px solid rgba(148, 163, 184, 0.22);
        }
        .light-mode .metric-box {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 14px;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .light-mode .metric-box .label {
          color: #64748b;
        }
        .light-mode .metric-box .value {
          color: #7c3aed;
        }

        /* Lyrics / cheatsheet */
        .light-mode .lyrics-display {
          color: #0f172a;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .light-mode .lyrics-display::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .light-mode .lyrics-display::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        .light-mode .chord-inline {
          color: #7c3aed;
          text-shadow: none;
          background: rgba(124, 58, 237, 0.08);
          padding: 0 4px;
          border-radius: 4px;
        }
        .light-mode .cheatsheet-song-header {
          border-bottom-color: #e5e7eb;
        }
        .light-mode .cheatsheet-now-title {
          color: #0f172a;
        }
        .light-mode .cheatsheet-back-btn {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(220, 38, 38, 0.4);
          color: #dc2626;
        }
        .light-mode .cheatsheet-back-btn:hover {
          border-color: #dc2626;
          color: #ffffff;
          background: rgba(220, 38, 38, 0.85);
        }
        .light-mode .key-badge {
          background: rgba(124, 58, 237, 0.1);
          color: #7c3aed;
          border-color: rgba(124, 58, 237, 0.3);
        }
        .light-mode .cheat-tool-btn {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #475569;
        }
        .light-mode .cheat-tool-btn:hover {
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .light-mode .cheat-tool-btn.active {
          background: rgba(124, 58, 237, 0.08);
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .light-mode .cheat-transpose {
          background: #ffffff;
          border-color: #e5e7eb;
        }
        .light-mode .cheat-transpose button {
          color: #475569;
        }
        .light-mode .cheat-transpose button:hover {
          background: rgba(124, 58, 237, 0.08);
          color: #7c3aed;
        }
        .light-mode .cheat-key {
          color: #7c3aed;
        }
        .light-mode .cheat-edit-area {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
          font-family: 'Courier New', monospace;
        }
        .light-mode .cheat-edit-area:focus {
          border-color: #7c3aed;
        }
        .light-mode .cheat-footer {
          border-top-color: #e5e7eb;
        }
        .light-mode .cheat-speed button {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #64748b;
        }
        .light-mode .cheat-speed button:hover {
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .light-mode .cheat-speed button.active {
          background: #7c3aed;
          color: #ffffff;
          border-color: #7c3aed;
        }
        .light-mode .cheat-play-btn {
          background: #7c3aed;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
        }
        .light-mode .cheat-status {
          color: #94a3b8;
        }
        .light-mode .cheat-status span:first-child {
          color: #7c3aed;
        }
        .light-mode .no-lyrics-msg {
          color: #64748b;
        }
        .light-mode .no-lyrics-msg .hint {
          color: #94a3b8;
        }
        .light-mode .add-lyrics-btn {
          background: #7c3aed;
          color: #ffffff;
        }
        .light-mode .add-lyrics-btn:hover {
          background: #6d28d9;
        }

        /* Setlists / song picker / repertoire browser */
        .light-mode .setlists-panel,
        .light-mode .setlist-song-search,
        .light-mode .repertoire-browser,
        .light-mode .active-setlist-strip,
        .light-mode .setlist-item-main,
        .light-mode .song-picker-item,
        .light-mode .song-search-box,
        .light-mode .song-search-inline,
        .light-mode .song-dropdown-toggle,
        .light-mode .song-dropdown-list,
        .light-mode .song-select {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #0f172a;
        }
        .light-mode .setlist-item-title,
        .light-mode .song-picker-title,
        .light-mode .song-dropdown-title,
        .light-mode .active-setlist-name,
        .light-mode .setlists-panel-header h3 {
          color: #0f172a;
        }
        .light-mode .setlist-chip {
          background: #f1f5f9;
          border-color: #e5e7eb;
          color: #475569;
        }
        .light-mode .setlist-chip.active,
        .light-mode .setlist-chip:hover {
          background: rgba(124, 58, 237, 0.1);
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .light-mode .repertoire-cat-chip {
          background: #f1f5f9;
          border-color: #e5e7eb;
          color: #475569;
        }
        .light-mode .repertoire-cat-chip.active {
          background: #7c3aed;
          color: #ffffff;
          border-color: #7c3aed;
        }
        .light-mode .song-search-input {
          background: #f8fafc;
          border-color: #e5e7eb;
          color: #0f172a;
        }
        .light-mode .song-search-input:focus {
          border-color: #7c3aed;
          background: #ffffff;
        }
        .light-mode .song-search-input::placeholder {
          color: #94a3b8;
        }
        .light-mode .song-dropdown-item:hover {
          background: rgba(124, 58, 237, 0.05);
        }
        .light-mode .cheatsheet-setlist-toggle {
          background: #f8fafc;
          border-color: #e5e7eb;
          color: #475569;
        }
        .light-mode .cheatsheet-setlist-toggle:hover,
        .light-mode .cheatsheet-setlist-toggle.expanded {
          background: rgba(124, 58, 237, 0.08);
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .light-mode .cheatsheet-setlist-empty {
          color: #94a3b8;
        }
        .light-mode .cheatsheet-song-item {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #0f172a;
        }
        .light-mode .cheatsheet-song-item:hover {
          background: rgba(124, 58, 237, 0.05);
          border-color: #7c3aed;
        }

        /* Settings panel */
        .light-mode .settings-overlay {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .light-mode .settings-panel {
          background: rgba(255, 255, 255, 0.98);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          color: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 20px 60px rgba(139, 92, 246, 0.15), 0 8px 24px rgba(15, 23, 42, 0.08);
        }
        .light-mode .settings-header {
          border-bottom-color: #e5e7eb;
        }
        .light-mode .settings-header h2 {
          color: #0f172a;
        }
        .light-mode .close-btn {
          background: #f1f5f9;
          border-color: #e5e7eb;
          color: #475569;
        }
        .light-mode .close-btn:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }
        .light-mode .setting-group {
          background: rgba(248, 250, 252, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 12px;
        }
        .light-mode .setting-label {
          color: #0f172a;
        }
        .light-mode .setting-input {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .light-mode .setting-input:focus {
          border-color: #7c3aed;
        }
        .light-mode .setting-range {
          accent-color: #7c3aed;
        }
        .light-mode .range-value {
          color: #7c3aed;
        }
        .light-mode .toggle-btn {
          background: #cbd5e1;
        }
        .light-mode .toggle-btn.on {
          background: #7c3aed;
        }
        .light-mode .toggle-knob {
          background: #ffffff;
        }

        /* Help modal (Live) */
        .light-mode .help-section {
          background: rgba(248, 250, 252, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
        }
        .light-mode .help-section h3 {
          color: #7c3aed;
        }
        .light-mode .help-section p,
        .light-mode .help-section li {
          color: #475569;
        }
        .light-mode .help-section strong {
          color: #0f172a;
        }
        .light-mode .help-tip {
          background: rgba(124, 58, 237, 0.05);
          border-color: rgba(124, 58, 237, 0.3);
        }

        /* Night vision label on hud button */
        .light-mode .hud-btn span {
          color: inherit;
        }

        /* Repertoire browser / Dodaj pesmu panel — glass style */
        .light-mode .song-picker,
        .light-mode .setlists-panel,
        .light-mode .setlist-song-search,
        .light-mode .repertoire-browser,
        .light-mode .active-setlist-strip {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 14px;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .light-mode .setlists-panel-header h3,
        .light-mode .repertoire-browser-head h3,
        .light-mode .active-setlist-name {
          color: #0f172a;
        }
        .light-mode .setlist-help-text {
          color: #64748b;
        }
        .light-mode .setlist-status-row {
          color: #475569;
        }
        .light-mode .setlist-status-row strong {
          color: #0f172a;
        }
        .light-mode .setlist-count-badge {
          background: rgba(139, 92, 246, 0.12);
          color: #6d28d9;
          border: 1px solid rgba(139, 92, 246, 0.25);
        }
        .light-mode .setlist-chip,
        .light-mode .active-setlist-item,
        .light-mode .setlist-create-btn,
        .light-mode .setlist-delete-btn,
        .light-mode .song-add-to-setlist,
        .light-mode .active-setlist-nav button,
        .light-mode .setlist-item-actions button {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #475569;
        }
        .light-mode .setlist-chip:hover,
        .light-mode .active-setlist-item:hover,
        .light-mode .setlist-create-btn:hover,
        .light-mode .setlist-delete-btn:hover,
        .light-mode .song-add-to-setlist:hover:not(:disabled),
        .light-mode .active-setlist-nav button:hover,
        .light-mode .setlist-item-actions button:hover {
          border-color: rgba(139, 92, 246, 0.5);
          color: #7c3aed;
          background: rgba(139, 92, 246, 0.06);
        }
        .light-mode .setlist-chip.active {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .light-mode .setlist-item-order {
          color: #7c3aed;
        }
        .light-mode .setlist-item-main:hover {
          border-color: rgba(139, 92, 246, 0.35);
          background: rgba(255, 255, 255, 1);
        }
        .light-mode .setlist-item-main:active {
          border-color: #7c3aed;
          background: rgba(139, 92, 246, 0.06);
        }
        .light-mode .setlist-item-row.just-added .setlist-item-main {
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2) inset;
        }
        .light-mode .setlist-items {
          scrollbar-color: #cbd5e1 #f8fafc;
        }
        .light-mode .setlist-items::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .light-mode .setlist-items::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        .light-mode .setlists-empty {
          border-color: #e2e8f0;
          color: #64748b;
        }
        .light-mode .setlist-item-artist {
          color: #64748b;
        }

        /* Repertoire combo (dropdown search inside Dodaj pesmu) */
        .light-mode .repertoire-combo-toggle {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #334155;
          border-radius: 10px;
        }
        .light-mode .repertoire-combo-toggle:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #7c3aed;
        }
        .light-mode .repertoire-combo-toggle.open {
          border-color: #8b5cf6;
          color: #7c3aed;
          background: rgba(139, 92, 246, 0.06);
        }
        .light-mode .repertoire-combo-panel {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 20px 60px rgba(139, 92, 246, 0.15), 0 8px 24px rgba(15, 23, 42, 0.08);
        }
        .light-mode .repertoire-combo-sticky-search {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }
        .light-mode .repertoire-combo-sticky-search input {
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.35);
          color: #0f172a;
        }
        .light-mode .repertoire-combo-sticky-search input:focus {
          border-color: #8b5cf6;
        }
        .light-mode .repertoire-combo-sticky-search input::placeholder {
          color: #94a3b8;
        }
        .light-mode .repertoire-combo-count {
          color: #64748b;
        }
        .light-mode .repertoire-cat-chip {
          background: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.25);
          color: #475569;
        }
        .light-mode .repertoire-cat-chip:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #7c3aed;
        }
        .light-mode .repertoire-cat-chip.active {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }
        .light-mode .repertoire-dropdown-list {
          background: rgba(255, 255, 255, 0.98);
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .light-mode .repertoire-dropdown-list::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .light-mode .repertoire-dropdown-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        .light-mode .repertoire-dropdown-item {
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        .light-mode .repertoire-dropdown-main {
          color: #0f172a;
        }
        .light-mode .repertoire-dropdown-main:hover {
          background: rgba(139, 92, 246, 0.06);
        }
        .light-mode .repertoire-dropdown-main .song-title {
          color: #0f172a;
        }
        .light-mode .repertoire-dropdown-main .song-artist {
          color: #64748b;
        }
        .light-mode .song-in-setlist-pill {
          background: rgba(34, 197, 94, 0.1);
          color: #15803d;
          border-color: rgba(34, 197, 94, 0.3);
        }
        .light-mode .repertoire-dropdown-main:has(.song-in-setlist-pill) {
          border: 1px dashed rgba(139, 92, 246, 0.35);
        }
        .light-mode .song-in-setlist-pill.removable:hover,
        .light-mode .repertoire-dropdown-main:hover .song-in-setlist-pill.removable {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
          border-color: rgba(239, 68, 68, 0.45);
        }
        .light-mode .song-open-lyrics-btn {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #475569;
        }
        .light-mode .song-open-lyrics-btn:hover {
          border-color: #8b5cf6;
          color: #7c3aed;
          background: rgba(139, 92, 246, 0.06);
        }
        .light-mode .repertoire-empty {
          color: #94a3b8;
        }

        /* Setlist items */
        .light-mode .setlist-item-main,
        .light-mode .song-picker-item {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.22);
          color: #0f172a;
        }
        .light-mode .setlist-item-main:hover,
        .light-mode .song-picker-item:hover {
          border-color: rgba(139, 92, 246, 0.35);
          background: rgba(255, 255, 255, 1);
        }
        .light-mode .setlist-item-title,
        .light-mode .song-picker-title {
          color: #0f172a;
        }
        .light-mode .setlist-item-artist,
        .light-mode .song-picker-artist {
          color: #64748b;
        }
        .light-mode .setlist-name-input {
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.35);
          color: #0f172a;
        }
        .light-mode .setlist-name-input:focus {
          border-color: #8b5cf6;
        }

        /* Cheatsheet song dropdown (PODSETNIK tab) */
        .light-mode .song-search-inline {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .light-mode .song-search-inline input {
          background: transparent;
          color: #0f172a;
        }
        .light-mode .song-search-inline input::placeholder {
          color: #94a3b8;
        }
        .light-mode .song-dropdown-toggle {
          background: transparent;
          color: #64748b;
        }
        .light-mode .song-dropdown-toggle:hover {
          color: #7c3aed;
        }
        .light-mode .song-dropdown-list {
          background: rgba(255, 255, 255, 0.98);
          -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 16px 40px rgba(139, 92, 246, 0.12), 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .light-mode .song-dropdown-item {
          color: #0f172a;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }
        .light-mode .song-dropdown-item:hover {
          background: rgba(139, 92, 246, 0.06);
        }
        .light-mode .song-dropdown-title {
          color: #0f172a;
        }
        .light-mode .song-dropdown-artist {
          color: #64748b;
        }
        .light-mode .song-search-box {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #0f172a;
        }

        /* Cheatsheet setlist expander */
        .light-mode .cheatsheet-setlists {
          gap: 0.5rem;
        }
        .light-mode .cheatsheet-setlist-block {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 12px;
        }

        /* Mobile: ensure responsive light mode remains visible */
        @media (max-width: 720px) {
          .light-mode .hud-side-nav {
            background: rgba(255, 255, 255, 0.9);
            -webkit-backdrop-filter: blur(14px);
            backdrop-filter: blur(14px);
            border-top: 1px solid rgba(148, 163, 184, 0.22);
            border-right: none;
            box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.05);
          }
          .light-mode .hud-header {
            background: rgba(255, 255, 255, 0.9);
          }
        }
      `}</style>
    </div>
  );
}
