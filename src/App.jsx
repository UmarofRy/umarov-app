import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Volume2, RotateCw, CheckCircle, AlertCircle, Play, Type, Clock,
  Grid, Trophy, ArrowRight, Layout, Brain, RefreshCw, X, Zap, ShieldAlert,
  Star, Headphones, Search, Crosshair, Calendar, Flame, Target, Plus,
  FileText, Trash2, Edit2, Settings, List, Lock, Globe, Mic, Check, Keyboard,
  User, Shield, LogOut, Activity, Users, CreditCard, Monitor, Key, Filter,
  UserCheck, UserX, Crown, Timer, Minus, LogIn, BadgeCheck, Copyright,
  Download, Share, Sparkles
} from "lucide-react";

/**
 * FLASHCARDS: ULTIMATE EDITION v7.3 (CDN FIX)
 * Created for: Umarov
 * Updated: 2026-01-22
 * * UPDATE LOG:
 * - Changed XLSX library CDN to cdnjs for better stability (Fixed QUIC error)
 * - Restored typing validation logic
 */

// --- UTILS & AUDIO ---

const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    const sounds = {
      success: { type: "sine", freq: [600, 1200], dur: 0.15 }, // Bing!
      error: { type: "sawtooth", freq: [150, 80], dur: 0.3 }, // Buzz
      click: { type: "triangle", freq: [800, 0], dur: 0.05 },
      levelUp: { type: "square", freq: [400, 800], dur: 0.4 },
      reveal: { type: "sine", freq: [300, 600], dur: 0.1 },
      bossHit: { type: "sawtooth", freq: [100, 50], dur: 0.5 },
      accessDenied: { type: "sawtooth", freq: [100, 50], dur: 0.8 }, 
      match: { type: "sine", freq: [400, 800], dur: 0.2 }, // New Match Sound
    };

    const s = sounds[type] || sounds.click;
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.freq[0], now);
    if (s.freq[1] > 0) osc.frequency.exponentialRampToValueAtTime(s.freq[1], now + s.dur);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + s.dur);
    
    osc.start(now);
    osc.stop(now + s.dur);
  } catch (e) { console.error(e); }
};

const speak = (text) => {
  if (!text) return; 
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }
};

const triggerConfetti = () => {
  const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    el.classList.add("confetti");
    el.style.left = Math.random() * 100 + "vw";
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = Math.random() * 2 + 1 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
};

// --- SYSTEM CONSTANTS & HELPERS ---
const API_URL = "https://6970faf178fec16a63ffae81.mockapi.io/Umarov/app";
const GROUP_SIZE = 5;

const generateVMAC = () => {
  const hex = "0123456789ABCDEF";
  let mac = "";
  for (let i = 0; i < 6; i++) {
    mac += hex.charAt(Math.floor(Math.random() * 16));
    mac += hex.charAt(Math.floor(Math.random() * 16));
    if (i < 5) mac += ":";
  }
  return mac;
};

const getFingerprint = () => {
  return btoa(navigator.userAgent + navigator.language + screen.width);
};

const isValidUsername = (username) => {
  if (username.length < 5 || username.length > 12) return false;
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) return false;
  if (/^([a-z0-9_])\1+$/i.test(username)) return false;
  const badWords = ["admin", "root", "fuck", "shit", "sex", "xxx", "porn", "bot", "moderator", "system"];
  if (badWords.some(w => username.toLowerCase().includes(w))) return false;
  return true;
};

