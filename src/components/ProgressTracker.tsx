import { useState } from "react";
import { SubjectSyllabus, SyllabusItem } from "../types";
import { 
  CheckCircle2, 
  Download, 
  FileDown, 
  BookOpenCheck, 
  BarChart, 
  Binary, 
  Cpu, 
  Database, 
  Globe, 
  Code,
  Sparkles,
  Award
} from "lucide-react";

interface ProgressTrackerProps {
  syllabus: SubjectSyllabus[];
  onToggleTopicCompletion: (topicId: string, completed: boolean) => void;
  onDownloadNotesToggle: (topicId: string) => void;
}

export default function ProgressTracker({ syllabus, onToggleTopicCompletion, onDownloadNotesToggle }: ProgressTrackerProps) {
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("All");

  const subjectsList = ["All", ...syllabus.map(s => s.subjectName)];

  const handleDownloadTrigger = (topicId: string) => {
    onDownloadNotesToggle(topicId);
    // Open download link in new window for static offline HTML
    window.open(`/api/download/resource?id=${topicId}`, "_blank");
  };

  const getSubjectIcon = (iconName: string) => {
    switch(iconName) {
      case "Binary": return <Binary className="w-5 h-5 text-indigo-500" />;
      case "Cpu": return <Cpu className="w-5 h-5 text-rose-500" />;
      case "Database": return <Database className="w-5 h-5 text-amber-500" />;
      case "Globe": return <Globe className="w-5 h-5 text-cyan-500" />;
      case "Code": return <Code className="w-5 h-5 text-emerald-500" />;
      default: return <BookOpenCheck className="w-5 h-5 text-slate-500" />;
    }
  };

  // Aggregated Statistics
  const overallTotal = syllabus.reduce((acc, s) => acc + s.topics.length, 0);
  const overallCompleted = syllabus.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0);
  const overallPercentage = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  const filteredSyllabus = activeSubjectFilter === "All"
    ? syllabus
    : syllabus.filter(s => s.subjectName === activeSubjectFilter);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Subject Stats Panel */}
      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-slate-900">Syllabus Progress Board</h2>
          <p className="text-sm text-slate-500">Track and lock your preparation milestones topic by topic.</p>
        </div>
        
        {/* Progress Bar overall */}
        <div className="md:col-span-2 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="space-y-1 text-center sm:text-left shrink-0">
            <span className="text-xs text-slate-400 font-mono tracking-wider uppercase block">GATE 2027 Coverage</span>
            <span className="text-3xl font-display font-extrabold text-slate-800">{overallCompleted} / {overallTotal}</span>
            <span className="text-xs font-medium text-slate-400 font-mono block">Sub-topics Completed</span>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between items-baseline text-xs font-mono">
              <span className="text-blue-600 font-bold">{overallPercentage}% Done</span>
              <span className="text-slate-400">{overallTotal - overallCompleted} Remaining</span>
            </div>
            <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out" 
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto">
        {subjectsList.map((subj, idx) => {
          const isSelected = activeSubjectFilter === subj;
          return (
            <button
              key={idx}
              onClick={() => setActiveSubjectFilter(subj)}
              className={`px-4.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                isSelected 
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              {subj}
            </button>
          );
        })}
      </div>

      {/* Syllabus Grid */}
      <div className="space-y-6">
        {filteredSyllabus.map((subj, sIdx) => {
          const completedCount = subj.topics.filter(t => t.completed).length;
          const totalCount = subj.topics.length;
          const pct = Math.round((completedCount / totalCount) * 100) || 0;

          return (
            <div key={sIdx} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Subject header details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {getSubjectIcon(subj.iconName)}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-slate-900 text-base">{subj.subjectName}</h3>
                    <p className="text-xs text-slate-400 font-mono">Target: {subj.totalHours} Study Hours Module</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800">{completedCount}/{totalCount} Done</span>
                    <span className="text-xs text-slate-400 font-mono block">({pct}% Complete)</span>
                  </div>
                  <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              {/* Topics block lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subj.topics.map(topic => (
                  <div 
                    key={topic.id} 
                    className={`border rounded-xl p-4.5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition ${
                      topic.completed ? "border-emerald-100 bg-emerald-50/10" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start space-x-3 shrink-0 col-span-2 grow">
                      <button
                        onClick={() => onToggleTopicCompletion(topic.id, !topic.completed)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                          topic.completed 
                            ? "border-emerald-500 bg-emerald-500 text-white" 
                            : "border-slate-300 hover:border-slate-400 bg-white"
                        }`}
                      >
                        {topic.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="space-y-1.5">
                        <span className={`text-sm font-semibold block leading-snug ${topic.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {topic.name}
                        </span>
                        
                        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                            topic.difficulty === "Easy" ? "bg-green-50 text-green-700" :
                            topic.difficulty === "Medium" ? "bg-amber-50 text-amber-700" :
                            "bg-rose-50 text-rose-700"
                          }`}>
                            {topic.difficulty}
                          </span>
                          <span>• Revisions: {topic.revisionCount}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadTrigger(topic.id)}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                        topic.notesDownloaded 
                          ? "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500" 
                          : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100"
                      }`}
                      title="Download PDF Study Guide"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Notes</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
