import { useState, useRef, useEffect, FormEvent } from "react";
import { UserPrepState, MentorMessage } from "../types";
import { 
  Bot, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Award, 
  BookOpenCheck, 
  TrendingUp,
  Download,
  Activity,
  ThumbsUp,
  Clock
} from "lucide-react";

interface MentorConsoleProps {
  state: UserPrepState;
  onSendChatMessage: (message: string) => Promise<void>;
  onResetChat: () => void;
}

export default function MentorConsole({ state, onSendChatMessage, onResetChat }: MentorConsoleProps) {
  const [inputText, setInputText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll chat to bottom when messages change
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.mentorMessages]);

  const handleSendMessageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText("");

    try {
      await onSendChatMessage(textToSend);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPromptClick = async (promptText: string) => {
    setIsSending(true);
    try {
      await onSendChatMessage(promptText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Performance summaries
  const totalTopics = state.syllabus.reduce((acc, s) => acc + s.topics.length, 0);
  const completedTopics = state.syllabus.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0);
  const completionPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 105) : 0; // standard ratio

  // Weak area diagnostics based on syllabus status and test attempt history
  const weakChapters: string[] = [];
  state.syllabus.forEach(sub => {
    const uncompleted = sub.topics.filter(t => !t.completed && t.difficulty === "Hard");
    uncompleted.forEach(un => {
      if (weakChapters.length < 5) {
        weakChapters.push(`${sub.subjectName.split("&")[0].trim()}: ${un.name}`);
      }
    });
  });

  if (weakChapters.length === 0) {
    weakChapters.push("Syllabus is robust! Revise sliding window protocols in Networks.");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 font-sans h-[calc(100vh-14rem)] min-h-[500px]">
      {/* Sidebar Metrics and Diagnostics Panels */}
      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 overflow-y-auto lg:h-full">
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="bg-blue-50 text-blue-700 text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded border border-blue-100">
               Live Coach Analytics
            </span>
            <h3 className="text-base font-display font-semibold text-slate-800">Shiva AI Mentor Desk</h3>
            <p className="text-xs text-slate-400">Continuous diagnostic mapping of syllabus covered and mock submissions.</p>
          </div>

          {/* Diagnostic Stats */}
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">Current Prep Grade</span>
              <div className="text-xl font-bold font-mono text-slate-800">
                {completedTopics > 10 ? "Consolidated A" : completedTopics > 5 ? "Active Intermediate B" : "Starting Grade C"}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">AI Diagnosed Weak Chapters</span>
              <ul className="text-xs space-y-1.5 text-slate-600 list-disc pl-4 font-sans leading-relaxed">
                {weakChapters.map((weak, wIdx) => (
                  <li key={wIdx}>
                    <strong className="text-rose-600 font-medium">{weak.split(":")[0]}</strong>: {weak.split(":")[1] || "All Done!"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <button 
            onClick={onResetChat}
            className="w-full text-center bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear Room History
          </button>
        </div>
      </div>

      {/* Primary Chat console column */}
      <div className="lg:col-span-3 bg-white border-2 border-slate-100 rounded-3xl shadow-sm flex flex-col overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-md animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 leading-snug">Chatting with Shiva</h4>
              <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" /> Online | GATE 2027 Pro Expert
              </span>
            </div>
          </div>
        </div>

        {/* Messaging Board panels */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {state.mentorMessages.map((msg, idx) => {
            const isUser = msg.sender === "user";
            return (
              <div key={msg.id || idx} className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3`}>
                {!isUser && (
                  <div className="bg-blue-50 text-blue-600 border border-blue-100 p-2 rounded-xl shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl p-4.5 shadow-xs whitespace-pre-wrap select-text text-sm leading-relaxed ${
                  isUser 
                    ? "bg-slate-900 text-slate-50 rounded-br-xs" 
                    : "bg-slate-50 border border-slate-100 rounded-bl-xs text-slate-800"
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start items-start gap-3">
              <div className="bg-blue-50 text-blue-600 border border-blue-100 p-2 rounded-xl shrink-0 animate-bounce">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-xs p-4.5 text-xs text-slate-400 flex items-center gap-2 font-mono">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
                <span>Shiva is writing formulas...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions Tray */}
        <div className="px-6 py-2.5 border-t border-slate-100 overflow-x-auto flex gap-2 scrollbar-none whitespace-nowrap bg-slate-50/50">
          <button 
            onClick={() => handleQuickPromptClick("How can I score maximum marks in Engineering Mathematics & Discrete Structure?")}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          >
            Maths scoring roadmap?
          </button>
          <button 
            onClick={() => handleQuickPromptClick("Can you list the exact steps to evaluate whether a database transaction is Conflict Serializable?")}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          >
            Conflict Serializability checklist?
          </button>
          <button 
            onClick={() => handleQuickPromptClick("What are the highest scoring subject nodes in Operating Systems that I should focus on?")}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          >
            OS target chapters?
          </button>
        </div>

        {/* Input box */}
        <form onSubmit={handleSendMessageSubmit} className="p-4 border-t border-slate-100 flex gap-2 bg-white shrink-0">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            placeholder="Ask Shiva about formulas, doubts, books or scheduling guides..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-3 text-xs focus:outline-none focus:border-blue-500 text-slate-800 disabled:opacity-50"
            required
          />
          <button 
            type="submit"
            disabled={isSending}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 rounded-xl transition flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
