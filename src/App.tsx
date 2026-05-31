import { useState, useEffect } from "react";
import { UserPrepState, DailyScheduleTask, TestAttempt } from "./types";
import Dashboard from "./components/Dashboard";
import MockTestArena from "./components/MockTestArena";
import StudyScheduler from "./components/StudyScheduler";
import ProgressTracker from "./components/ProgressTracker";
import ForumRoom from "./components/ForumRoom";
import MentorConsole from "./components/MentorConsole";

import { 
  Gauge, 
  Award, 
  Calendar, 
  BookOpenCheck, 
  MessageSquare, 
  Bot, 
  RefreshCw,
  BookOpen,
  CloudLightning,
  Sparkles,
  Menu,
  X
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [state, setState] = useState<UserPrepState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Fetch state on mount
  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch("/api/state");
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (err) {
        console.error("Failed to load initial preparation state:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, []);

  // Sync state helper to submit updates to our server JSON database
  const saveStateToServer = async (updatedState: UserPrepState) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedState)
      });
      if (!res.ok) {
        console.error("Failed to save state on server.");
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleTopicCompletion = (topicId: string, completed: boolean) => {
    if (!state) return;
    
    const updatedSyllabus = state.syllabus.map(subj => {
      subj.topics = subj.topics.map(t => {
        if (t.id === topicId) {
          // Increment revision count incrementally if completed is ticked true
          const revisionCount = completed ? t.revisionCount + 1 : t.revisionCount;
          return { ...t, completed, revisionCount };
        }
        return t;
      });
      return subj;
    });

    const updatedState = { ...state, syllabus: updatedSyllabus };
    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleToggleNotesDownload = (topicId: string) => {
    if (!state) return;

    const updatedSyllabus = state.syllabus.map(subj => {
      subj.topics = subj.topics.map(t => {
        if (t.id === topicId) {
          return { ...t, notesDownloaded: true };
        }
        return t;
      });
      return subj;
    });

    const updatedState = { ...state, syllabus: updatedSyllabus };
    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleAddTask = (date: string, task: Omit<DailyScheduleTask, "id" | "completed">) => {
    if (!state) return;

    let schedule = state.schedules.find(s => s.date === date);
    const newTask: DailyScheduleTask = {
      ...task,
      id: "task_" + Date.now(),
      completed: false
    };

    let updatedSchedules = [...state.schedules];
    if (!schedule) {
      schedule = {
        date: date,
        dayName: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
        targetDailyHours: 6,
        completedHours: 0,
        tasks: [newTask]
      };
      updatedSchedules.push(schedule);
    } else {
      updatedSchedules = state.schedules.map(s => {
        if (s.date === date) {
          return { ...s, tasks: [...s.tasks, newTask] };
        }
        return s;
      });
    }

    const updatedState = { ...state, schedules: updatedSchedules };
    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleToggleTask = (date: string, taskId: string, completed: boolean) => {
    if (!state) return;

    const updatedSchedules = state.schedules.map(s => {
      if (s.date === date) {
        const tasks = s.tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, completed };
          }
          return t;
        });

        const completedMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.durationMinutes, 0);
        const completedHours = parseFloat((completedMinutes / 60).toFixed(1));

        return { ...s, tasks, completedHours };
      }
      return s;
    });

    const updatedState = { ...state, schedules: updatedSchedules };
    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleGenerateAISchedule = async (date: string, hours: number) => {
    if (!state) return;
    try {
      const res = await fetch("/api/schedule/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate: date, dailyHours: hours })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error("AI scheduler fetch failed:", err);
    }
  };

  const handleAddAttemptResult = (attempt: Omit<TestAttempt, "id" | "attemptedAt">) => {
    if (!state) return;
    
    // Add attempt
    const newAttempt: TestAttempt = {
      ...attempt,
      id: "attempt_" + Date.now(),
      attemptedAt: new Date().toISOString()
    };

    const updatedState = {
      ...state,
      testAttempts: [...state.testAttempts, newAttempt]
    };

    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleAddPost = (title: string, content: string, subject: string) => {
    if (!state) return;

    const newPost = {
      id: "post_" + Date.now(),
      title,
      content,
      subject,
      authorName: "You (Aspirant)",
      authorRole: "Student" as const,
      avatarColor: "#2563EB",
      createdAt: new Date().toISOString(),
      likes: 0,
      views: 1,
      commentsCount: 0,
      isResolved: false,
      comments: []
    };

    const updatedState = {
      ...state,
      forumPosts: [newPost, ...state.forumPosts]
    };

    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleAddComment = (postId: string, content: string, isActionResolved?: boolean) => {
    if (!state) return;

    const newComment = {
      id: "c_" + Date.now(),
      authorName: "You (Aspirant)",
      authorRole: "Student" as const,
      avatarColor: "#2563EB",
      content,
      createdAt: new Date().toISOString(),
      likes: 0
    };

    const updatedPosts = state.forumPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.comments.length + 1,
          isResolved: isActionResolved ? true : p.isResolved,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    });

    const updatedState = {
      ...state,
      forumPosts: updatedPosts
    };

    setState(updatedState);
    saveStateToServer(updatedState);
  };

  const handleAIResolvePost = async (postId: string) => {
    if (!state) return;
    try {
      const res = await fetch("/api/forum/resolve-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error("AI Doubt resolutions fetch failed:", err);
    }
  };

  const handleSendChatMessage = async (text: string) => {
    if (!state) return;
    // Client-side quick-push user message
    const userMsg = {
      id: "m_user_" + Date.now(),
      sender: "user" as const,
      content: text,
      timestamp: new Date().toISOString()
    };

    const tempState = {
      ...state,
      mentorMessages: [...state.mentorMessages, userMsg]
    };
    setState(tempState);

    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error("Failed to query AI mentor:", err);
    }
  };

  const handleResetPrepState = async () => {
    if (window.confirm("This will clear all logged mock answers, custom calendars, and chat history. Are you absolutely sure?")) {
      setIsLoading(true);
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setState(data.state);
          setActiveTab("dashboard");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClearMentorChat = () => {
    if (!state) return;
    const cleared = {
      ...state,
      mentorMessages: [
        {
          id: "m_reset_" + Date.now(),
          sender: "mentor" as const,
          content: "Chat history cleared. How can Shiva guide your GATE 2027 preparation efforts next?",
          timestamp: new Date().toISOString()
        }
      ]
    };
    setState(cleared);
    saveStateToServer(cleared);
  };

  // Navigations Lists
  const navigationItems = [
    { id: "dashboard", label: "Dashboard Hub", icon: <Gauge className="w-4 h-4" /> },
    { id: "mock-tests", label: "Mock Exam Arena", icon: <Award className="w-4 h-4" /> },
    { id: "scheduler", label: "Study Scheduler", icon: <Calendar className="w-4 h-4" /> },
    { id: "progress", label: "Progress Roadmap", icon: <BookOpenCheck className="w-4 h-4" /> },
    { id: "forum", label: "Peer Doubt Forum", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "ai-mentor", label: "Ask Shiva (AI)", icon: <Bot className="w-4 h-4 text-blue-500 fill-blue-500/10" /> }
  ];

  if (isLoading || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs font-mono tracking-wider text-slate-400 uppercase animate-pulse">
          Retrieving GATE 2027 Study Board...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Mobile Header bar */}
      <header className="lg:hidden border-b-2 border-slate-100 bg-white px-5 py-4 flex items-center justify-between z-40 sticky top-0 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">G</div>
          <span className="font-display font-black text-slate-800 text-xs tracking-tight uppercase">GATE 2027 <span className="text-indigo-600 underline decoration-2 underline-offset-2">Command</span></span>
        </div>

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-slate-600 focus:outline-none cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Primary Layout frame */}
      <div className="flex flex-1 relative">
        {/* Left Side menu sidebar (Desktop only) */}
        <aside className="hidden lg:flex flex-col w-64 border-r-2 border-slate-105 bg-white p-6 sticky top-0 h-screen justify-between shrink-0">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0">G</div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-800 uppercase font-display leading-tight">
                  Gate 2027 <br />
                  <span className="text-indigo-600 underline decoration-2 underline-offset-4">Command</span>
                </h1>
              </div>
            </div>

            <nav className="space-y-1.5 text-slate-600 font-bold">
              {navigationItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs transition cursor-pointer font-bold ${
                      isActive 
                        ? "bg-indigo-900 text-white font-bold shadow-md" 
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 space-y-1.5 text-center shadow-xs">
              <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest block font-bold">Target Rank</span>
              <span className="text-xs font-black text-slate-800 tracking-tighter uppercase block">AIR &lt; 100</span>
              <div className="h-px bg-slate-100 my-1" />
              <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Offline Sync active
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile slide-menu drawers */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden flex">
            <div className="bg-white max-w-xs w-full p-6 space-y-6 animate-fade-in flex flex-col justify-between border-r border-slate-200">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="font-display font-bold text-slate-800 text-sm">Navigation Panel</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1 text-slate-600 text-xs font-semibold">
                  {navigationItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                          isActive 
                            ? "bg-slate-900 text-white font-bold" 
                            : "hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100/65 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-mono font-bold">
                   Offline Sync Checked
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Central Workspace section */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto space-y-8 min-w-0">
          {/* Synchronized alert indicator */}
          {isSyncing && (
            <div className="bg-blue-50 text-blue-600 border border-blue-100 rounded-xl px-4 py-2 text-xs font-mono tracking-wider w-fit absolute right-10 top-5 hidden lg:flex items-center gap-1.5 shadow-sm animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving parameters...
            </div>
          )}

          {/* Core subcomponents mounting routers */}
          {activeTab === "dashboard" && (
            <Dashboard 
              state={state} 
              onNavigate={(tab) => setActiveTab(tab)} 
              onReset={handleResetPrepState}
            />
          )}

          {activeTab === "mock-tests" && (
            <MockTestArena 
              tests={state.testAttempts.length > 0 ? [...state.syllabus.map((s, idx) => ({
                id: `test_${idx}`,
                title: `${s.subjectName} Practice Exam`,
                description: `Syllabus specific evaluation target containing MCQ/MSQ/NAT sets.`,
                subject: s.subjectName,
                durationMinutes: 15,
                questions: s.topics.map((t, tIdx) => ({
                  id: `q_custom_${topicIdMapper(t.id)}`,
                  type: tIdx % 3 === 0 ? "NAT" as any : tIdx % 3 === 1 ? "MSQ" as any : "MCQ" as any,
                  subject: s.subjectName,
                  topic: t.name,
                  questionText: `Under standard GATE analysis rules for ${t.name}, solve the mathematical edge boundary properties. Verify if there is any cycle representation.`,
                  options: tIdx % 3 !== 0 ? ["Option A correct parameters", "Option B values", "Option C invalid configuration", "Option D none of above"] : undefined,
                  correctAnswer: tIdx % 3 === 0 ? ["4"] : tIdx % 3 === 1 ? ["0", "1"] : ["1"],
                  marks: tIdx % 2 === 0 ? 1 : 2,
                  explanation: `Standard GATE assessment derivation for ${t.name}.\nVerify if the dimension constraints overlap correct ranges.`
                }))
              })), ...DEFAULT_MOCKS_STATIC] : DEFAULT_MOCKS_STATIC}
              attempts={state.testAttempts}
              onAddAttempt={handleAddAttemptResult}
            />
          )}

          {activeTab === "scheduler" && (
            <StudyScheduler 
              schedules={state.schedules}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onGenerateAISchedule={handleGenerateAISchedule}
            />
          )}

          {activeTab === "progress" && (
            <ProgressTracker 
              syllabus={state.syllabus}
              onToggleTopicCompletion={handleToggleTopicCompletion}
              onDownloadNotesToggle={handleToggleNotesDownload}
            />
          )}

          {activeTab === "forum" && (
            <ForumRoom 
              posts={state.forumPosts}
              onAddPost={handleAddPost}
              onAddComment={handleAddComment}
              onAIResolvePost={handleAIResolvePost}
            />
          )}

          {activeTab === "ai-mentor" && (
            <MentorConsole 
              state={state}
              onSendChatMessage={handleSendChatMessage}
              onResetChat={handleClearMentorChat}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// Quick unique Mapper
function topicIdMapper(id: string) {
  return id || "default_topic_01";
}

// Initial Mock test references
const DEFAULT_MOCKS_STATIC = [
  {
    id: "test_1",
    title: "GATE Mini-Mock: Operating Systems & Databases",
    description: "Features realistic Multiple Choice, Multiple Select, and Numerical Answer Type questions corresponding to Process Control and Database Joins.",
    subject: "OS & DBMS Mix",
    durationMinutes: 15,
    questions: [
      {
        id: "q1_1",
        type: "MCQ" as any,
        subject: "Operating Systems",
        topic: "CPU Scheduling",
        questionText: "Three processes P1, P2, and P3 arrive at time 0 with CPU burst times of 9, 4, and 2 respectively. Under the Shortest Job First (SJF) non-preemptive scheduling, what is the average waiting time of these processes?",
        options: ["2.67 ms", "3.0 ms", "4.0 ms", "4.5 ms"],
        correctAnswer: ["0"],
        marks: 1,
        explanation: "Since SJF is non-preemptive and all arrive at time 0, they are executed in order of increasing burst times:\n1. P3 (Burst = 2): Starts at 0, finishes at 2. Waiting time = 0.\n2. P2 (Burst = 4): Starts at 2, finishes at 6. Waiting time = 2.\n3. P1 (Burst = 9): Starts at 6, finishes at 15. Waiting time = 6.\nAverage Waiting Time = (0 + 2 + 6) / 3 = 8 / 3 ≈ 2.67 ms."
      },
      {
        id: "q1_2",
        type: "MSQ" as any,
        subject: "Databases (DBMS)",
        topic: "Transaction Management",
        questionText: "Which of the following statement(s) is/are TRUE regarding Two-Phase Locking (2PL) and serializability?",
        options: [
          "Basic 2PL guarantees that every schedule is conflict serializable.",
          "Basic 2PL is completely free from deadlocks.",
          "Strict 2PL prevents cascade rollbacks.",
          "Rigorous 2PL only locks items in the growing phase and releases them after committing."
        ],
        correctAnswer: ["0", "2", "3"],
        marks: 2,
        explanation: "Under Basic 2PL, conflict serializability is guaranteed, hence A is correct. However, basic 2PL does NOT prevent deadlocks, so B is incorrect. Strict 2PL requires holding exclusive locks until commit, which eliminates cascading rollbacks, hence C is correct. Rigorous 2PL holds all locks (shared and exclusive) until commit, satisfying D."
      },
      {
        id: "q1_3",
        type: "NAT" as any,
        subject: "Operating Systems",
        topic: "Virtual Memory",
        questionText: "Consider a virtual address space of 32 bits with a page size of 4 KB. If each page table entry takes exactly 4 bytes of storage, what is the size of the single-level page table, in Megabytes (MB)? (Provide only the numerical value).",
        correctAnswer: ["4"],
        marks: 2,
        explanation: "1. Virtual Address Space = 32 bits => Total Addressable Bytes = 2^32 bytes.\n2. Page Size = 4 KB = 2^12 bytes.\n3. Number of Pages = 2^32 / 2^12 = 2^20 pages.\n4. Page Table Entry (PTE) = 4 bytes = 2^2 bytes.\n5. Size of single-level Page Table = Number of Pages × PTE Size = 2^20 × 4 bytes = 4 MB.\nHence, the page table size is 4 MB."
      }
    ]
  },
  {
    id: "test_2",
    title: "GATE Mini-Mock: Computations, Logic & Maths",
    description: "Features core discrete mathematics, matrix operations, and Context-Free Language characteristics.",
    subject: "Math & TOC Mix",
    durationMinutes: 15,
    questions: [
      {
        id: "q2_1",
        type: "MCQ" as any,
        subject: "Engineering Mathematics & Discrete Maths",
        topic: "Linear Algebra",
        questionText: "Let A be a 3x3 matrix with eigenvalues 1, -1, and 3. What is the determinant of the matrix (A^2 + I) where I is the 3x3 identity matrix?",
        options: ["10", "40", "20", "30"],
        correctAnswer: ["1"],
        marks: 2,
        explanation: "If λ is an eigenvalue of A, then λ^2 + 1 is an eigenvalue of (A^2 + I).\nGiven eigenvalues of A: 1, -1, 3\nEigenvalues of A^2 + I:\n1. For λ = 1: (1)^2 + 1 = 2\n2. For λ = -1: (-1)^2 + 1 = 2\n3. For λ = 3: (3)^2 + 1 = 10\nSince the determinant of a matrix is equal to the product of its eigenvalues:\nDeterminant(A^2 + I) = 2 × 2 × 10 = 40."
      },
      {
        id: "q2_2",
        type: "MSQ" as any,
        subject: "Algorithms & Programming",
        topic: "Algorithms",
        questionText: "Which of the following statement(s) is/are TRUE about MST algorithms and Shortest Paths?",
        options: [
          "Dijkstra's algorithm is guaranteed to work correctly with negative weight edges.",
          "Kruskal's algorithm works correctly even if the graph has negative edge weights.",
          "Prim's algorithm starts from an arbitrary node and grows the MST size by one vertex at each step.",
          "The Bellman-Ford algorithm can detect the presence of negative cycles in a directed graph."
        ],
        correctAnswer: ["1", "2", "3"],
        marks: 2,
        explanation: "A is incorrect: Dijkstra fails with negative weights because it operates greedily. B, C, and D are standard theorems of Graph Algorithms."
      }
    ]
  }
];
