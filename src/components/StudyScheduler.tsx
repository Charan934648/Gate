import { useState, FormEvent } from "react";
import { DailySchedule, DailyScheduleTask } from "../types";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  FileText, 
  Download, 
  PlusCircle, 
  ChevronRight,
  Info,
  User,
  History
} from "lucide-react";

interface StudySchedulerProps {
  schedules: DailySchedule[];
  onAddTask: (date: string, task: Omit<DailyScheduleTask, "id" | "completed">) => void;
  onToggleTask: (date: string, taskId: string, completed: boolean) => void;
  onGenerateAISchedule: (date: string, hours: number) => Promise<void>;
}

export default function StudyScheduler({ schedules, onAddTask, onToggleTask, onGenerateAISchedule }: StudySchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<string>("2026-06-01");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiHoursBudget, setAiHoursBudget] = useState<number>(6);

  // Manual Task creation forms
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newTopic, setNewTopic] = useState<string>("");
  const [newSubject, setNewSubject] = useState<string>("Operating Systems");
  const [newSlot, setNewSlot] = useState<string>("09:00 AM - 11:30 AM");
  const [newDuration, setNewDuration] = useState<number>(150);

  const activeDaySchedule = schedules.find(s => s.date === selectedDate) || {
    date: selectedDate,
    dayName: new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" }),
    targetDailyHours: 6,
    completedHours: 0,
    tasks: []
  };

  const handleCreateTaskSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTopic.trim()) return;

    onAddTask(selectedDate, {
      timeSlot: newSlot,
      taskTitle: newTitle,
      topic: newTopic,
      subject: newSubject,
      durationMinutes: Number(newDuration),
      resources: [
        {
          name: `${newTopic} Revision CheatSheet.pdf`,
          type: "pdf",
          url: "/api/download/resource?id=custom_manual",
          downloaded: false
        }
      ]
    });

    setNewTitle("");
    setNewTopic("");
    setShowAddForm(false);
  };

  const triggerAIScheduler = async () => {
    setIsGenerating(true);
    try {
      await onGenerateAISchedule(selectedDate, aiHoursBudget);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">GATE 2027 Study Planner & Scheduler</h2>
          <p className="text-sm text-slate-500">Configure daily sprints, resolve subjects modularly, and keep key summaries handy.</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 shrink-0 self-start">
          <button 
            onClick={() => setSelectedDate("2026-06-01")} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedDate === "2026-06-01" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            June 1 (Mon)
          </button>
          <button 
            onClick={() => setSelectedDate("2026-06-02")} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedDate === "2026-06-02" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            June 2 (Tue)
          </button>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold outline-none text-slate-700 bg-transparent border-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks and Progress Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-lg">
                  Schedules for {activeDaySchedule.dayName}, {selectedDate}
                </h3>
                <p className="text-xs text-slate-400">Mark completed slots to update database tracking.</p>
              </div>

              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Log Task
              </button>
            </div>

            {/* Quick Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>Completed: <strong>{activeDaySchedule.completedHours} Hours</strong></span>
                <span>Daily Target: <strong>{activeDaySchedule.targetDailyHours} Hours</strong></span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (activeDaySchedule.completedHours / activeDaySchedule.targetDailyHours) * 100)}%` }}
                />
              </div>
            </div>

            {/* Manual Task Creator Dialog panel */}
            {showAddForm && (
              <form onSubmit={handleCreateTaskSubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 animate-fade-in">
                <h4 className="font-display font-semibold text-slate-800 text-sm">Create Fresh Study Block</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="text-slate-500">General Task Title</label>
                    <input 
                      type="text" 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Normalization decomposition rules" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 hover:border-slate-300 outline-none text-slate-800"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500">Subject Category</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 outline-none text-slate-800"
                    >
                      <option value="Engineering Mathematics & Discrete Maths">Engineering Mathematics & Discrete Maths</option>
                      <option value="Operating Systems">Operating Systems</option>
                      <option value="Databases (DBMS)">Databases & SQL</option>
                      <option value="Computer Networks">Computer Networks</option>
                      <option value="Algorithms & Programming">Algorithms & Programming</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500">Topic Node</label>
                    <input 
                      type="text" 
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="e.g. 3NF and BCNF" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 hover:border-slate-300 outline-none text-slate-800"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-slate-500">Time interval</label>
                      <input 
                        type="text" 
                        value={newSlot}
                        onChange={(e) => setNewSlot(e.target.value)}
                        placeholder="09:00 AM - 11:30 AM" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 outline-none text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-500">Duration (Mins)</label>
                      <input 
                        type="number" 
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 outline-none text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-500 text-xs font-semibold px-4 py-2 hover:underline"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition"
                  >
                    Schedule Task
                  </button>
                </div>
              </form>
            )}

            {/* List of Tasks */}
            {activeDaySchedule.tasks.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-display font-semibold text-slate-700">No study blocks planned for this day.</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click 'Log Task' to create custom modules or use the smart AI scheduler assistant on the right to auto-generate plans corresponding to pending topics!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDaySchedule.tasks.map(task => (
                  <div key={task.id} className={`border-2 rounded-2xl p-5 hover:bg-slate-50/50 transition relative ${task.completed ? "border-emerald-200 bg-emerald-50/10" : "border-slate-100"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <button 
                          onClick={() => onToggleTask(selectedDate, task.id, !task.completed)}
                          className={`mt-0.5 w-6 h-6 rounded-full border shrink-0 flex items-center justify-center transition ${
                            task.completed 
                              ? "border-emerald-500 bg-emerald-500 text-white" 
                              : "border-slate-300 hover:border-slate-400 bg-white"
                          }`}
                        >
                          {task.completed && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        
                        <div className="space-y-1">
                          <span className="bg-slate-100 text-slate-600 text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded">
                            {task.subject}
                          </span>
                          <h4 className={`text-base font-semibold leading-relaxed ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {task.taskTitle}
                          </h4>
                          
                          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {task.timeSlot}</span>
                            <span>• Topic: <strong className="text-slate-500">{task.topic}</strong></span>
                            <span>• Duration: <strong className="text-slate-500">{task.durationMinutes} Mins</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resources downloadable panel */}
                    {task.resources && task.resources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100/80 flex flex-wrap gap-2.5 items-center">
                        <span className="text-[10px] text-slate-400 font-mono tracking-wider">OFFLINE RESOURCES:</span>
                        {task.resources.map((resItem, riIdx) => (
                          <a 
                            key={riIdx}
                            href={resItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 flex items-center gap-1.5 shadow-xs transition"
                            title="Download reference for study"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>{resItem.name}</span>
                            <Download className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Schedule Optimizer Engine */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6 border-2 border-indigo-850">
            <div className="space-y-2">
              <div className="bg-indigo-600/30 text-indigo-300 font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded border border-indigo-500/20 w-fit">
                AI Optimization Console
              </div>
              <h3 className="text-xl font-display font-semibold tracking-tight">Shiva Schedule Generator</h3>
              <p className="text-indigo-200 text-xs leading-relaxed">
                 Generate custom learning slots integrated automatically with your syllabus tracker. It calculates uncompleted high-yield topics and assigns reading material for download.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-indigo-700/30 rounded-xl p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-indigo-200 block font-mono font-medium">Daily Hours Budget</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="range" 
                    min="2" 
                    max="12" 
                    value={aiHoursBudget}
                    onChange={(e) => setAiHoursBudget(Number(e.target.value))}
                    className="w-full text-indigo-500"
                  />
                  <span className="text-sm font-mono font-bold bg-slate-900 text-indigo-400 rounded-lg py-1 px-2.5 shrink-0 border border-slate-700">
                    {aiHoursBudget} Hrs
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg flex items-start space-x-2 border border-slate-800">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-indigo-300">
                  Tasks will target the exact uncompleted segments of your subject tracker. Ensure you mark syllabus objectives done as you solve problems!
                </p>
              </div>
            </div>

            <button
              disabled={isGenerating}
              onClick={triggerAIScheduler}
              className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-900 border-t-transparent animate-spin" />
                  Optimizing schedule...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Auto-generate Custom Plan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
