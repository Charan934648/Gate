import { useState, useEffect } from "react";
import { UserPrepState } from "../types";
import { 
  Clock, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Download, 
  FileDown, 
  RefreshCw,
  Info
} from "lucide-react";

interface DashboardProps {
  state: UserPrepState;
  onNavigate: (tab: string) => void;
  onReset: () => void;
}

export default function Dashboard({ state, onNavigate, onReset }: DashboardProps) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });
  const [currentTip, setCurrentTip] = useState("");

  useEffect(() => {
    // GATE 2027 is traditionally on the first weekend of February. Let's target Feb 6, 2027.
    const targetDate = new Date("2027-02-06T09:00:00Z").getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      
      if (difference <= 0) {
        clearInterval(interval);
        setCountdown({ days: 0, hours: 0, mins: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown({ days, hours, mins });
      }
    }, 60000);

    const now = new Date().getTime();
    const difference = targetDate - now;
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    setCountdown({ days, hours, mins });

    return () => clearInterval(interval);
  }, []);

  // Compute stats
  const totalTopics = state.syllabus.reduce((acc, s) => acc + s.topics.length, 0);
  const completedTopics = state.syllabus.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0);
  const completionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const totalSchedules = state.schedules.length;
  const completedTasks = state.schedules.reduce((acc, s) => acc + s.tasks.filter(t => t.completed).length, 0);
  const totalTasks = state.schedules.reduce((acc, s) => acc + s.tasks.length, 0);
  const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const testAttemptsCount = state.testAttempts.length;
  const lastScore = testAttemptsCount > 0 
    ? state.testAttempts[testAttemptsCount - 1].scores.marksObtained 
    : null;
  const lastTotal = testAttemptsCount > 0 
    ? state.testAttempts[testAttemptsCount - 1].scores.totalMarks 
    : null;

  // Generate a friendly AI mentor quick instruction based on progress
  useEffect(() => {
    if (completionPercentage === 0) {
      setCurrentTip("It is a clean canvas! Shiva suggests starting with 'Engineering Mathematics: Linear Algebra' and checking out Mock Test 1. Begin with 2 study hours per day.");
    } else if (completionPercentage < 30) {
      setCurrentTip("Solid start! Your progress is forming nicely. Next core node to target is 'Operating Systems: Process Synchronization'. Make sure to download its companion notes for offline review!");
    } else {
      setCurrentTip("Impressive coverage! Your active testing has begun. Focus on 'Databases: Normal Forms' next, and keep posting tough questions on the discussion board for peer evaluation.");
    }
  }, [completionPercentage]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Target Timer Cover */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-xl border-2 border-indigo-850">
        <div className="space-y-2 md:col-span-2">
          <span className="bg-indigo-500/30 text-indigo-300 font-display font-medium text-xs tracking-wider uppercase px-3 py-1 rounded-full border border-indigo-500/20">
            Official GATE 2027 Countdown
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white mt-3 uppercase">
            Syllabus Target <span className="text-amber-400 underline decoration-4 underline-offset-4 decoration-amber-400">Feb 2027</span>
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
             Graduate Aptitude Test in Engineering 2027. Your target exam date is Feb 6, 2027. Consistent daily sprints, rigorous mock evaluations, and formula summaries will conquer this milestone. Shiva stands ready.
          </p>
        </div>
        
        <div className="bg-indigo-950/80 backdrop-blur-sm border-2 border-indigo-805/30 rounded-3xl p-6 text-center space-y-3 shadow-md">
          <span className="text-indigo-300 font-mono text-[10px] tracking-widest uppercase block font-bold">Time Remaining</span>
          <div className="flex justify-center items-baseline space-x-3">
            <div>
              <span className="text-4xl font-extrabold font-display text-amber-400">{countdown.days}</span>
              <span className="text-[10px] text-indigo-300 block font-mono uppercase tracking-wider mt-1">Days</span>
            </div>
            <span className="text-indigo-400/50 text-2xl font-black">:</span>
            <div>
              <span className="text-4xl font-extrabold font-display text-amber-400">{countdown.hours}</span>
              <span className="text-[10px] text-indigo-300 block font-mono uppercase tracking-wider mt-1">Hrs</span>
            </div>
            <span className="text-indigo-400/50 text-2xl font-black">:</span>
            <div>
              <span className="text-4xl font-extrabold font-display text-amber-400">{countdown.mins}</span>
              <span className="text-[10px] text-indigo-300 block font-mono uppercase tracking-wider mt-1">Mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Percentage Coverage Card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-black uppercase tracking-tight">Syllabus Covered</span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold">
              CS & Maths
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative inline-flex">
              <svg className="w-16 h-16">
                <circle className="text-slate-100" strokeWidth="6" stroke="currentColor" fill="transparent" r="26" cx="32" cy="32" />
                <circle className="text-indigo-600 transition-all duration-500 ease-out" strokeWidth="6" strokeDasharray="163.3" strokeDashoffset={163.3 - (163.3 * completionPercentage) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="26" cx="32" cy="32" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-black text-slate-800">{completionPercentage}%</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{completedTopics}/{totalTopics}</div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sub-Topics Done</p>
            </div>
          </div>
        </div>

        {/* Schedule Complete Counter */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-black uppercase tracking-tight">Daily Goals</span>
            <span className="bg-amber-50 text-amber-700 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold">
              Study Planner
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative inline-flex">
              <svg className="w-16 h-16">
                <circle className="text-slate-100" strokeWidth="6" stroke="currentColor" fill="transparent" r="26" cx="32" cy="32" />
                <circle className="text-amber-500 transition-all duration-500 ease-out" strokeWidth="6" strokeDasharray="163.3" strokeDashoffset={163.3 - (163.3 * taskCompletionPercentage) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="26" cx="32" cy="32" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-black text-slate-800">{taskCompletionPercentage}%</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{completedTasks}/{totalTasks}</div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled Active</p>
            </div>
          </div>
        </div>

        {/* Mock Exam Activity Card */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-black uppercase tracking-tight">Mock Exam Stats</span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold">
              Test Arena
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{testAttemptsCount}</div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Simulations Done</p>
            </div>
          </div>
        </div>

        {/* AI Performance Evaluation Log */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-black uppercase tracking-tight">Last Mock Attempt</span>
            <span className="bg-rose-50 text-rose-700 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold">
              Report Card
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {lastScore !== null && lastTotal !== null ? (
              <div className="space-y-1">
                <div className="text-2xl font-extrabold text-slate-800 tracking-tight">
                  {lastScore} <span className="text-xs text-slate-400 font-normal">/ {lastTotal} Marks</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Score Submitted
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-400">No Tests Found</div>
                <button 
                  onClick={() => onNavigate("mock-tests")} 
                  className="text-xs text-indigo-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                >
                  Take starting test <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Columns Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Coach Box & Study Plan Quick Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personalized Mentor Quick Tip */}
          <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between space-y-6 border border-indigo-950">
            <div>
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest text-white">AI Mentor Active</span>
                <p className="text-xs text-indigo-300">Analysis: Verified</p>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mt-5 leading-normal font-display text-amber-400 italic">
                "{currentTip}"
              </h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => onNavigate("ai-mentor")}
                className="bg-indigo-600 hover:bg-indigo-500 transition text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                Launch Shiva AI Mentoring Suite <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onNavigate("scheduler")}
                className="bg-indigo-800/65 border border-indigo-700/80 hover:bg-indigo-800 transition text-indigo-100 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
              >
                Configure Study Plan
              </button>
            </div>
          </div>

          {/* Today's Checklist Grid */}
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-lg font-black uppercase tracking-tight text-slate-800">Today's Quick Checklist</h3>
            <div className="divide-y divide-slate-100">
              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700">Detailed Syllabus Tracking</span>
                </div>
                <button onClick={() => onNavigate("progress")} className="text-xs text-indigo-600 hover:underline font-bold uppercase tracking-wider">
                  Manage Roadmap
                </button>
              </div>
              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-700">Daily Heuristic Planner</span>
                </div>
                <button onClick={() => onNavigate("scheduler")} className="text-xs text-indigo-600 hover:underline font-bold uppercase tracking-wider">
                  Adjust Schedule
                </button>
              </div>
              <div className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Award className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-bold text-slate-700">GATE MCQ/MSQ Arena</span>
                </div>
                <button onClick={() => onNavigate("mock-tests")} className="text-xs text-indigo-600 hover:underline font-bold uppercase tracking-wider">
                  Enter Arena
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Offline Access Center - Styled explicitly as the beautiful Amber Bento block from the template design! */}
        <div className="bg-amber-400 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-amber-950 font-black uppercase text-xl font-display tracking-tight">Offline Vault</p>
              <div className="w-10 h-10 bg-amber-950/10 rounded-xl flex items-center justify-center text-amber-950">
                <Download className="w-6 h-6" />
              </div>
            </div>
            
            <p className="text-xs text-amber-900 font-semibold leading-relaxed">
               All mock test papers, formulas, dynamic syllabi, and schedules are packable for zero-network environments. Download the interactive prep ledger to study completely distraction-free!
            </p>

            <div className="bg-amber-500/10 border-2 border-amber-500/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-start space-x-2.5">
                <Info className="w-4.5 h-4.5 text-amber-950 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-950 font-bold leading-normal">
                  Our compile engine bundles a robust self-contained interactive ledger. Copy it anywhere to track, solve queries, and study without internet.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <a 
              href="/api/download/prep-package?format=html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-900 hover:bg-slate-850 transition text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm cursor-pointer text-center"
            >
              <FileDown className="w-4 h-4 shrink-0" /> Download HTML Ledger (.html)
            </a>
            
            <a 
              href="/api/download/prep-package?format=json"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-950 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer border border-amber-900/10 text-center"
            >
              <Download className="w-3.5 h-3.5 shrink-0" /> Export Backup Json (.json)
            </a>

            <button
              onClick={onReset}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition border border-rose-100 mt-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Full Factory Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