const formatTimeLeft = (ms) => {
  if (ms <= 0) return "Expired";
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}d ${hours}h ${minutes}m`;
};

const App = () => {
  // --- EXISTING GLOBAL STATE ---
  const [files, setFiles] = useState({});
  const [activeFileId, setActiveFileId] = useState(null);
  const [view, setView] = useState("manager");
  
  // Editor State
  const [editingFile, setEditingFile] = useState(null);
  const [manualEn, setManualEn] = useState("");
  const [manualUz, setManualUz] = useState("");

  // Learning State
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [queue, setQueue] = useState([]); 
  const [currentCard, setCurrentCard] = useState(null);
  const [stage, setStage] = useState("intro"); 
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [introState, setIntroState] = useState({ index: 0, step: 1 });
  
  // Audio Typing State
  const [typingFeedback, setTypingFeedback] = useState(null);
  const [showTypingHint, setShowTypingHint] = useState(false);

  // Think State
  const [thinkIndex, setThinkIndex] = useState(0);

  // Game State
  const [gameMode, setGameMode] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false); 
  const [streak, setStreak] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [gameOptions, setGameOptions] = useState([]);
  const [gameState, setGameState] = useState("playing");
  const [arcadeFeedback, setArcadeFeedback] = useState(null); 
  
  // Helpers
  const [matchSelected, setMatchSelected] = useState(null);
  const [matchCards, setMatchCards] = useState([]);
  const [thinkRevealed, setThinkRevealed] = useState(false);
  const [matchFeedback, setMatchFeedback] = useState({}); 
  const [isProcessingMatch, setIsProcessingMatch] = useState(false);

  // --- SECURITY & USER STATE ---
  const [user, setUser] = useState(null); 
  const [isGateOpen, setIsGateOpen] = useState(true); 
  const [authMode, setAuthMode] = useState("login"); 
  const [isLocked, setIsLocked] = useState(false); 
  const [globalSettings, setGlobalSettings] = useState({ money_mode: true }); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); 
  
  // UI State for Security
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [freeCodeInput, setFreeCodeInput] = useState("");
  const [allUsers, setAllUsers] = useState([]); 
  
  // Admin V2 States
  const [adminSearch, setAdminSearch] = useState("");
  const [translatorSearch, setTranslatorSearch] = useState("");

  // --- PWA STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // --- TIMER EFFECT ---
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      if (stage === "think" && !thinkRevealed) {
        handleThinkReveal();
        setIsTimerActive(false);
      }
      if (view === "game_arcade" && gameMode === "timeAttack") {
         setGameState("fail");
         playSound("accessDenied");
         setIsTimerActive(false);
      }
      if (view === "game_arcade" && gameMode === "wordHunt") {
         handleArcadeAnswer(false);
         setIsTimerActive(false); 
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer, stage, thinkRevealed, view, gameMode]);


  // --- SYSTEM INITIALIZATION ---
  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement("script");
      // UPDATED CDN URL TO FIX ERR_QUIC_PROTOCOL_ERROR
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const savedFiles = localStorage.getItem("fl_files");
    if (savedFiles) setFiles(JSON.parse(savedFiles));
    initializeSecurity();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (Object.keys(files).length > 0) {
      localStorage.setItem("fl_files", JSON.stringify(files));
    }
  }, [files]);

  useEffect(() => {
    if (!user) return;
    const checkAccess = () => {
      if (isAdmin || user.is_pro) { setIsLocked(false); return; }
      if (globalSettings.money_mode) {
        const now = Date.now();
        const expiry = user.access_until || 0;
        if (now > expiry) setIsLocked(true); else setIsLocked(false);
      } else {
        setIsLocked(false);
      }
    };
    const interval = setInterval(checkAccess, 5000); 
    checkAccess(); 
    return () => clearInterval(interval);
  }, [user, globalSettings, isAdmin]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const initializeSecurity = async () => {
    const localUser = JSON.parse(localStorage.getItem("fl_user"));
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      const configUser = data.find(u => u.username === "SYSTEM_CONFIG");
      if (configUser) setGlobalSettings({ money_mode: configUser.money_mode });
      
      if (localUser) {
        const apiUser = data.find(u => u.id === localUser.id);
        if (apiUser) {
          if (apiUser.password === localUser.password) {
             setUser(apiUser);
             setIsGateOpen(false); 
             if (apiUser.role === 'admin') setIsAdmin(true);
          } else {
             localStorage.removeItem("fl_user");
             setIsGateOpen(true);
          }
        } else {
          localStorage.removeItem("fl_user");
          setIsGateOpen(true);
        }
      } else {
        setIsGateOpen(true);
      }
    } catch (e) {
      console.error("API Error", e);
      if (localUser) {
         setUser(localUser);
         setIsGateOpen(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!isValidUsername(regUsername)) { setRegError("Username yaroqsiz!"); triggerShake(); return; }
    if (regPassword.length < 4) { setRegError("Parol juda qisqa."); triggerShake(); return; }
    try {
      setRegError("Tekshirilmoqda...");
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.find(u => u.username.toLowerCase() === regUsername.toLowerCase())) { setRegError("Bu nom band."); triggerShake(); return; }
      
      let unique = false;
      let newMac = "";
      while (!unique) {
         newMac = generateVMAC();
         if (!data.find(u => u.mac_address === newMac)) unique = true;
      }
      const newUser = { username: regUsername, password: regPassword, mac_address: newMac, fingerprint: getFingerprint(), created_at: Date.now(), access_until: Date.now(), free_used: false, is_pro: false, role: "user", last_active: Date.now(), total_sessions: 0 };
      const createRes = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) });
      const createdUser = await createRes.json();
      localStorage.setItem("fl_user", JSON.stringify(createdUser));
      setUser(createdUser);
      setIsGateOpen(false);
      setRegError("");
    } catch (e) { setRegError("Internet xatosi."); triggerShake(); }
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) { setRegError("Ma'lumotlarni kiriting."); triggerShake(); return; }
    try {
      setRegError("Kirish...");
      const res = await fetch(API_URL);
      const data = await res.json();
      const foundUser = data.find(u => u.username.toLowerCase() === loginUsername.toLowerCase());
      if (foundUser && foundUser.password === loginPassword) {
        localStorage.setItem("fl_user", JSON.stringify(foundUser));
        setUser(foundUser);
        setIsGateOpen(false);
        if (foundUser.role === 'admin') setIsAdmin(true);
        setRegError("");
      } else { setRegError("Login yoki parol xato."); triggerShake(); }
    } catch (e) { setRegError("Internet xatosi."); triggerShake(); }
  };

  const attemptAdminLogin = () => {
    if (adminUser === "RyUmarov.A" && adminPass === "1818ea43") {
      setIsAdmin(true); setShowAdminLogin(false); setAdminPanelOpen(true); playSound("success");
    } else { alert("Xato ma'lumot!"); playSound("error"); }
  };

  const logout = () => { localStorage.removeItem("fl_user"); window.location.reload(); };

  const handleFreeUnlock = async () => {
    if (freeCodeInput !== "free") { alert("Kod xato!"); return; }
    if (user.free_used) { alert("Siz bepul limitdan foydalanib bo'lgansiz."); return; }
    try {
      const grantTime = 72 * 60 * 60 * 1000; 
      const updatedData = { access_until: Date.now() + grantTime, free_used: true };
      const res = await fetch(`${API_URL}/${user.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedData) });
      const updatedUser = await res.json();
      setUser(updatedUser); localStorage.setItem("fl_user", JSON.stringify(updatedUser)); setIsLocked(false); playSound("success"); triggerConfetti(); alert("Sizga 3 kun bepul vaqt berildi!");
    } catch (e) { alert("Server xatosi."); }
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") setDeferredPrompt(null);
      });
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) setShowIOSPrompt(true); else alert("Ilovani brauzer menyusi orqali o'rnating.");
    }
  };

  const fetchAllUsers = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    setAllUsers(data.filter(u => u.username !== "SYSTEM_CONFIG"));
  };

  const adjustUserTime = async (targetUser, minutes) => {
    const currentExpiry = targetUser.access_until > Date.now() ? targetUser.access_until : Date.now();
    const newTime = currentExpiry + (minutes * 60000);
    setAllUsers(prev => prev.map(u => u.id === targetUser.id ? {...u, access_until: newTime} : u));
    await fetch(`${API_URL}/${targetUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_until: newTime }) });
  };

  const toggleProStatus = async (targetUser) => {
    const newStatus = !targetUser.is_pro;
    setAllUsers(prev => prev.map(u => u.id === targetUser.id ? {...u, is_pro: newStatus} : u));
    await fetch(`${API_URL}/${targetUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_pro: newStatus }) });
  };

  const deleteUser = async (targetUserId) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    setAllUsers(prev => prev.filter(u => u.id !== targetUserId));
    await fetch(`${API_URL}/${targetUserId}`, { method: "DELETE" });
  };

  const toggleGlobalMoney = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    let config = data.find(u => u.username === "SYSTEM_CONFIG");
    const newValue = !globalSettings.money_mode;
    if (config) await fetch(`${API_URL}/${config.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ money_mode: newValue }) });
    else await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "SYSTEM_CONFIG", money_mode: newValue }) });
    setGlobalSettings({ money_mode: newValue });
    alert(`Global Money Mode: ${newValue ? "ON" : "OFF"}`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
        const newWords = [];
        data.forEach((row) => {
          if (row[0] && row[1]) {
            newWords.push({ id: Math.random().toString(36).substr(2, 9), en: row[0].toString().trim(), uz: row[1].toString().trim(), learned: false, mistakes: 0 });
          }
        });
        if (newWords.length === 0) throw new Error("Fayl bo'sh");
        const newFileId = Date.now().toString();
        setFiles(prev => ({ ...prev, [newFileId]: { id: newFileId, name: file.name.replace(".xlsx", ""), words: newWords, completedGroups: [] } }));
        setActiveFileId(newFileId);
        setView("dashboard");
      } catch (err) { alert("Format xatosi!"); }
    };
    reader.readAsBinaryString(file);
  };

  const createManualFile = () => {
    const name = prompt("Fayl nomi:");
    if (!name) return;
    const id = Date.now().toString();
    setFiles(prev => ({ ...prev, [id]: { id, name, words: [], completedGroups: [] } }));
    setEditingFile(id);
  };

  const deleteFile = (id) => {
    if (confirm("O'chirilsinmi?")) {
      const newFiles = { ...files };
      delete newFiles[id];
      setFiles(newFiles);
      if (activeFileId === id) setActiveFileId(null);
    }
  };

  const addWordManual = () => {
    if (!manualEn || !manualUz) return;
    const newWord = { id: Math.random().toString(36).substr(2, 9), en: manualEn, uz: manualUz, learned: false, mistakes: 0 };
    setFiles({ ...files, [editingFile]: { ...files[editingFile], words: [newWord, ...files[editingFile].words] } });
    setManualEn(""); setManualUz(""); playSound("success");
  };

  const startGroup = (groupIndex) => {
    const activeFile = files[activeFileId];
    if (!activeFile) return;
    const start = groupIndex * GROUP_SIZE;
    const slice = activeFile.words.slice(start, start + GROUP_SIZE);
    if (slice.length === 0) return;
    setActiveGroupIndex(groupIndex);
    setQueue(slice);
    setMistakes([]);
    setStage("intro");
    setIntroState({ index: 0, step: 1 });
    setCurrentCard(slice[0]); 
    setView("smart_learning");
    setTimeout(() => speak(slice[0].en), 500);
  };

  const nextStage = () => {
    const currentQueue = queue;
    if (stage === "intro") {
      let cards = [];
      currentQueue.forEach(w => {
        cards.push({ ...w, type: 'en', uid: w.id + '-en', matched: false });
        cards.push({ ...w, type: 'uz', uid: w.id + '-uz', matched: false });
      });
      setMatchCards(cards.sort(() => Math.random() - 0.5));
      setMatchFeedback({});
      setIsProcessingMatch(false);
      setStage("match");
    } else if (stage === "match") {
      setStage("quiz");
      setupQuizCard(currentQueue[0], currentQueue);
    } else if (stage === "quiz") {
      setStage("audio_typing");
      setCurrentCard(currentQueue[0]);
      setInputVal("");
      setTypingFeedback(null);
      setShowTypingHint(false);
      speak(currentQueue[0].en);
    } else if (stage === "audio_typing") {
      setStage("think");
      const thinkQueue = [...currentQueue, ...currentQueue];
      setQueue(thinkQueue);
      setThinkIndex(0);
      setCurrentCard(thinkQueue[0]);
      setThinkRevealed(false);
      setTimer(7);
      setIsTimerActive(true); 
    } else if (stage === "think") {
      setFiles(prev => {
        const file = prev[activeFileId];
        const completedGroups = file.completedGroups || [];
        if (!completedGroups.includes(activeGroupIndex)) {
           return { ...prev, [activeFileId]: { ...file, completedGroups: [...completedGroups, activeGroupIndex] } };
        }
        return prev;
      });
      setView("results");
      playSound("levelUp");
      triggerConfetti();
    }
  };

  const handleIntroNext = () => {
    if (introState.step === 1) {
      setIntroState(prev => ({ ...prev, step: 2 }));
    } else {
      const nextIndex = introState.index + 1;
      if (nextIndex < queue.length) {
        setIntroState({ index: nextIndex, step: 1 });
        setCurrentCard(queue[nextIndex]);
        speak(queue[nextIndex].en);
      } else {
        nextStage();
      }
    }
  };

  const handleTypingSubmit = (e) => {
    e.preventDefault();
    if (typingFeedback === "correct") return;
    const cleanInput = inputVal.trim().toLowerCase();
    const cleanTarget = currentCard.en.toLowerCase();
    if (cleanInput === cleanTarget) {
      playSound("success");
      setTypingFeedback("correct");
      setShowTypingHint(false);
      setTimeout(() => {
        const idx = queue.indexOf(currentCard);
        if (idx < queue.length - 1) {
           setCurrentCard(queue[idx + 1]);
           setInputVal("");
           setTypingFeedback(null);
           setShowTypingHint(false);
           speak(queue[idx + 1].en);
        } else {
           nextStage();
        }
      }, 1000);
    } else {
      playSound("error");
      setTypingFeedback("wrong");
      setShowTypingHint(true);
      triggerShake();
    }
  };

  // --- REFACTORED MATCH GAME LOGIC ---
  const handleMatchClick = (card) => {
    if (isProcessingMatch || card.matched || card.uid === matchSelected) return;

    if (!matchSelected) {
      setMatchSelected(card.uid);
      if (card.type === 'en') speak(card.en);
      return;
    }

    // Logic for second card selection
    const firstCard = matchCards.find(c => c.uid === matchSelected);
    const isMatch = firstCard.id === card.id && firstCard.type !== card.type;
    
    setIsProcessingMatch(true); // Lock interactions

    if (isMatch) {
      // Correct Match: Green, Speak, Disappear
      setMatchFeedback({ [card.uid]: 'correct', [matchSelected]: 'correct' });
      playSound("match");
      
      // Find the English word to speak
      const wordToSpeak = card.type === 'en' ? card.en : firstCard.en;
      speak(wordToSpeak);

      setTimeout(() => {
        const updated = matchCards.map(c => 
          (c.uid === card.uid || c.uid === matchSelected) ? { ...c, matched: true } : c
        );
        setMatchCards(updated);
        setMatchSelected(null);
        setMatchFeedback({});
        setIsProcessingMatch(false);
        if (updated.every(c => c.matched)) setTimeout(nextStage, 500);
      }, 600); // Short delay to see green
    } else {
      // Wrong Match: Red, Error Sound, Shake
      setMatchFeedback({ [card.uid]: 'wrong', [matchSelected]: 'wrong' });
      playSound("error");
      
      setTimeout(() => {
        setMatchSelected(null);
        setMatchFeedback({});
        setIsProcessingMatch(false);
      }, 600);
    }
  };

  const setupQuizCard = (word, currentQueue) => {
    setCurrentCard(word);
    setQuizFeedback(null);
    speak(word.en);
    const allWords = files[activeFileId].words;
    const distractors = allWords.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
    setGameOptions([word, ...distractors].sort(() => Math.random() - 0.5));
  };

  const handleQuizAnswer = (selectedWord) => {
    if (quizFeedback) return;
    const isCorrect = selectedWord.id === currentCard.id;
    setQuizFeedback({ id: selectedWord.id, status: isCorrect ? 'correct' : 'wrong' });
    if (isCorrect) {
      playSound("success");
      setTimeout(() => {
         const idx = queue.indexOf(currentCard);
         if (idx < queue.length - 1) {
            setupQuizCard(queue[idx + 1], queue);
         } else {
            nextStage();
         }
      }, 600);
    } else {
      playSound("error");
      setTimeout(() => setQuizFeedback(null), 1000); 
    }
  };

  const startTimer = (sec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(sec);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!thinkRevealed) handleThinkReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleThinkReveal = () => {
    setThinkRevealed(true);
    playSound("reveal");
    speak(currentCard?.en);
  };

  const handleThinkVote = (correct) => {
    setIsTimerActive(false); 
    
    let nextQueue = [...queue]; 
    if (!correct) {
      playSound("error");
      nextQueue.push(currentCard); 
      setMistakes(prev => [...prev, currentCard.id]);
    } else {
      playSound("success");
    }

    const nextIdx = thinkIndex + 1;

    if (nextIdx < nextQueue.length) {
      setQueue(nextQueue);
      setThinkIndex(nextIdx);
      setCurrentCard(nextQueue[nextIdx]);
      setThinkRevealed(false);
      setTimer(7);
      setIsTimerActive(true); 
    } else {
      nextStage();
    }
  };

  const startArcade = (mode) => {
    const allWords = files[activeFileId]?.words || [];
    if (allWords.length < 5) { alert("O'yin uchun kamida 5 ta so'z kerak!"); return; }
    setGameMode(mode);
    setStreak(0);
    setScore(0);
    setGameState("playing");
    setArcadeFeedback(null);
    setView("game_arcade");
    let gameQ = mode === "boss" ? allWords.sort(() => Math.random() - 0.5).slice(0, 20) : allWords.sort(() => Math.random() - 0.5);
    setQueue(gameQ);
    setupArcadeRound(gameQ[0], mode);
  };

  const setupArcadeRound = (word, mode) => {
    setCurrentCard(word);
    setInputVal("");
    setArcadeFeedback(null); // Reset feedback
    setTimer(mode === "timeAttack" ? 30 : mode === "wordHunt" ? 5 : 0);
    setIsTimerActive(mode === "timeAttack" || mode === "wordHunt"); 

    if (mode === "timeAttack") {
       const opts = files[activeFileId].words.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
       setGameOptions([word, ...opts].sort(() => Math.random() - 0.5));
       speak(word.en);
    } else if (mode === "wordHunt") {
      const opts = files[activeFileId].words.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 4);
      setGameOptions([word, ...opts].sort(() => Math.random() - 0.5));
      speak(word.en);
    } else if (mode === "boss") {
    } else if (mode === "confusion") {
      const firstLetter = word.en[0].toLowerCase();
      let confusing = files[activeFileId].words.filter(w => w.id !== word.id && w.en.toLowerCase().startsWith(firstLetter));
      if (confusing.length < 3) confusing = files[activeFileId].words.filter(w => w.id !== word.id).slice(0,3);
      setGameOptions([word, ...confusing.slice(0,3)].sort(() => Math.random() - 0.5));
      speak(word.en);
    }
  };

  // --- REFACTORED ARCADE LOGIC ---
  const handleArcadeAnswer = (correct, optId) => {
    if (arcadeFeedback) return; // Prevent spam
    const isBoss = gameMode === "boss";
    
    // Set Visual Feedback
    setArcadeFeedback({ id: optId, status: correct ? 'correct' : 'wrong' });

    if (correct) {
      // Audio: Win Sound ONLY (No speak)
      playSound("success");
      setStreak(s => s + 1);
      setScore(s => s + 10 + (streak * 2));
      
      const nextIdx = queue.indexOf(currentCard) + 1;
      setTimeout(() => {
        if (nextIdx < queue.length) {
          setupArcadeRound(queue[nextIdx], gameMode);
        } else {
          setGameState("success");
          triggerConfetti();
          setIsTimerActive(false);
        }
      }, 500);
    } else {
      // Audio: Wrong Sound
      if (isBoss) { playSound("bossHit"); setGameState("fail"); setIsTimerActive(false); return; }
      playSound("error");
      
      setStreak(0);
      const nextIdx = queue.indexOf(currentCard) + 1;
      setTimeout(() => {
        if (nextIdx < queue.length) {
          setupArcadeRound(queue[nextIdx], gameMode);
        } else {
          setGameState("success");
          setIsTimerActive(false);
        }
      }, 500);
    }
  };

  // RESTORED checkTyping function for Boss Mode
  const checkTyping = (e) => {
    e.preventDefault();
    const cleanIn = inputVal.trim().toLowerCase();
    const cleanTarget = currentCard.en.toLowerCase();
    handleArcadeAnswer(cleanIn === cleanTarget);
  };

  // --- RENDERERS ---
  const renderManager = () => (
    <div className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full animate-fade-in space-y-6">
      <div className="text-center mb-4 relative group animate-pop-in">
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 mb-2 tracking-tighter animate-float cursor-default select-none drop-shadow-2xl">UMAROV.A</h1>
        <p className="text-slate-400 text-sm tracking-widest uppercase">Fayl Menejeri (Offline Mode)</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group hover:scale-[1.02] active:scale-95 animate-slide-up stagger-1">
          <div className="p-3 bg-blue-500/10 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors"><Upload className="text-blue-400 group-hover:scale-110 transition-transform duration-300" size={32} /></div>
          <span className="text-xs font-bold text-slate-300 group-hover:text-white">XLS Yuklash</span>
          <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
        </label>
        <button onClick={createManualFile} className="bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border-2 border-dashed border-slate-700 hover:border-emerald-500 hover:bg-slate-800 flex flex-col items-center justify-center transition-all duration-300 group hover:scale-[1.02] active:scale-95 animate-slide-up stagger-2">
          <div className="p-3 bg-emerald-500/10 rounded-full mb-3 group-hover:bg-emerald-500/20 transition-colors"><Plus className="text-emerald-400 group-hover:rotate-90 transition-transform duration-300" size={32} /></div>
          <span className="text-xs font-bold text-slate-300 group-hover:text-white">Yangi Fayl</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] custom-scrollbar pb-4">
        {Object.values(files).map((f, idx) => (
          <div key={f.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex justify-between items-center group hover:border-indigo-500 hover:bg-slate-800 transition-all duration-300 animate-slide-up" style={{animationDelay: `${(idx+3)*0.1}s`}}>
            <div onClick={() => { setActiveFileId(f.id); setView("dashboard"); }} className="flex-1 cursor-pointer">
              <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{f.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1"><FileText size={10}/> {f.words.length} ta so'z</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setEditingFile(f.id)} className="p-2 text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
               <button onClick={() => deleteFile(f.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
      {editingFile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-700 p-6 shadow-2xl animate-pop-in">
            <div className="flex justify-between mb-4 items-center">
               <h3 className="font-bold text-xl text-white">Tahrirlash</h3>
               <button onClick={() => setEditingFile(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"><X size={18}/></button>
            </div>
            <div className="space-y-3 mb-6">
              <input value={manualEn} onChange={e => setManualEn(e.target.value)} placeholder="English Word" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white font-medium" />
              <input value={manualUz} onChange={e => setManualUz(e.target.value)} placeholder="O'zbekcha Tarjima" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white font-medium" />
              <button onClick={addWordManual} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all text-white shadow-lg shadow-indigo-500/25">Qo'shish</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
               {files[editingFile].words.map(w => (
                 <div key={w.id} className="flex justify-between items-center text-sm bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                   <span className="font-mono text-slate-300"><span className="text-white font-bold">{w.en}</span> - {w.uz}</span>
                   <button onClick={() => { const updated = files[editingFile].words.filter(x => x.id !== w.id); setFiles({...files, [editingFile]: {...files[editingFile], words: updated}}); }} className="text-slate-600 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"><X size={16}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="flex-1 flex flex-col p-4 w-full max-w-lg mx-auto animate-fade-in h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 z-10">
        <button onClick={() => setView("manager")} className="p-3 bg-slate-800/80 backdrop-blur rounded-2xl hover:bg-slate-700 transition active:scale-95 border border-slate-700"><List size={20} className="text-white"/></button>
        <h2 className="text-lg font-black truncate max-w-[150px] text-white tracking-tight">{files[activeFileId].name}</h2>
        <button onClick={() => setView("translator")} className="p-3 bg-slate-800/80 backdrop-blur rounded-2xl hover:bg-slate-700 transition active:scale-95 border border-slate-700"><Globe size={20} className="text-white"/></button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-24">
        <section>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 pl-1">Smart Learning</h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({length: Math.ceil(files[activeFileId].words.length / GROUP_SIZE)}).map((_, i) => {
              const activeFile = files[activeFileId];
              const completed = activeFile.completedGroups || [];
              const isLocked = i > 0 && !completed.includes(i - 1);
              const isCompleted = completed.includes(i);

              return (
                <button 
                  key={i} 
                  onClick={() => !isLocked && startGroup(i)} 
                  disabled={isLocked}
                  style={{animationDelay: `${i * 0.05}s`}}
                  className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group animate-slide-up
                    ${isLocked 
                      ? 'bg-slate-900/50 border-slate-800 opacity-50 grayscale' 
                      : isCompleted 
                        ? 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900/20'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1'
                    }
                  `}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold text-lg ${isCompleted ? 'text-emerald-400' : 'text-white'} group-hover:scale-105 transition-transform origin-left`}>Guruh {i + 1}</span>
                    {isLocked ? <Lock size={16} className="text-slate-600" /> : isCompleted ? <div className="bg-emerald-500 rounded-full p-1"><Check size={12} className="text-white" strokeWidth={4} /></div> : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{i*GROUP_SIZE+1} - {Math.min((i+1)*GROUP_SIZE, files[activeFileId].words.length)}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-4 pl-1 flex items-center gap-2"><Sparkles size={14} className="fill-amber-500" /> Premium Arcade</h3>
          <div className="space-y-4">
             <button onClick={() => startArcade("timeAttack")} className="w-full bg-gradient-to-r from-blue-900/50 to-slate-900 p-1 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group animate-slide-up" style={{animationDelay: '0.1s'}}>
               <div className="bg-slate-900 p-4 rounded-xl flex items-center gap-4 h-full relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>
                 <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:rotate-12 transition-transform"><Clock size={24} /></div>
                 <div><div className="font-bold text-white text-lg">Time Attack</div><div className="text-xs text-slate-400 font-medium">30 soniya, maksimal ball</div></div>
               </div>
             </button>
             
             <button onClick={() => startArcade("wordHunt")} className="w-full bg-gradient-to-r from-emerald-900/50 to-slate-900 p-1 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group animate-slide-up" style={{animationDelay: '0.2s'}}>
               <div className="bg-slate-900 p-4 rounded-xl flex items-center gap-4 h-full relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all"></div>
                 <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform"><Search size={24} /></div>
                 <div><div className="font-bold text-white text-lg">Word Hunt</div><div className="text-xs text-slate-400 font-medium">To'g'ri tarjimani toping</div></div>
               </div>
             </button>

             <button onClick={() => startArcade("boss")} className="w-full bg-gradient-to-r from-red-600 to-red-900 p-[2px] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group shadow-lg shadow-red-900/30 animate-slide-up" style={{animationDelay: '0.3s'}}>
               <div className="bg-gradient-to-r from-red-950 to-black p-5 rounded-2xl flex items-center justify-between h-full relative overflow-hidden">
                 <div className="relative z-10 flex items-center gap-4">
                   <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/50 group-hover:animate-pulse"><ShieldAlert size={28} /></div>
                   <div>
                      <div className="font-black text-xl text-white tracking-widest uppercase italic">BOSS MODE</div>
                      <div className="text-[10px] text-red-200 font-bold bg-red-900/50 px-2 py-0.5 rounded-full inline-block mt-1 border border-red-800">HARDCORE • 1 LIFE</div>
                   </div>
                 </div>
                 <div className="absolute inset-0 bg-red-600/10 translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
               </div>
             </button>
          </div>
        </section>
      </div>
    </div>
  );

  const renderSmartLearning = () => (
    <div className="flex-1 flex flex-col h-full w-full max-w-lg mx-auto relative overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-slate-950/80 backdrop-blur z-10 sticky top-0">
         <div className="flex flex-col">
            <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Learning</span>
            <span className="font-black text-white text-xl uppercase tracking-tighter">{stage.replace('_', ' ')}</span>
         </div>
         <button onClick={() => setView("dashboard")} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition active:scale-90"><X size={20} className="text-slate-300"/></button>
      </div>
      <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
         {/* INTRO */}
         {stage === "intro" && (
           <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in text-center relative">
             <div className="w-full max-w-xs flex-1 flex flex-col justify-center relative z-10">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse-slow"></div>
                   {introState.step === 1 ? (
                      <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl animate-pop-in">
                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">English</div>
                        <h2 className="text-5xl font-black text-white mb-6 break-words leading-tight">{currentCard?.en}</h2>
                        <button onClick={() => speak(currentCard?.en)} className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all shadow-lg shadow-indigo-600/30 mx-auto"><Volume2 size={32} /></button>
                      </div>
                   ) : (
                      <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl animate-pop-in">
                         <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Uzbek</div>
                         <h2 className="text-4xl font-black text-white mb-4 leading-tight">{currentCard?.uz}</h2>
                         <div className="h-px w-full bg-slate-800 my-4"></div>
                         <p className="text-xl text-indigo-400 font-bold opacity-80">{currentCard?.en}</p>
                      </div>
                   )}
                </div>
             </div>
             
             {/* Pagination Dots */}
             <div className="flex gap-2 mb-8 z-10">
               {queue.map((_, idx) => (
                 <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === introState.index ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-800'}`}></div>
               ))}
             </div>

             <button onClick={handleIntroNext} className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-lg shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 z-10">
               {introState.step === 1 ? "Tarjima" : "Keyingisi"} <ArrowRight size={24} />
             </button>
           </div>
         )}
         
         {/* MATCH */}
         {stage === "match" && (
           <div className="flex-1 grid grid-cols-2 gap-3 content-center p-4 animate-fade-in max-w-sm mx-auto w-full">
              {matchCards.map((card, i) => {
                let statusClass = "bg-slate-900 border-slate-800 hover:border-slate-600 text-slate-300";
                if (matchSelected === card.uid) statusClass = "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-105";
                
                // NEW: Visual feedback for Match
                if (matchFeedback[card.uid] === 'correct') statusClass = "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-105 ring-4 ring-emerald-500/20";
                if (matchFeedback[card.uid] === 'wrong') statusClass = "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/40 animate-shake ring-4 ring-red-500/20";

                return (
                  <button 
                    key={card.uid} 
                    onClick={() => handleMatchClick(card)} 
                    disabled={card.matched || isProcessingMatch} // Disable during processing
                    style={{animationDelay: `${i * 0.05}s`}}
                    className={`
                      h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all duration-300 animate-pop-in
                      ${card.matched ? "opacity-0 scale-0 pointer-events-none invisible" : "opacity-100 scale-100 visible"}
                      ${statusClass}
                    `}
                  >
                    <span className="font-bold text-sm sm:text-base leading-tight">{card.type === 'en' ? card.en : card.uz}</span>
                  </button>
                );
              })}
           </div>
         )}

         {/* QUIZ */}
         {stage === "quiz" && (
           <div className="flex-1 flex flex-col p-6 animate-fade-in relative">
              <div className="flex-1 flex items-center justify-center relative z-10">
                 <div className="w-full text-center">
                    <div className="inline-block p-4 bg-slate-900 border border-slate-700 rounded-3xl mb-8 shadow-2xl relative">
                       <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[26px] opacity-20 blur-lg"></div>
                       <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mb-1">Translate</span>
                       <h2 className="text-4xl font-black text-white relative z-10">{currentCard?.en}</h2>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col gap-3 pb-8 z-10">
                 {gameOptions.map((opt, i) => {
                   let statusClass = "bg-slate-900 border-slate-800 hover:border-slate-600 text-slate-300";
                   if (quizFeedback?.id === opt.id) {
                      statusClass = quizFeedback.status === 'correct' 
                        ? "bg-emerald-600 border-emerald-500 text-white ring-4 ring-emerald-500/20 scale-[1.02]" 
                        : "bg-red-600 border-red-500 text-white ring-4 ring-red-500/20 animate-shake";
                   }
                   return (
                     <button
                       key={i}
                       onClick={() => handleQuizAnswer(opt)}
                       className={`border-2 p-5 rounded-2xl font-bold text-lg transition-all duration-200 text-left active:scale-95 shadow-lg ${statusClass} animate-slide-up`}
                       style={{animationDelay: `${i * 0.1}s`}}
                     >
                       {opt.uz}
                     </button>
                   );
                 })}
              </div>
           </div>
         )}
         
         {/* AUDIO TYPING */}
         {stage === "audio_typing" && (
           <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
             <div className="w-full max-w-sm space-y-8 text-center relative z-10">
                <div onClick={() => speak(currentCard?.en)} className="w-32 h-32 bg-indigo-600 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/40 cursor-pointer hover:scale-105 active:scale-95 transition-all group relative">
                   <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-ping opacity-20"></div>
                   <Headphones size={48} className="text-white group-hover:rotate-12 transition-transform" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">Eshiting & Yozing</h2>
                  <p className="text-sm text-slate-500">Inglizcha so'zni kiriting</p>
                </div>
                <form onSubmit={handleTypingSubmit} className="relative">
                   <input 
                     autoFocus 
                     value={inputVal} 
                     onChange={e => { setInputVal(e.target.value); if(typingFeedback === 'wrong') setTypingFeedback(null); }} 
                     className={`w-full bg-slate-900/50 border-b-4 text-center text-4xl font-black py-4 outline-none transition-all duration-300
                       ${typingFeedback === 'correct' ? 'border-emerald-500 text-emerald-500' : 
                         typingFeedback === 'wrong' ? 'border-red-500 text-red-500 animate-shake' : 'border-slate-700 text-white focus:border-indigo-500 focus:bg-slate-900'}
                     `} 
                     placeholder="..." 
                   />
                   <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-slate-500 hover:text-white transition"><ArrowRight size={24} /></button>
                </form>
                {showTypingHint && (
                  <div className="bg-red-950/50 border border-red-900 p-4 rounded-xl animate-pop-in backdrop-blur-sm">
                    <p className="text-red-400 text-xs uppercase font-bold mb-1">To'g'ri javob:</p>
                    <p className="text-2xl font-mono font-black text-white tracking-widest">{currentCard?.en}</p>
                  </div>
                )}
             </div>
           </div>
         )}
         
         {/* THINK */}
         {stage === "think" && (
           <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative">
             <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900">
                <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] transition-all duration-1000 ease-linear" style={{width: `${(timer/7)*100}%`}}></div>
             </div>
             <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2rem] p-10 text-center shadow-2xl relative z-10 flex flex-col items-center justify-center min-h-[400px]">
                <div className="mb-8">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Eslab qoling</span>
                  <h2 className="text-4xl font-black text-white mt-2 mb-1">{currentCard?.uz}</h2>
                  <div className="h-1 w-12 bg-slate-800 rounded-full mx-auto mt-4"></div>
                </div>
                
                {!thinkRevealed ? (
                  <button onClick={handleThinkReveal} className="w-full py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-indigo-400 hover:bg-slate-750 hover:text-white transition-all active:scale-95 shadow-lg">KO'RSATISH</button>
                ) : (
                  <div className="w-full animate-pop-in">
                    <h3 className="text-3xl font-black text-indigo-400 mb-8">{currentCard?.en}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => handleThinkVote(false)} className="py-4 bg-red-600/10 border border-red-600/30 text-red-500 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95">XATO</button>
                      <button onClick={() => handleThinkVote(true)} className="py-4 bg-emerald-600/10 border border-emerald-600/30 text-emerald-500 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-all active:scale-95">TO'G'RI</button>
                    </div>
                  </div>
                )}
             </div>
           </div>
         )}
      </div>
    </div>
  );

  const renderGameArcade = () => {
    const isBoss = gameMode === "boss";
    if (gameState === "success") return (
       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-slate-950">
          <div className="relative mb-6">
             <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
             <Trophy size={80} className="text-yellow-400 relative z-10 animate-bounce" />
          </div>
          <h2 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-600">G'ALABA!</h2>
          <p className="text-slate-400 mb-8 font-mono text-xl">Score: <span className="text-white font-bold">{score}</span></p>
          <button onClick={() => setView("dashboard")} className="bg-white text-slate-950 px-10 py-4 rounded-full font-black text-lg hover:scale-105 transition shadow-xl shadow-white/10">Davom etish</button>
       </div>
    );
    if (gameState === "fail") return (
       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-red-950/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-600/5 animate-pulse"></div>
          <ShieldAlert size={80} className="text-red-500 mb-4 animate-shake" />
          <h2 className="text-5xl font-black text-red-500 mb-2 tracking-tighter">GAME OVER</h2>
          <div className="bg-slate-950 border border-red-900/50 p-6 rounded-2xl mb-8 shadow-2xl relative z-10">
             <div className="text-xs text-red-400 uppercase font-bold mb-2">To'g'ri javob edi:</div>
             <div className="text-3xl font-black text-white tracking-wide">{currentCard?.en}</div>
          </div>
          <button onClick={() => setView("dashboard")} className="bg-red-600 text-white px-10 py-4 rounded-full font-bold hover:bg-red-500 transition shadow-lg shadow-red-600/30 relative z-10">Qaytish</button>
       </div>
    );
    return (
      <div className={`flex-1 flex flex-col h-full w-full max-w-lg mx-auto relative overflow-hidden ${isBoss ? 'bg-black' : 'bg-slate-950'}`}>
         {/* Background Effects for Game */}
         {isBoss && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black animate-pulse-slow pointer-events-none"></div>}
         
         <div className="flex justify-between items-center p-4 z-10">
            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
               {isBoss ? <Flame className="text-red-500 animate-pulse" size={18} /> : <Trophy size={16} className="text-yellow-500"/>}
               <span className={`font-black ${isBoss ? 'text-red-500' : 'text-white'}`}>{score}</span>
            </div>
            {timer > 0 && <div className="font-mono font-bold text-xl tabular-nums tracking-widest text-slate-300">{timer}s</div>}
            <button onClick={() => setView("dashboard")} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"><X size={20} className="text-white"/></button>
         </div>
         <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
            <div className={`w-full p-10 rounded-[2rem] text-center mb-8 border-4 shadow-2xl animate-pop-in ${isBoss ? 'bg-red-950/30 border-red-900' : 'bg-slate-900 border-slate-800'}`}>
              <h2 className={`text-4xl font-black ${isBoss ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-white'}`}>{isBoss ? currentCard?.uz : currentCard?.en}</h2>
            </div>
            
            {/* Game Options Grid */}
            <div className="w-full">
              {gameMode === "wordHunt" && (
                 <div className="grid grid-cols-1 w-full gap-3">
                    {gameOptions.map((opt, i) => {
                      // Visual Feedback Logic for Arcade
                      let btnClass = "bg-slate-800 border-2 border-slate-700 text-white hover:bg-indigo-600 hover:border-indigo-500";
                      if (arcadeFeedback?.id === opt.id) {
                         btnClass = arcadeFeedback.status === 'correct' 
                            ? "bg-emerald-600 border-emerald-500 text-white ring-4 ring-emerald-500/30 scale-[1.02]" 
                            : "bg-red-600 border-red-500 text-white ring-4 ring-red-500/30 animate-shake";
                      }

                      return (
                        <button key={i} onClick={() => handleArcadeAnswer(opt.id === currentCard.id, opt.id)} className={`p-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all animate-slide-up ${btnClass}`} style={{animationDelay: `${i*0.1}s`}}>
                          {opt.uz}
                        </button>
                      );
                    })}
                 </div>
              )}
              {(gameMode === "timeAttack" || gameMode === "confusion") && (
                 <div className="grid grid-cols-2 w-full gap-3">
                    {gameOptions.map((opt, i) => {
                       // Visual Feedback Logic for Arcade
                      let btnClass = "bg-slate-800 border-2 border-slate-700 text-white hover:bg-indigo-600 hover:border-indigo-500";
                      if (arcadeFeedback?.id === opt.id) {
                         btnClass = arcadeFeedback.status === 'correct' 
                            ? "bg-emerald-600 border-emerald-500 text-white ring-4 ring-emerald-500/30 scale-[1.02]" 
                            : "bg-red-600 border-red-500 text-white ring-4 ring-red-500/30 animate-shake";
                      }
                      
                      return (
                        <button key={i} onClick={() => handleArcadeAnswer(opt.id === currentCard.id, opt.id)} className={`p-4 rounded-xl font-bold h-32 flex items-center justify-center text-center hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base leading-tight animate-slide-up ${btnClass}`} style={{animationDelay: `${i*0.1}s`}}>
                          {opt.uz}
                        </button>
                      );
                    })}
                 </div>
              )}
              {isBoss && (
                <form onSubmit={checkTyping} className="w-full relative animate-slide-up">
                  <input autoFocus value={inputVal} onChange={e => setInputVal(e.target.value)} className="w-full bg-black/50 border-b-4 border-red-800 text-center text-3xl font-black text-red-500 focus:border-red-500 outline-none p-6 placeholder-red-900/30 uppercase tracking-widest" placeholder="TYPE HERE" />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-400 transition"><ArrowRight size={32}/></button>
                </form>
              )}
            </div>
         </div>
      </div>
    );
  };

  const renderTranslator = () => {
    // const [search, setSearch] = useState(""); // REMOVED HOOK
    const activeFile = files[activeFileId];
    const results = activeFile ? activeFile.words.filter(w => w.en.toLowerCase().includes(translatorSearch.toLowerCase()) || w.uz.toLowerCase().includes(translatorSearch.toLowerCase())) : [];
    return (
       <div className="flex-1 flex flex-col p-4 w-full max-w-lg mx-auto animate-fade-in bg-slate-950">
          <div className="flex items-center gap-2 mb-6"><button onClick={() => setView("dashboard")} className="p-2 hover:bg-slate-800 rounded-full transition"><ArrowRight className="rotate-180" /></button><h2 className="font-bold text-2xl tracking-tight">Lug'at</h2></div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-4 text-slate-500" />
            <input autoFocus value={translatorSearch} onChange={e => setTranslatorSearch(e.target.value)} placeholder="So'z qidirish..." className="w-full bg-slate-900 p-4 pl-12 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-white transition-all focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pb-4">
            {results.map((w, i) => (
              <div key={w.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-all animate-slide-up" style={{animationDelay: `${i*0.05}s`}} onClick={() => speak(w.en)}>
                <div><div className="font-bold text-lg text-indigo-400">{w.en}</div><div className="text-slate-400">{w.uz}</div></div><Volume2 size={20} className="text-slate-600 hover:text-indigo-400 transition" />
              </div>
            ))}
          </div>
       </div>
    );
  };

  const renderResults = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in space-y-8 bg-slate-950 relative overflow-hidden">
       <div className="absolute inset-0 bg-emerald-500/5 animate-pulse-slow"></div>
       <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 relative z-10 animate-pop-in">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping opacity-20"></div>
          <CheckCircle size={64} className="text-emerald-500" />
       </div>
       <div className="z-10 animate-slide-up">
         <h1 className="text-4xl font-black text-white mb-2">Guruh Yakunlandi!</h1>
         <p className="text-slate-400">Yangi so'zlar muvaffaqiyatli o'zlashtirildi.</p>
       </div>
       <div className="w-full max-w-xs space-y-4 z-10 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <button onClick={() => { const nextGroup = activeGroupIndex + 1; const maxGroups = Math.ceil(files[activeFileId].words.length / GROUP_SIZE); if (nextGroup < maxGroups) startGroup(nextGroup); else setView("dashboard"); }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all">Keyingi Guruh</button>
          <button onClick={() => setView("dashboard")} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-300 hover:text-white transition-all">Menyuga Qaytish</button>
       </div>
    </div>
  );

  // --- OVERLAY RENDERERS ---

  if (isGateOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px] animate-float"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px] animate-float" style={{animationDelay: '-3s'}}></div>
        </div>

        <div className="w-full max-w-sm space-y-8 relative z-10">
          <div className="space-y-2 animate-slide-up">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tighter drop-shadow-lg">UMAROV.A</h1>
            <p className="text-slate-400 font-medium">
              {authMode === 'register' ? "Yangi hisob yaratish" : "Tizimga kirish"}
            </p>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-700/50 shadow-2xl space-y-5 animate-pop-in">
            {authMode === 'register' ? (
              <>
                <div className={`transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                  <input 
                    value={regUsername} 
                    onChange={e => { setRegUsername(e.target.value); setRegError(""); }} 
                    placeholder="Username (5-12)" 
                    className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder-slate-600" 
                    maxLength={12}
                  />
                </div>
                <div className={`transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                  <input 
                    type="password"
                    value={regPassword} 
                    onChange={e => { setRegPassword(e.target.value); setRegError(""); }} 
                    placeholder="Password" 
                    className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder-slate-600" 
                  />
                </div>
                {regError && <div className="text-red-400 text-sm font-bold bg-red-900/20 p-2 rounded-lg animate-shake">{regError}</div>}
                <button onClick={handleRegister} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-95 transition-all duration-200">Boshlash</button>
                <div className="text-xs text-slate-400 pt-2 cursor-pointer hover:text-white transition-colors font-medium" onClick={() => setAuthMode('login')}>Avval kirganmisiz? <span className="text-indigo-400">Kirish</span></div>
              </>
            ) : (
              <>
                <div className={`transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                  <input 
                    value={loginUsername} 
                    onChange={e => { setLoginUsername(e.target.value); setRegError(""); }} 
                    placeholder="Username" 
                    className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder-slate-600" 
                  />
                </div>
                <div className={`transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                  <input 
                    type="password"
                    value={loginPassword} 
                    onChange={e => { setLoginPassword(e.target.value); setRegError(""); }} 
                    placeholder="Password" 
                    className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white placeholder-slate-600" 
                  />
                </div>
                {regError && <div className="text-red-400 text-sm font-bold bg-red-900/20 p-2 rounded-lg animate-shake">{regError}</div>}
                <button onClick={handleLogin} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-95 transition-all duration-200">Kirish</button>
                <div className="text-xs text-slate-400 pt-2 cursor-pointer hover:text-white transition-colors font-medium" onClick={() => setAuthMode('register')}>Yangi foydalanuvchimisiz? <span className="text-indigo-400">Ro'yxatdan o'tish</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-full max-w-sm space-y-6 relative z-10">
          <div className="w-28 h-28 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse-slow">
            <Lock size={56} className="text-red-500 drop-shadow-lg" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white mb-2">Limit Tugadi</h2>
            <p className="text-slate-400">Sizning akkauntingizda vaqt qolmadi.</p>
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Bepul Kod</h3>
            <div className="flex gap-2">
              <input 
                value={freeCodeInput}
                onChange={e => setFreeCodeInput(e.target.value)}
                placeholder="Kod..."
                className="flex-1 bg-slate-950 border border-slate-700 p-3 rounded-xl text-center font-mono font-bold text-white outline-none focus:border-indigo-500 transition"
              />
              <button onClick={handleFreeUnlock} className="bg-white text-black px-6 rounded-xl font-bold hover:bg-slate-200 transition active:scale-95">OK</button>
            </div>
          </div>

          <div className="space-y-3">
            <a href="https://t.me/umarov_py" target="_blank" rel="noreferrer" className="block w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95">
               <Crown size={20} className="fill-white"/> Premium Olish 
            </a>
            <button onClick={logout} className="text-slate-500 text-sm hover:text-red-400 flex items-center justify-center gap-2 w-full py-2 transition-colors">
              <LogOut size={16} /> Hisobdan Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(adminSearch.toLowerCase()) || 
    u.mac_address.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 font-sans overflow-hidden flex flex-col animate-gradient">
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { bg: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        
        @keyframes pop-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-pop-in { animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s linear; }

        @keyframes pulse-slow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        
        @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient { background: linear-gradient(-45deg, #020617, #0f172a, #1e1b4b, #020617); background-size: 400% 400%; animation: gradientBG 15s ease infinite; }

        .confetti { position: fixed; width: 8px; height: 8px; z-index: 100; animation: fall linear forwards; top: -10px; }
        @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
      `}</style>
      
      {/* Top System Bar */}
      <div className="h-10 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-4 text-[10px] font-mono select-none z-50">
         <span 
           onClick={() => setProfileOpen(true)}
           className="text-slate-400 flex items-center gap-2 cursor-pointer hover:text-white transition group"
         >
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           ID: {user?.mac_address} 
           {user?.is_pro && <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded text-[9px] font-bold shadow-lg shadow-amber-500/20">PRO</span>}
         </span>
         <div className="flex gap-4 items-center">
           {/* PWA INSTALL BUTTON (RESTORED) */}
           <button onClick={handleInstallClick} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20">
             <Download size={12} /> <span className="hidden sm:inline font-bold">Yuklab Olish</span>
           </button>
           <button onClick={() => setShowAdminLogin(true)} className="text-slate-500 hover:text-white transition">Admin</button>
         </div>
      </div>

      <main className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
        {view === "manager" && renderManager()}
        {view === "dashboard" && renderDashboard()}
        {view === "translator" && renderTranslator()}
        {view === "smart_learning" && renderSmartLearning()}
        {view === "game_arcade" && renderGameArcade()}
        {view === "results" && renderResults()}
      </main>

      {/* iOS Install Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm" onClick={() => setShowIOSPrompt(false)}>
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm relative shadow-2xl text-center space-y-4 animate-pop-in" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSPrompt(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
              <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center"><Download className="text-indigo-500" size={32}/></div>
              <h3 className="text-xl font-bold text-white">Ilovani O'rnatish</h3>
              <p className="text-sm text-slate-400">iOS qurilmasiga o'rnatish uchun:</p>
              <ol className="text-left text-sm text-slate-300 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <li className="flex items-center gap-2"><Share size={16} className="text-blue-500"/> 1. "Ulashish" tugmasini bosing.</li>
                <li className="flex items-center gap-2"><Plus size={16} className="text-emerald-500"/> 2. "Ekranga qo'shish" ni tanlang.</li>
              </ol>
           </div>
        </div>
      )}

      {/* User Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-fade-in backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] w-full max-w-sm relative shadow-2xl animate-pop-in">
              <button onClick={() => setProfileOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-full transition"><X size={20}/></button>
              
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 p-1">
                       <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center border-4 border-transparent bg-clip-padding">
                          <User size={40} className="text-white" />
                       </div>
                    </div>
                    {user?.is_pro && <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black p-1.5 rounded-full border-4 border-slate-900"><Crown size={16} fill="black"/></div>}
                 </div>
                 
                 <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">{user?.username}</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-800 py-1 px-3 rounded-full inline-block">{user?.mac_address}</p>
                 </div>

                 <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 w-full flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status</span>
                    {user?.is_pro ? (
                      <span className="text-amber-500 font-black tracking-widest flex items-center gap-1"><Crown size={14}/> UNLIMITED</span>
                    ) : (
                      <span className="text-emerald-400 font-mono font-bold text-lg">{formatTimeLeft(user?.access_until - Date.now())}</span>
                    )}
                 </div>

                 <div className="pt-6 w-full border-t border-slate-800/50">
                    <div className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                       <BadgeCheck size={20} className="text-blue-500" />
                       <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Admin: Umarov Abdulloh</span>
                       <span className="text-[9px] text-slate-600 font-mono">OFFICIAL PRODUCT v6.0</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-xs space-y-6 shadow-2xl animate-pop-in">
            <div className="text-center">
               <Shield size={40} className="text-indigo-500 mx-auto mb-3" />
               <h3 className="text-2xl font-bold text-white">Admin Login</h3>
            </div>
            <div className="space-y-3">
               <input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Username" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition" />
               <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdminLogin(false)} className="flex-1 p-4 bg-slate-800 rounded-xl text-slate-400 font-bold hover:bg-slate-700 transition">Cancel</button>
              <button onClick={attemptAdminLogin} className="flex-1 p-4 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel V2 */}
      {adminPanelOpen && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col animate-fade-in">
           <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-md">
             <h2 className="font-bold text-indigo-400 flex items-center gap-2"><Shield size={20} /> Admin Panel</h2>
             <button onClick={() => setAdminPanelOpen(false)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"><X size={20} /></button>
           </div>
           <div className="p-4 bg-slate-900/50 border-b border-slate-800">
              <div className="relative">
                 <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                 <input 
                   value={adminSearch}
                   onChange={e => setAdminSearch(e.target.value)}
                   placeholder="Search MAC or Username..."
                   className="w-full bg-slate-950 border border-slate-800 pl-12 p-3.5 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                 />
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
                  <h3 className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wider">Global Config</h3>
                  <button onClick={toggleGlobalMoney} className={`w-full py-3 rounded-lg font-bold border transition-all ${globalSettings.money_mode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Money Mode: {globalSettings.money_mode ? "ON" : "OFF"}
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">ON: Access limits apply.<br/>OFF: Free for everyone.</p>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
                   <h3 className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wider">Actions</h3>
                   <button onClick={fetchAllUsers} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white border border-slate-700 flex items-center justify-center gap-2 transition-colors"><RefreshCw size={16}/> Refresh Users</button>
                </div>
              </div>

              <h3 className="font-bold text-white mb-4 pl-1">User List ({filteredUsers.length})</h3>
              <div className="space-y-3 pb-8">
                 {filteredUsers.map((u, idx) => (
                   <div key={u.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden group hover:border-slate-700 transition-colors animate-slide-up" style={{animationDelay: `${idx*0.05}s`}}>
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.is_pro ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                             {u.is_pro ? <Crown size={20} /> : <User size={20} />}
                          </div>
                          <div>
                            <div className="font-bold text-white text-lg flex items-center gap-2">
                              {u.username} 
                              {u.role === 'admin' && <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">ADMIN</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded inline-block mt-1">{u.mac_address}</div>
                          </div>
                        </div>

                        <div className="text-right">
                           {u.is_pro ? (
                             <span className="text-amber-500 font-black text-xs tracking-widest border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded">UNLIMITED</span>
                           ) : (
                             <div className="flex flex-col items-end">
                                <span className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Expires In</span>
                                <span className={`font-mono font-bold text-sm ${u.access_until > Date.now() ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {formatTimeLeft(u.access_until - Date.now())}
                                </span>
                             </div>
                           )}
                        </div>
                      </div>

                      {/* CONTROLS */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                         <div className="flex items-center gap-2">
                            <button onClick={() => adjustUserTime(u, -60)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/10 transition"><Minus size={14}/><span className="text-[10px] ml-1">1h</span></button>
                            <button onClick={() => adjustUserTime(u, 60)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/10 transition"><Plus size={14}/><span className="text-[10px] ml-1">1h</span></button>
                            <input 
                              placeholder="Min" 
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs outline-none focus:border-indigo-500 text-white"
                              type="number"
                              onChange={(e) => {
                                 if(e.target.value.length > 3) return; 
                              }}
                              onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                  adjustUserTime(u, Number(e.target.value));
                                  e.target.value = '';
                                }
                              }}
                            />
                         </div>
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleProStatus(u)} 
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition w-full ${u.is_pro ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                            >
                              {u.is_pro ? "REVOKE PRO" : "GIVE PRO"}
                            </button>
                            <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white border border-red-500/10 transition"><Trash2 size={16}/></button>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;