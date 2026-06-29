import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Flame,
  Brain,
  Send,
  Copy,
  Plus,
  Trash2,
  Settings,
  Shield,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Scissors,
  Mail,
  Calendar,
  ChevronRight,
  RefreshCw,
  Zap,
  Info,
  User,
  Lock,
  LogOut,
  Camera,
  Check,
  Award
} from 'lucide-react';
import { generateSaveMePlan, askSaveMeAI, GEMINI_MODELS } from './gemini';
import {
  registerUser,
  loginUser,
  logoutUser,
  subscribeToAuthChanges,
  updateUserProfile,
  isFirebaseConfigured
} from './firebase';

// Gorgeous built-in avatar options
const AVATARS = [
  { id: 'av-pink', value: 'linear-gradient(135deg, #ec4899, #f43f5e)', label: 'Rose Gold' },
  { id: 'av-purple', value: 'linear-gradient(135deg, #8b5cf6, #6366f1)', label: 'Neon Indigo' },
  { id: 'av-emerald', value: 'linear-gradient(135deg, #10b981, #059669)', label: 'Mint Glow' },
  { id: 'av-amber', value: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Solar Amber' }
];

function App() {
  // --- USER AUTH STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'verify'
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].value);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  // User Profile Editing States
  const [tempUsername, setTempUsername] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempAvatar, setTempAvatar] = useState('');

  // --- SETTINGS STATE ---
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('v2s_model') || 'gemini-2.5-flash');
  const [showSettings, setShowSettings] = useState(false);

  // Time & Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Tasks Database (Dynamically loaded based on currentUser)
  const [tasks, setTasks] = useState([]);

  // Task Creator Inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Work');
  const [taskPriority, setTaskPriority] = useState('Medium');
  
  // Default deadline states
  const getDefaultDate = () => {
    const d = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const pad = (num) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const getDefaultTime = () => {
    const d = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [taskDate, setTaskDate] = useState(getDefaultDate);
  const [taskTime, setTaskTime] = useState(getDefaultTime);
  const [estWorkHours, setEstWorkHours] = useState('2');

  // Interactive Focus States
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [activeSubtaskIndex, setActiveSubtaskIndex] = useState(0);
  const [focusTimeLeft, setFocusTimeLeft] = useState(0); // in seconds
  const [focusIsRunning, setFocusIsRunning] = useState(false);
  const timerRef = useRef(null);

  // Recovery Tab (Scope vs Email)
  const [recoveryTab, setRecoveryTab] = useState('scope');
  const [editedEmail, setEditedEmail] = useState('');

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hey! Deadline pressure getting to you? I'm SaveMe AI. Drop your task, and I'll break it down into micro-steps. If you're stuck, use one of the quick suggestions below, or type your question directly!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Global UX States
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [manualVibe, setManualVibe] = useState(''); // Override: 'chill' | 'focused' | 'stressed' | 'panic'

  // --- DERIVED STATE ---
  const activeTask = tasks.find(t => t.id === selectedTaskId) || null;
  const currentSubtask = activeTask && activeTask.subtasks ? activeTask.subtasks[activeSubtaskIndex] : null;

  // Real-time Stress & Vibe calculation
  let computedStress = 0;
  let computedVibe = 'chill';
  let hoursLeftVal = 0;

  if (activeTask) {
    const deadlineDate = new Date(activeTask.deadline);
    const msLeft = deadlineDate.getTime() - currentTime.getTime();
    hoursLeftVal = msLeft / (1000 * 60 * 60);

    const pendingSubtasks = activeTask.subtasks.filter(s => !s.completed);
    const estHoursRemaining = pendingSubtasks.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);

    if (hoursLeftVal <= 0) {
      computedStress = 100;
    } else {
      computedStress = Math.min(100, Math.round((estHoursRemaining / hoursLeftVal) * 100));
    }

    if (computedStress <= 25) {
      computedVibe = 'chill';
    } else if (computedStress <= 55) {
      computedVibe = 'focused';
    } else if (computedStress <= 85) {
      computedVibe = 'stressed';
    } else {
      computedVibe = 'panic';
    }
  }

  const activeVibe = manualVibe || computedVibe;
  const activeStress = activeTask ? computedStress : 0;

  const getVibeConfig = (vibe) => {
    switch (vibe) {
      case 'chill':
        return {
          label: 'Chill',
          colorClass: 'state-chill',
          strokeColor: '#10b981',
          msg: 'You have plenty of time. Keep working steadily and avoid distractions.'
        };
      case 'focused':
        return {
          label: 'Focused',
          colorClass: 'state-focused',
          strokeColor: '#6366f1',
          msg: 'Perfect pace! Work on your active step. Keep the momentum going.'
        };
      case 'stressed':
        return {
          label: 'Pressured',
          colorClass: 'state-stressed',
          strokeColor: '#f59e0b',
          msg: 'Time is getting tight. Focus purely on your current task step. Turn off notifications!'
        };
      case 'panic':
        return {
          label: 'Danger Zone',
          colorClass: 'state-panic',
          strokeColor: '#f43f5e',
          msg: 'Critical! You need to cut non-essential scope or request an extension. Act now!'
        };
      default:
        return {
          label: 'Chill',
          colorClass: 'state-chill',
          strokeColor: '#10b981',
          msg: 'Ready to tackle deadlines.'
        };
    }
  };

  const vibeConfig = getVibeConfig(activeVibe);

  // --- EFFECTS ---
  // Save settings
  useEffect(() => {
    localStorage.setItem('v2s_model', selectedModel);
  }, [selectedModel]);

  // Subscribe to Auth State (Firebase or Local Mock)
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user) {
        // Load additional user meta locally if stored
        const localMeta = JSON.parse(localStorage.getItem(`v2s_user_metadata_${user.email}`) || '{}');
        setCurrentUser({
          ...user,
          bio: user.bio || localMeta.bio || "Productive Vibe2Ship user."
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync tasks when tasks change (isolated by user email)
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`v2s_tasks_${currentUser.email}`, JSON.stringify(tasks));
    }
  }, [tasks, currentUser]);

  // Load tasks when currentUser changes (Login / Logout / Switch)
  useEffect(() => {
    if (currentUser) {
      const savedTasks = localStorage.getItem(`v2s_tasks_${currentUser.email}`);
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks);
          setTasks(parsed);
          if (parsed.length > 0) {
            setSelectedTaskId(parsed[0].id);
          } else {
            setSelectedTaskId('');
          }
        } catch (e) {
          console.error(e);
          setTasks([]);
          setSelectedTaskId('');
        }
      } else {
        // Load default tasks on initial account setup
        const initialTasks = [
          {
            id: `task-demo-${currentUser.uid}`,
            title: 'Draft VC Pitch Presentation',
            category: 'Work',
            priority: 'High',
            deadline: new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString(),
            estHours: 3.5,
            status: 'pending',
            subtasks: [
              {
                id: 'sub-1',
                title: 'Outline the narrative & structure (10-12 slides)',
                durationMinutes: 45,
                completed: false,
                helperPrompt: 'Draft an outline for a VC pitch deck for a startup building AI productivity companions.',
                snippet: 'Slide 1: Hook\nSlide 2: Problem\nSlide 3: Solution\nSlide 4: Market Size\nSlide 5: Architecture'
              },
              {
                id: 'sub-2',
                title: 'Write content for Problem and Solution slides',
                durationMinutes: 60,
                completed: false,
                helperPrompt: 'Write a compelling problem statement about deadline panic and procrastination.',
                snippet: 'PROBLEM:\n- Passives reminder apps are ignored.\n- Procrastination locks people out of beginning.'
              }
            ],
            scopeCutRecommendations: [
              "Skip custom slide transitions (saves 40 mins).",
              "Minimize competitor slide slides (saves 20 mins)."
            ],
            extensionEmailDraft: `Subject: VC Presentation Prep Update\n\nHi Team,\n\nI'm polishing the pitch slides. To make sure the forecasting metrics are exact, I request an extra 12 hours.\n\nWarm regards,\n${currentUser.displayName}`,
            stressScore: 50
          }
        ];
        setTasks(initialTasks);
        setSelectedTaskId(initialTasks[0].id);
      }
      // Populate temp editing details
      setTempUsername(currentUser.displayName || '');
      setTempBio(currentUser.bio || 'Productive Vibe2Ship user.');
      setTempAvatar(currentUser.photoURL || AVATARS[0].value);
    } else {
      setTasks([]);
      setSelectedTaskId('');
    }
    setActiveSubtaskIndex(0);
  }, [currentUser]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Focus Timer when subtask changes
  useEffect(() => {
    if (currentSubtask) {
      setFocusTimeLeft(currentSubtask.durationMinutes * 60);
      setFocusIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [selectedTaskId, activeSubtaskIndex, currentSubtask]);

  // Pomodoro Countdown Runner
  useEffect(() => {
    if (focusIsRunning) {
      timerRef.current = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            // Audio chime
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.3);
            } catch (e) {
              console.log("Audio chime error:", e);
            }

            handleToggleSubtask(selectedTaskId, activeSubtaskIndex, true);
            setFocusIsRunning(false);
            clearInterval(timerRef.current);
            alert(`Step complete! Good job, ${currentUser?.displayName}. Focus block completed.`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [focusIsRunning, selectedTaskId, activeSubtaskIndex]);

  // Sync edited email input with selected task email draft
  useEffect(() => {
    if (activeTask) {
      setEditedEmail(activeTask.extensionEmailDraft || '');
    }
  }, [selectedTaskId, activeTask]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // --- AUTH ACTIONS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authMode === 'login') {
      try {
        const user = await loginUser(authEmail, authPassword);
        
        if (!isFirebaseConfigured) {
          // Local storage mock needs a mock verification step
          generateCodeAndVerify(user);
        } else {
          // Real Firebase automatically updates state via subscribeToAuthChanges
          setCurrentUser(user);
          setChatMessages([
            { sender: 'ai', text: `Welcome back, ${user.displayName}! Ready to beat some deadlines? Let's check your active focus plan.` }
          ]);
        }
      } catch (err) {
        console.error(err);
        let errMsg = "Failed to sign in. Please verify your credentials.";
        if (err.code === 'auth/invalid-credential' || err.message.includes('credential')) {
          errMsg = "Invalid email or password combination.";
        }
        alert(errMsg);
      }
    } else if (authMode === 'signup') {
      try {
        const user = await registerUser(authEmail, authPassword, authUsername, selectedAvatar);
        
        if (!isFirebaseConfigured) {
          // Local storage mock verification step
          generateCodeAndVerify(user);
        } else {
          alert(`🎉 Registration Successful!\n\nReal verification email sent to ${authEmail}.\n\nPlease click the activation link in your email and log in.`);
          setAuthMode('login');
        }
      } catch (err) {
        console.error(err);
        let errMsg = err.message;
        if (err.code === 'auth/email-already-in-use' || err.message.includes('already')) {
          errMsg = "This email is already registered.";
        } else if (err.code === 'auth/weak-password') {
          errMsg = "Password is too weak. Must be at least 6 characters.";
        }
        alert(errMsg);
      }
    }
  };

  const generateCodeAndVerify = (userObj) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit pin
    setSentCode(code);
    setAuthMode('verify');
    
    console.log(`[Vibe2Ship Verification] Mock Email to ${userObj.email}: Verification pin is: ${code}`);
    alert(`✉️ [Local Demo: Verification Code Sent!]\nWe've sent a 4-digit activation PIN to your registered email.\n\n👉 Verification Code: ${code}`);
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (verificationCode === sentCode) {
      // Mark verified locally
      const registry = JSON.parse(localStorage.getItem('v2s_users_db') || '[]');
      const updatedUsers = registry.map(u => {
        if (u.email === authEmail) {
          return { ...u, emailVerified: true };
        }
        return u;
      });
      localStorage.setItem('v2s_users_db', JSON.stringify(updatedUsers));
      
      const verifiedUser = updatedUsers.find(u => u.email === authEmail);
      setCurrentUser(verifiedUser);
      localStorage.setItem('v2s_current_user', JSON.stringify(verifiedUser));
      setAuthMode('login');
      setVerificationCode('');
    } else {
      alert("Incorrect verification code. Please check console or try resending.");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn("Firebase signout error:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem('v2s_current_user');
    setAuthEmail('');
    setAuthPassword('');
    setAuthUsername('');
    setShowProfilePanel(false);
  };

  // Profile Customization Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const updatedUser = await updateUserProfile(tempUsername, tempBio, tempAvatar, currentUser);
      setCurrentUser(updatedUser);
      setShowProfilePanel(false);
      alert("Profile details updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile details: " + err.message);
    }
  };

  // --- DASHBOARD ACTIONS ---
  // Create Plan Action
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setLoadingPlan(true);
    const newTaskId = `task-${Date.now()}`;
    const deadlineDate = new Date(`${taskDate}T${taskTime}`);
    const msLeft = deadlineDate.getTime() - Date.now();
    const hoursLeft = Math.max(0.5, msLeft / (1000 * 60 * 60));
    
    const skeletonTask = {
      id: newTaskId,
      title: taskTitle,
      category: taskCategory,
      priority: taskPriority,
      deadline: deadlineDate.toISOString(),
      estHours: parseFloat(estWorkHours),
      status: 'pending',
      subtasks: [],
      scopeCutRecommendations: [],
      extensionEmailDraft: "",
      stressScore: 50
    };

    setTasks(prev => [skeletonTask, ...prev]);
    setSelectedTaskId(newTaskId);
    setActiveSubtaskIndex(0);

    try {
      const result = await generateSaveMePlan(
        taskTitle,
        taskCategory,
        hoursLeft,
        selectedModel
      );

      setTasks(prev => prev.map(t => {
        if (t.id === newTaskId) {
          return {
            ...t,
            subtasks: result.subtasks.map((sub, idx) => ({
              id: `sub-${newTaskId}-${idx}`,
              title: sub.title,
              durationMinutes: sub.durationMinutes,
              completed: false,
              helperPrompt: sub.helperPrompt || "Help me start on this subtask.",
              snippet: sub.snippet || ""
            })),
            scopeCutRecommendations: result.scopeCutRecommendations || [],
            extensionEmailDraft: result.extensionEmailDraft || ""
          };
        }
        return t;
      }));

      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: `🚀 Plan ready! I've broken down "${taskTitle}" into ${result.subtasks.length} subtasks. Click 'Focus Now' in the player when you are ready to begin step 1.` }
      ]);

      setTaskTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = (taskId, subtaskIdx, forceValue = null) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newSubtasks = [...t.subtasks];
        const val = forceValue !== null ? forceValue : !newSubtasks[subtaskIdx].completed;
        newSubtasks[subtaskIdx] = { ...newSubtasks[subtaskIdx], completed: val };
        return { ...t, subtasks: newSubtasks };
      }
      return t;
    }));
  };

  // Delete Task Action
  const handleDeleteTask = (taskId, e) => {
    e.stopPropagation();
    if (confirm("Delete this task focus?")) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(tasks[0]?.id || null);
        setActiveSubtaskIndex(0);
      }
    }
  };

  // Triage Scope Action (Reduce durations by 30%)
  const handleTriageScope = () => {
    if (!activeTask) return;
    
    setTasks(prev => prev.map(t => {
      if (t.id === selectedTaskId) {
        const updatedSubs = t.subtasks.map(s => {
          if (!s.completed) {
            return { ...s, durationMinutes: Math.max(5, Math.round(s.durationMinutes * 0.7)) };
          }
          return s;
        });

        const sumRemainingMinutes = updatedSubs.filter(s => !s.completed).reduce((sum, s) => sum + s.durationMinutes, 0);
        return {
          ...t,
          subtasks: updatedSubs,
          estHours: parseFloat((sumRemainingMinutes / 60).toFixed(1))
        };
      }
      return t;
    }));

    setChatMessages(prev => [
      ...prev,
      { sender: 'ai', text: "⚡ Scope Triaged! I've compressed your remaining subtask durations by 30% by cutting secondary tasks. Work fast, stay focused, and let's get the core features completed!" }
    ]);
  };

  // Copy helpers
  const handleCopyText = (text, statusSetter) => {
    navigator.clipboard.writeText(text);
    statusSetter(true);
    setTimeout(() => statusSetter(false), 2000);
  };

  // Chat message submission
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const activeSubtaskName = currentSubtask ? currentSubtask.title : 'None';
      const taskContextObj = activeTask ? {
        title: activeTask.title,
        category: activeTask.category,
        hoursLeft: hoursLeftVal.toFixed(1),
        currentStep: activeSubtaskName
      } : null;

      const aiResponse = await askSaveMeAI(userMsg, taskContextObj, selectedModel);
      
      setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I had an error analyzing that. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChipClick = (promptText) => {
    setChatInput(promptText);
    setTimeout(() => {
      const form = document.getElementById('chat-input-form-id');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 50);
  };

  // --- RENDER HELPERS ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timeline hours generator
  const getTimelineFlow = () => {
    if (!activeTask || !activeTask.subtasks) return [];
    
    let baseTime = new Date();
    return activeTask.subtasks.map((sub, idx) => {
      const nodeTime = new Date(baseTime.getTime());
      baseTime = new Date(baseTime.getTime() + sub.durationMinutes * 60000);
      
      return {
        id: sub.id,
        title: sub.title,
        durationMinutes: sub.durationMinutes,
        timeString: nodeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completed: sub.completed,
        active: idx === activeSubtaskIndex
      };
    });
  };

  const timelineNodes = getTimelineFlow();

  const [copiedPromptId, setCopiedPromptId] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // IF USER IS NOT LOGGED IN, RENDER AUTH CARD PORTAL
  if (!currentUser) {
    return (
      <main style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
        <section className="auth-card" id="auth-panel-container">
          <div className="brand-section" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="logo-icon">
              <Zap size={20} />
            </div>
            <div>
              <h1 className="brand-name" style={{ fontSize: '24px', margin: 0 }}>Vibe2Ship</h1>
              <div className="tagline">The Last-Minute Life Saver</div>
            </div>
          </div>

          {authMode !== 'verify' ? (
            <>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => setAuthMode('login')}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                  onClick={() => setAuthMode('signup')}
                >
                  Register
                </button>
              </div>

              <form className="task-creator-form" onSubmit={handleAuthSubmit} style={{ marginTop: '20px' }}>
                {authMode === 'signup' && (
                  <div>
                    <label htmlFor="auth-username-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                      Username
                    </label>
                    <div className="input-with-icon">
                      <User className="input-icon" size={14} />
                      <input
                        id="auth-username-input"
                        type="text"
                        className="input-field-with-icon"
                        placeholder="e.g. John Doe"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Email Address
                  </label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={14} />
                    <input
                      id="auth-email-input"
                      type="email"
                      className="input-field-with-icon"
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-pass-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Password
                  </label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={14} />
                    <input
                      id="auth-pass-input"
                      type="password"
                      className="input-field-with-icon"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                      Select Profile Color Theme
                    </label>
                    <div className="avatar-selector">
                      {AVATARS.map(av => (
                        <button
                          key={av.id}
                          type="button"
                          className={`avatar-option ${selectedAvatar === av.value ? 'selected' : ''}`}
                          style={{ background: av.value }}
                          onClick={() => setSelectedAvatar(av.value)}
                          aria-label={av.label}
                          title={av.label}
                        >
                          {selectedAvatar === av.value && <Check size={14} color="#fff" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  {authMode === 'login' ? 'Log In to Workspace' : 'Create Secure Account'}
                </button>
              </form>
            </>
          ) : (
            <form className="task-creator-form" onSubmit={handleVerifySubmit} style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <Mail size={32} style={{ color: 'var(--color-primary)', alignSelf: 'center' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Verify Your Email</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  We sent a 4-digit verification code to <strong>{authEmail}</strong>. Enter it below to activate your profile.
                </p>
              </div>

              <div>
                <label htmlFor="verify-code-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                  Verification PIN
                </label>
                <input
                  id="verify-code-input"
                  type="text"
                  maxLength="4"
                  className="input-field"
                  placeholder="e.g. 1234"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  style={{ textAlign: 'center', letterSpacing: '12px', fontSize: '20px', fontFamily: 'var(--font-mono)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setAuthMode('signup')}
                >
                  Back
                </button>
                <button
                  id="verify-submit-btn"
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Verify Code
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    );
  }

  // STANDARD LOGGED-IN VIEW RENDER
  return (
    <>
      {/* HEADER SECTION */}
      <header>
        <div className="brand-section">
          <div className="logo-icon">
            <Zap size={20} />
          </div>
          <div>
            <h1 className="brand-name">Vibe2Ship</h1>
            <div className="tagline">The Last-Minute Life Saver</div>
          </div>
        </div>

        <div className="top-bar-actions">
          <div className="current-time-badge" id="current-time-badge-id">
            <Clock size={14} />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <button
            id="settings-toggle-btn"
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="System Settings"
            title="Configure System Settings"
          >
            <Settings size={18} />
          </button>

          {/* USER ACCOUNT BADGE */}
          <button
            type="button"
            className="user-profile-badge-btn"
            style={{ background: currentUser.photoURL }}
            onClick={() => setShowProfilePanel(!showProfilePanel)}
            title="View User Profile"
            aria-label="View Profile"
          >
            {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
          </button>
        </div>
      </header>

      {/* SECURE SETTINGS DRAWER OVERLAY */}
      {showSettings && (
        <section className="settings-drawer" id="settings-drawer-panel">
          <h2 className="panel-title" style={{ fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            <Shield size={14} style={{ color: 'var(--color-success)' }} /> System Settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" style={{ borderColor: 'transparent', borderTopColor: 'var(--color-success)', width: '12px', height: '12px' }}></span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>
                Backend Status: SECURE PROXY
              </span>
            </div>

            <div style={{ background: isFirebaseConfigured ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)', border: isFirebaseConfigured ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} style={{ color: isFirebaseConfigured ? 'var(--color-warning)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: isFirebaseConfigured ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                Auth Type: {isFirebaseConfigured ? 'Firebase Production' : 'Mock Local Mode'}
              </span>
            </div>

            <div>
              <label htmlFor="model-select-id" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Gemini Model Selection
              </label>
              <select
                id="model-select-id"
                className="select-field"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ fontSize: '12px', padding: '8px' }}
              >
                {GEMINI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '4px' }}>
              <Shield size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong>Access Isolated:</strong> API keys are securely loaded on the node server via <code>.env</code>. The client browser has no direct access to credentials, preventing leakage on deployment.
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowSettings(false)}
              style={{ padding: '6px 0', width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              Done
            </button>
          </div>
        </section>
      )}

      {/* USER PROFILE MODAL DRAWER */}
      {showProfilePanel && (
        <section className="settings-drawer" id="profile-drawer-panel" style={{ right: '24px', top: '80px', width: '340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '14px' }}>
            <div style={{ background: currentUser.photoURL, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 700 }}>
              {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>{currentUser.displayName}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{currentUser.email}</span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label htmlFor="prof-username-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Display Name
              </label>
              <input
                id="prof-username-input"
                type="text"
                className="input-field"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="prof-bio-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Bio
              </label>
              <textarea
                id="prof-bio-input"
                className="email-textarea"
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                style={{ height: '60px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Choose Profile Theme
              </label>
              <div className="avatar-selector">
                {AVATARS.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    className={`avatar-option ${tempAvatar === av.value ? 'selected' : ''}`}
                    style={{ background: av.value }}
                    onClick={() => setTempAvatar(av.value)}
                    aria-label={av.label}
                    title={av.label}
                  >
                    {tempAvatar === av.value && <Check size={14} color="#fff" />}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLogout}
                style={{ flex: 1, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
              >
                <LogOut size={13} /> Log Out
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 2 }}
              >
                Save Profile
              </button>
            </div>
          </form>
        </section>
      )}

      {/* DASHBOARD GRID CONTAINER */}
      <main className="dashboard-grid">
        
        {/* LEFT COLUMN: VIBE-O-METER & STATS */}
        <section className="sidebar-left">
          
          {/* VIBE-O-METER PANEL */}
          <div className="panel vibe-o-meter" id="vibe-o-meter-panel">
            <h2 className="panel-title">
              <Brain size={16} /> Vibe-O-Meter
            </h2>
            
            <div className="vibe-status-container">
              <div className={`vibe-status ${vibeConfig.colorClass}`}>
                <Flame size={14} />
                <span>{vibeConfig.label}</span>
              </div>
            </div>

            <div className="gauge-container">
              <svg className="gauge-svg">
                <circle className="gauge-bg" cx="80" cy="80" r="66" />
                <circle
                  className="gauge-fill"
                  cx="80"
                  cy="80"
                  r="66"
                  stroke={vibeConfig.strokeColor}
                  strokeDasharray="414"
                  strokeDashoffset={414 - (414 * activeStress) / 100}
                />
              </svg>
              <div className="gauge-info">
                <span className="gauge-percentage">{activeStress}%</span>
                <span className="gauge-label">Stress</span>
              </div>
            </div>

            <p className="vibe-meter-message">
              {activeTask ? vibeConfig.msg : "Add a deadline task below to start tracking your urgency state."}
            </p>

            <div className="vibe-controls">
              <button
                type="button"
                className={`vibe-toggle-btn chill-sel ${activeVibe === 'chill' ? 'active' : ''}`}
                onClick={() => setManualVibe(manualVibe === 'chill' ? '' : 'chill')}
              >
                Chill
              </button>
              <button
                type="button"
                className={`vibe-toggle-btn focus-sel ${activeVibe === 'focused' ? 'active' : ''}`}
                onClick={() => setManualVibe(manualVibe === 'focused' ? '' : 'focused')}
              >
                Focus
              </button>
              <button
                type="button"
                className={`vibe-toggle-btn stress-sel ${activeVibe === 'stressed' ? 'active' : ''}`}
                onClick={() => setManualVibe(manualVibe === 'stressed' ? '' : 'stressed')}
              >
                Pressure
              </button>
              <button
                type="button"
                className={`vibe-toggle-btn panic-sel ${activeVibe === 'panic' ? 'active' : ''}`}
                onClick={() => setManualVibe(manualVibe === 'panic' ? '' : 'panic')}
              >
                Panic
              </button>
            </div>
          </div>

          {/* QUICK STATS PANEL */}
          <div className="panel" id="stats-panel-id">
            <h2 className="panel-title">
              <Zap size={16} /> Work Summary
            </h2>
            <div className="stats-summary">
              <div className="stat-item">
                <span className="stat-val">{tasks.length}</span>
                <span className="stat-lbl">Active Deadlines</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">
                  {tasks.reduce((sum, t) => sum + t.subtasks.filter(s => !s.completed).length, 0)}
                </span>
                <span className="stat-lbl">Steps Remaining</span>
              </div>
            </div>
            
            {activeTask && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hours Left:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: hoursLeftVal < 1 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                    {hoursLeftVal > 0 ? `${hoursLeftVal.toFixed(1)} hrs` : "Expired"}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Work Needed:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {activeTask.subtasks.filter(s => !s.completed).reduce((sum, s) => sum + s.durationMinutes, 0)} mins
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CENTER PANEL: CREATE & MANAGE PLANS + FOCUS POMODORO */}
        <section className="center-panel">
          
          {/* TASK GENERATOR FORM */}
          <div className="panel" id="task-creator-panel">
            <h2 className="panel-title">
              <Sparkles size={16} /> Plan a New Deadline
            </h2>
            <form className="task-creator-form" onSubmit={handleCreateTask}>
              <input
                id="task-title-input"
                type="text"
                className="input-field"
                placeholder="What is your deadline task? (e.g. Write economics research essay)"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
              <div className="form-row">
                <div>
                  <label htmlFor="task-cat-select" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</label>
                  <select
                    id="task-cat-select"
                    className="select-field"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                  >
                    <option value="Work">Work</option>
                    <option value="Study">Study</option>
                    <option value="Personal">Personal</option>
                    <option value="Side Hustle">Side Hustle</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-date-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Due Date</label>
                  <div className="input-with-icon">
                    <Calendar className="input-icon" size={14} />
                    <input
                      id="task-date-input"
                      type="date"
                      className="input-field-with-icon"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="task-time-input" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Due Time</label>
                  <div className="input-with-icon">
                    <Clock className="input-icon" size={14} />
                    <input
                      id="task-time-input"
                      type="time"
                      className="input-field-with-icon"
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="task-est-hours" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Work Est (hrs)</label>
                  <input
                    id="task-est-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="input-field"
                    value={estWorkHours}
                    onChange={(e) => setEstWorkHours(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                id="generate-plan-btn"
                type="submit"
                className="btn-primary"
                disabled={loadingPlan}
              >
                {loadingPlan ? (
                  <>
                    <span className="spinner"></span> Breaking down plan with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Build SaveMe AI Action Plan
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ACTIVE FOCUS PLAYER PANEL */}
          <div className="panel focus-player-panel" id="focus-pomodoro-panel">
            <h2 className="panel-title">
              <Clock size={16} /> Focus Pomodoro Session
            </h2>

            {!activeTask ? (
              <div className="focus-player-empty">
                <Info size={28} style={{ color: 'var(--text-muted)' }} />
                <p>No active deadlines. Enter your task above to get a breakdown and launch focus mode.</p>
              </div>
            ) : activeTask.subtasks.length === 0 ? (
              <div className="focus-player-empty">
                <span className="spinner big-spinner"></span>
                <p>Analyzing deadline complexity. Breaking down tasks into actionable micro-steps...</p>
              </div>
            ) : (
              <div>
                <div className="focus-player-header">
                  <div className="focus-task-info">
                    <span className="focus-task-title">{activeTask.title}</span>
                    <span className="focus-step-indicator">
                      Step {activeSubtaskIndex + 1} of {activeTask.subtasks.length}: {currentSubtask ? currentSubtask.title : ''}
                    </span>
                  </div>
                  <div className="task-meta-badges">
                    <span className={`badge badge-${activeTask.category.toLowerCase().replace(' ', '')}`}>{activeTask.category}</span>
                  </div>
                </div>

                <div className="focus-timer-display" id="focus-timer-display-id">
                  {formatTime(focusTimeLeft)}
                </div>

                <div className="focus-controls">
                  <button
                    id="timer-play-btn"
                    type="button"
                    className={`focus-btn play`}
                    onClick={() => setFocusIsRunning(!focusIsRunning)}
                  >
                    {focusIsRunning ? (
                      <>
                        <Pause size={15} /> Pause Step
                      </>
                    ) : (
                      <>
                        <Play size={15} /> Focus Now
                      </>
                    )}
                  </button>

                  <button
                    id="timer-skip-btn"
                    type="button"
                    className="focus-btn"
                    onClick={() => {
                      if (activeSubtaskIndex < activeTask.subtasks.length - 1) {
                        setActiveSubtaskIndex(activeSubtaskIndex + 1);
                      }
                    }}
                    disabled={activeSubtaskIndex >= activeTask.subtasks.length - 1}
                  >
                    <SkipForward size={14} /> Skip Step
                  </button>

                  <button
                    id="timer-complete-btn"
                    type="button"
                    className="focus-btn"
                    onClick={() => handleToggleSubtask(selectedTaskId, activeSubtaskIndex)}
                    style={{ borderColor: currentSubtask?.completed ? 'var(--color-success)' : 'var(--border-color)' }}
                  >
                    <CheckCircle2 size={14} style={{ color: currentSubtask?.completed ? 'var(--color-success)' : 'inherit' }} />
                    {currentSubtask?.completed ? 'Completed' : 'Mark Done'}
                  </button>
                </div>

                {currentSubtask && (
                  <div className="active-subtask-description-card">
                    <div className="active-subtask-title">
                      <Sparkles size={14} style={{ color: 'var(--color-primary)' }} /> AI Execution Guide
                    </div>
                    <p className="active-subtask-guidance">
                      💡 <strong>Action Tip:</strong> Use the prompt templates or templates below to speed up execution.
                    </p>

                    {currentSubtask.snippet && (
                      <div className="active-subtask-snippet-box">
                        {currentSubtask.snippet}
                      </div>
                    )}

                    <div className="subtask-prompt-action">
                      <span className="subtask-prompt-text" title={currentSubtask.helperPrompt}>
                        Prompt: "{currentSubtask.helperPrompt}"
                      </span>
                      <button
                        type="button"
                        className="copy-prompt-btn"
                        onClick={() => handleCopyText(currentSubtask.helperPrompt, (val) => setCopiedPromptId(val ? currentSubtask.id : ''))}
                      >
                        {copiedPromptId === currentSubtask.id ? 'Copied!' : 'Copy Prompt'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTIVE TASKS CONTAINER */}
          <div className="panel" id="all-tasks-panel">
            <h2 className="panel-title" style={{ justifyContent: 'space-between' }}>
              <span><Calendar size={16} /> All Active Plans</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{tasks.length} total</span>
            </h2>

            <div className="tasks-container">
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No active focus plans yet. Add one above!
                </div>
              ) : (
                tasks.map((t) => {
                  const deadlineDate = new Date(t.deadline);
                  
                  return (
                    <div
                      key={t.id}
                      className={`task-card ${t.id === selectedTaskId ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setActiveSubtaskIndex(0);
                      }}
                    >
                      <div className="task-card-header">
                        <span className="task-title-text">{t.title}</span>
                        <div className="task-meta-badges">
                          <span className={`badge badge-${t.category.toLowerCase().replace(' ', '')}`}>{t.category}</span>
                          <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        </div>
                      </div>

                      <div className="task-card-body">
                        <div className="subtask-progress-bar-container">
                          <div
                            className="subtask-progress-fill"
                            style={{
                              width: `${t.subtasks && t.subtasks.length > 0
                                ? Math.round((t.subtasks.filter(s => s.completed).length / t.subtasks.length) * 100)
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="subtask-ratio">
                          {t.subtasks ? t.subtasks.filter(s => s.completed).length : 0}/{t.subtasks ? t.subtasks.length : 0} steps
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="task-time-rem">
                          <Clock size={11} /> Due: {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})
                        </span>

                        <div className="task-card-actions">
                          <button
                            type="button"
                            className="task-action-btn delete"
                            onClick={(e) => handleDeleteTask(t.id, e)}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: AI RECOVERY PLAN & SAVE ME COACH CHAT */}
        <section className="sidebar-right">
          
          {/* AI RECOVERY PLAN & ACTIONS */}
          <div className="panel recovery-panel" id="ai-recovery-panel">
            <h2 className="panel-title">
              <Scissors size={16} /> Recovery Strategy
            </h2>

            {!activeTask ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                Select or create a plan to calculate active recovery options.
              </div>
            ) : (
              <div>
                <div className="recovery-tabs">
                  <button
                    type="button"
                    className={`recovery-tab-btn ${recoveryTab === 'scope' ? 'active' : ''}`}
                    onClick={() => setRecoveryTab('scope')}
                  >
                    <Scissors size={13} /> Cut Scope
                  </button>
                  <button
                    type="button"
                    className={`recovery-tab-btn ${recoveryTab === 'email' ? 'active' : ''}`}
                    onClick={() => setRecoveryTab('email')}
                  >
                    <Mail size={13} /> Ask Extension
                  </button>
                </div>

                <div className="recovery-content-box" style={{ marginTop: '14px' }}>
                  {recoveryTab === 'scope' ? (
                    <div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        🚨 <strong>Struggling to hit the deadline?</strong> Apply these AI triage suggestions to reduce complexity and focus on shipment:
                      </p>
                      
                      <div className="scope-cuts-list">
                        {activeTask.scopeCutRecommendations && activeTask.scopeCutRecommendations.length > 0 ? (
                          activeTask.scopeCutRecommendations.map((cut, idx) => (
                            <div key={idx} className="scope-cut-item">
                              <AlertTriangle size={14} className="scope-cut-icon" />
                              <span>{cut}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No triage options generated yet. Add a plan.</div>
                        )}
                      </div>

                      {activeTask.subtasks && activeTask.subtasks.filter(s => !s.completed).length > 0 && (
                        <button
                          id="triage-scope-btn"
                          type="button"
                          className="btn-primary"
                          onClick={handleTriageScope}
                          style={{ width: '100%', marginTop: '14px', fontSize: '12px', padding: '8px' }}
                        >
                          <Scissors size={13} /> Compress Work Hours (Triage Scope)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="email-draft-box">
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        📝 Edit this AI-crafted message to request additional preparation time:
                      </p>
                      <textarea
                        id="extension-email-draft-text"
                        className="email-textarea"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        placeholder="Loading extension request draft..."
                      />
                      <div className="email-actions">
                        <button
                          id="copy-email-draft-btn"
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleCopyText(editedEmail, setCopiedEmail)}
                        >
                          <Copy size={13} /> {copiedEmail ? 'Copied!' : 'Copy Draft'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SAVE ME AI CHAT COMPANION */}
          <div className="panel ai-chat-panel" id="ai-chat-panel-id">
            <h2 className="panel-title">
              <Sparkles size={16} style={{ color: 'var(--color-primary)' }} /> SaveMe AI Coach
            </h2>

            <div className="chat-history">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.sender}`}>
                  {msg.text.split('\n').map((para, pIdx) => (
                    <p key={pIdx} style={{ marginBottom: pIdx < msg.text.split('\n').length - 1 ? '8px' : 0 }}>
                      {para}
                    </p>
                  ))}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-message ai" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner"></span> <span>AI is coaching...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-suggested-prompts">
              <button
                type="button"
                className="suggested-prompt-chip"
                onClick={() => handleChipClick("Explain current focus step simply")}
              >
                Explain step
              </button>
              <button
                type="button"
                className="suggested-prompt-chip"
                onClick={() => handleChipClick("I am getting distracted, give me a motivation boost!")}
              >
                Motivate me
              </button>
              <button
                type="button"
                className="suggested-prompt-chip"
                onClick={() => handleChipClick("Give me a quick 5-minute energy hack")}
              >
                Energy Hack
              </button>
              <button
                type="button"
                className="suggested-prompt-chip"
                onClick={() => handleChipClick("Suggest outline template for this subtask")}
              >
                Need Template
              </button>
            </div>

            <form className="chat-input-form" id="chat-input-form-id" onSubmit={handleSendMessage}>
              <input
                id="chat-input-box"
                type="text"
                className="chat-input"
                placeholder="Ask SaveMe AI anything..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button
                id="chat-send-btn-id"
                type="submit"
                className="chat-send-btn"
                disabled={chatLoading}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </section>

        {/* TIMELINE VISUAL FLOW BLOCK */}
        {activeTask && activeTask.subtasks && activeTask.subtasks.length > 0 && (
          <section className="panel timeline-panel" id="timeline-flow-panel">
            <h2 className="panel-title">
              <Calendar size={16} /> SaveMe AI Focus Timeline Flow (Now until Deadline)
            </h2>
            <div className="timeline-flow">
              {timelineNodes.map((node, idx) => (
                <div
                  key={node.id}
                  className={`timeline-node ${node.completed ? 'completed' : ''} ${node.active ? 'active' : ''}`}
                >
                  <div className="timeline-time">{node.timeString}</div>
                  <div className="timeline-task-title" title={node.title}>{node.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="timeline-duration">{node.durationMinutes} mins</span>
                    {node.completed ? (
                      <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
                    ) : node.active ? (
                      <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', fontSize: '8px' }}>ACTIVE</span>
                    ) : null}
                  </div>
                  {idx < timelineNodes.length - 1 && (
                    <div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>
              ))}
              <div className="timeline-node" style={{ flex: '0 0 160px', borderColor: 'var(--color-danger)', borderStyle: 'dashed', background: 'rgba(244, 63, 94, 0.02)' }}>
                <div className="timeline-time" style={{ color: 'var(--color-danger)' }}>
                  {new Date(activeTask.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="timeline-task-title" style={{ color: 'var(--color-danger)', fontWeight: 700 }}>DEADLINE</div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Finish Line! 🏁</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

export default App;
