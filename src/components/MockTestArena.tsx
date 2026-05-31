import { useState, useEffect } from "react";
import { MockTest, GATEQuestion, QuestionType, TestAttempt } from "../types";
import { 
  Award, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  HelpCircle, 
  RotateCcw, 
  Download, 
  Calculator,
  ChevronLeft,
  BookOpenCheck,
  X,
  Plus
} from "lucide-react";

interface MockTestArenaProps {
  tests: MockTest[];
  attempts: TestAttempt[];
  onAddAttempt: (attempt: Omit<TestAttempt, "id" | "attemptedAt">) => void;
}

export default function MockTestArena({ tests, attempts, onAddAttempt }: MockTestArenaProps) {
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [qId: string]: string[] }>({});
  const [markedForReview, setMarkedForReview] = useState<{ [qId: string]: boolean }>({});
  
  // Timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [activeReviewAttempt, setActiveReviewAttempt] = useState<TestAttempt | null>(null);

  // Scientific Calculator states
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcInput, setCalcInput] = useState<string>("");
  const [calcResult, setCalcResult] = useState<string>("0");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTestRunning && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsTestRunning(false);
            submitTest(true); // Auto-submit when time is up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTestRunning, timeLeftSeconds]);

  const handleStartTest = (test: MockTest) => {
    setSelectedTest(test);
    setActiveQuestionIdx(0);
    setAnswers({});
    setMarkedForReview({});
    setTimeLeftSeconds(test.durationMinutes * 60);
    setIsTestRunning(true);
    setActiveReviewAttempt(null);
  };

  const handleSelectOptionMCQ = (questionId: string, optionIdx: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [optionIdx]
    }));
  };

  const handleSelectOptionMSQ = (questionId: string, optionIdx: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (current.includes(optionIdx)) {
        return {
          ...prev,
          [questionId]: current.filter(x => x !== optionIdx)
        };
      } else {
        return {
          ...prev,
          [questionId]: [...current, optionIdx].sort()
        };
      }
    });
  };

  const handleSelectOptionNAT = (questionId: string, val: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [val.trim()]
    }));
  };

  const clearResponse = (qId: string) => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const toggleMarkForReview = (qId: string) => {
    setMarkedForReview(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const submitTest = (isAuto: boolean = false) => {
    if (!selectedTest) return;
    setIsTestRunning(false);

    // Score computation
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let marksObtained = 0;
    const totalMarks = selectedTest.questions.reduce((sum, q) => sum + q.marks, 0);

    selectedTest.questions.forEach(q => {
      const userAnswers = answers[q.id] || [];
      
      if (userAnswers.length === 0) {
        unattemptedCount++;
        return;
      }

      if (q.type === QuestionType.NAT) {
        const userNum = parseFloat(userAnswers[0]);
        const correctRange = q.correctAnswer;
        if (isNaN(userNum)) {
          incorrectCount++;
          return;
        }

        let isCorrect = false;
        if (correctRange.length === 1) {
          isCorrect = Math.abs(userNum - parseFloat(correctRange[0])) < 0.01;
        } else if (correctRange.length === 2) {
          const lower = parseFloat(correctRange[0]);
          const upper = parseFloat(correctRange[1]);
          isCorrect = userNum >= lower && userNum <= upper;
        }

        if (isCorrect) {
          correctCount++;
          marksObtained += q.marks;
        } else {
          incorrectCount++;
          // No negative marks for NAT in GATE
        }
      } else if (q.type === QuestionType.MCQ) {
        if (userAnswers[0] === q.correctAnswer[0]) {
          correctCount++;
          marksObtained += q.marks;
        } else {
          incorrectCount++;
          // Negative marking for standard multiple choice in GATE (usually 1/3 of mark)
          marksObtained -= (q.marks / 3);
        }
      } else if (q.type === QuestionType.MSQ) {
        // MSQ has no negative marking, but requires exact overlap and no partial grades
        const correctSet = [...q.correctAnswer].sort();
        const userSet = [...userAnswers].sort();
        const isMatched = correctSet.length === userSet.length && correctSet.every((val, idx) => val === userSet[idx]);
        
        if (isMatched) {
          correctCount++;
          marksObtained += q.marks;
        } else {
          incorrectCount++;
        }
      }
    });

    // Strip negative total boundary
    if (marksObtained < 0) marksObtained = 0;
    marksObtained = parseFloat(marksObtained.toFixed(2));

    const attemptSummary: Omit<TestAttempt, "id" | "attemptedAt"> = {
      testId: selectedTest.id,
      testTitle: selectedTest.title,
      userId: "aspirant_1",
      timeSpentSeconds: selectedTest.durationMinutes * 60 - timeLeftSeconds,
      answers: answers,
      scores: {
        totalMarks: totalMarks,
        marksObtained: marksObtained,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        unattemptedCount: unattemptedCount
      }
    };

    onAddAttempt(attemptSummary);
    
    // Switch selection view immediately
    const tempAttempt: TestAttempt = {
      ...attemptSummary,
      id: "attempt_temp",
      attemptedAt: new Date().toISOString()
    };
    setActiveReviewAttempt(tempAttempt);
    setSelectedTest(null);

    if (isAuto) {
      alert("Time limit reached. Your responses were submitted automatically.");
    }
  };

  const formatTimerValue = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hours > 0 ? hours + "h " : ""}${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Scientific Calculator handlers
  const handleCalcPress = (val: string) => {
    if (val === "C") {
      setCalcInput("");
      setCalcResult("0");
    } else if (val === "⌫") {
      setCalcInput(prev => prev.slice(0, -1));
    } else if (val === "=") {
      try {
        // Sanitizing mathematical operations for eval safely
        let mathStr = calcInput
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/log\(/g, "Math.log10(")
          .replace(/ln\(/g, "Math.log(")
          .replace(/sqrt\(/g, "Math.sqrt(")
          .replace(/π/g, "Math.PI")
          .replace(/e/g, "Math.E")
          .replace(/\^/g, "**");

        // Simple safety check using character restriction regex
        if (/^[0-9+\-*/().\sMathsincolgqrtPIE]+$/.test(mathStr.replace(/Math\.(sin|cos|tan|log10|log|sqrt|PI|E)/g, ""))) {
          // Add close brackets if missing
          const openCount = (mathStr.match(/\(/g) || []).length;
          const closeCount = (mathStr.match(/\)/g) || []).length;
          if (openCount > closeCount) {
            mathStr += ")".repeat(openCount - closeCount);
          }
          const res = Function(`"use strict"; return (${mathStr})`)();
          setCalcResult(Number(res).toLocaleString("en-US", { maximumFractionDigits: 5 }));
        } else {
          setCalcResult("Format Error");
        }
      } catch (err) {
        setCalcResult("Math Error");
      }
    } else {
      setCalcInput(prev => prev + val);
    }
  };

  return (
    <div className="space-y-8">
      {/* 2. Interactive Testing Lobby */}
      {!selectedTest && !activeReviewAttempt && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">GATE 2027 Mock Test Arena</h2>
              <p className="text-sm text-slate-500">Practice under simulated constraints with correct MCQ, MSQ and NAT patterns.</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-blue-50 text-blue-700 text-xs py-2 px-3.5 rounded-full font-mono font-medium border border-blue-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Calculated Negative Markings Enabled
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tests.map(test => {
              const previousAttempt = attempts.find(a => a.testId === test.id);
              
              return (
                <div key={test.id} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 hover:border-indigo-300 transition">
                  <div className="space-y-2">
                    <span className="bg-slate-100 text-slate-800 text-xs tracking-wide uppercase font-mono font-semibold px-2.5 py-1 rounded-full">
                      {test.subject}
                    </span>
                    <h3 className="text-lg font-display font-semibold text-slate-900 mt-2">{test.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{test.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 text-xs text-slate-500 font-mono">
                      <div>• Duration: <strong>{test.durationMinutes} Mins</strong></div>
                      <div>• Questions: <strong>{test.questions.length} Items</strong></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {previousAttempt ? (
                      <div>
                        <span className="text-xs text-emerald-600 font-medium block">✓ Taken Prep Attempt</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {previousAttempt.scores.marksObtained} / {previousAttempt.scores.totalMarks} Marks
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium font-mono">Uncompleted</span>
                    )}

                    <div className="flex gap-2">
                      <a 
                        href={`/api/download/mock-test/${test.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Download Offline Test Guide"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                      <button 
                        onClick={() => handleStartTest(test)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                      >
                        Start Simulation <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Attempt History Dashboard */}
          {attempts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-display font-semibold text-slate-900 text-lg">Your Past Assessment Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 font-sans divide-y divide-slate-100">
                  <thead>
                    <tr className="text-xs text-slate-400 tracking-wider font-mono">
                      <th className="py-3">Assessment Title</th>
                      <th className="py-3">Submitted At</th>
                      <th className="py-3">Marks Scored</th>
                      <th className="py-3">Correct Keys</th>
                      <th className="py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {attempts.map(attempt => (
                      <tr key={attempt.id} className="hover:bg-slate-50/50">
                        <td className="py-4 font-sans font-medium text-slate-800 text-sm">{attempt.testTitle}</td>
                        <td className="py-4 text-slate-400">{new Date(attempt.attemptedAt).toLocaleDateString()}</td>
                        <td className="py-4 text-slate-800 font-semibold">{attempt.scores.marksObtained} / {attempt.scores.totalMarks}</td>
                        <td className="py-4 text-emerald-600">{attempt.scores.correctCount} Right, {attempt.scores.incorrectCount} Wrong</td>
                        <td className="py-4">
                          <button 
                            onClick={() => setActiveReviewAttempt(attempt)}
                            className="text-blue-600 hover:underline hover:text-blue-800 font-medium"
                          >
                            Review Solutions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Active Testing Environment */}
      {selectedTest && isTestRunning && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Question Column */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold font-mono tracking-wider uppercase px-2.5 py-1 rounded">
                    Question {activeQuestionIdx + 1} of {selectedTest.questions.length}
                  </span>
                  <span className="text-xs text-slate-400 ml-4 font-mono font-medium">
                    Type: <strong className="text-slate-600 font-semibold">{selectedTest.questions[activeQuestionIdx].type}</strong> | Mark: {selectedTest.questions[activeQuestionIdx].marks}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowCalculator(!showCalculator)}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      showCalculator ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <Calculator className="w-4 h-4" /> Virtual GATE Calculator
                  </button>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 font-mono font-bold text-sm">
                    <Clock className="w-4 h-4 text-rose-500 animate-pulse" /> {formatTimerValue(timeLeftSeconds)}
                  </div>
                </div>
              </div>

              {/* Virtual Scientific Calculator Pop-panel */}
              {showCalculator && (
                <div className="bg-slate-900 text-white rounded-xl p-4 max-w-sm absolute right-4 lg:right-auto z-50 shadow-2xl border border-slate-700/80 animate-fade-in space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400 font-mono font-medium tracking-wide flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5" /> Virtual Scientific Calculator
                    </span>
                    <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-black/40 rounded-lg p-3 text-right space-y-1">
                    <div className="text-slate-400 text-xs font-mono min-h-4 block overflow-x-auto truncate">{calcInput || " "}</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 truncate">{calcResult}</div>
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-xs font-mono">
                    {/* Science tier */}
                    <button onClick={() => handleCalcPress("sin(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">sin</button>
                    <button onClick={() => handleCalcPress("cos(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">cos</button>
                    <button onClick={() => handleCalcPress("tan(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">tan</button>
                    <button onClick={() => handleCalcPress("sqrt(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">√</button>
                    <button onClick={() => handleCalcPress("^")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">y<sup>x</sup></button>

                    <button onClick={() => handleCalcPress("log(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">log10</button>
                    <button onClick={() => handleCalcPress("ln(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">ln</button>
                    <button onClick={() => handleCalcPress("π")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">π</button>
                    <button onClick={() => handleCalcPress("e")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">e</button>
                    <button onClick={() => handleCalcPress("⌫")} className="bg-red-950 text-red-300 hover:bg-red-900 p-2 rounded font-bold">⌫</button>

                    {/* Basic Grid */}
                    <button onClick={() => handleCalcPress("(")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">(</button>
                    <button onClick={() => handleCalcPress(")")} className="bg-slate-800 hover:bg-slate-700 p-2 rounded">)</button>
                    <button onClick={() => handleCalcPress("/")} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-blue-300">/</button>
                    <button onClick={() => handleCalcPress("*")} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-blue-300">*</button>
                    <button onClick={() => handleCalcPress("C")} className="bg-amber-950 text-amber-300 hover:bg-amber-900 p-2 rounded font-bold">C</button>

                    <button onClick={() => handleCalcPress("7")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">7</button>
                    <button onClick={() => handleCalcPress("8")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">8</button>
                    <button onClick={() => handleCalcPress("9")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">9</button>
                    <button onClick={() => handleCalcPress("-")} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-blue-300">-</button>
                    <button onClick={() => handleCalcPress("=")} className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded row-span-2 font-bold text-lg text-white">=</button>

                    <button onClick={() => handleCalcPress("4")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">4</button>
                    <button onClick={() => handleCalcPress("5")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">5</button>
                    <button onClick={() => handleCalcPress("6")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">6</button>
                    <button onClick={() => handleCalcPress("+")} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-blue-300">+</button>

                    <button onClick={() => handleCalcPress("1")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">1</button>
                    <button onClick={() => handleCalcPress("2")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">2</button>
                    <button onClick={() => handleCalcPress("3")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">3</button>
                    <button onClick={() => handleCalcPress(".")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold">.</button>
                    <button onClick={() => handleCalcPress("0")} className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded font-semibold text-sm">0</button>
                  </div>
                </div>
              )}

              {/* Question text */}
              <div className="space-y-4">
                <p className="text-lg font-medium text-slate-800 leading-relaxed font-sans select-none">
                  {selectedTest.questions[activeQuestionIdx].questionText}
                </p>

                {/* Submitting Types Options Display */}
                {selectedTest.questions[activeQuestionIdx].type === QuestionType.MCQ && (
                  <div className="space-y-3 pt-3">
                    {selectedTest.questions[activeQuestionIdx].options?.map((option, oIdx) => {
                      const isSelected = answers[selectedTest.questions[activeQuestionIdx].id]?.[0] === String(oIdx);
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOptionMCQ(selectedTest.questions[activeQuestionIdx].id, String(oIdx))}
                          className={`w-full text-left p-4 rounded-xl border transition flex items-center space-x-3 ${
                            isSelected 
                              ? "border-blue-600 bg-blue-50/50 text-blue-900 font-medium" 
                              : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full border shrink-0 flex items-center justify-center font-semibold text-xs ${
                            isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-slate-50 text-slate-500"
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="text-sm">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTest.questions[activeQuestionIdx].type === QuestionType.MSQ && (
                  <div className="space-y-3 pt-3">
                    <p className="text-xs font-semibold text-indigo-600 font-mono uppercase bg-indigo-50 w-fit px-2 py-0.5 rounded">
                      * Multiple Select: Select ALL correct options to score. No partial grading.
                    </p>
                    {selectedTest.questions[activeQuestionIdx].options?.map((option, oIdx) => {
                      const isSelected = (answers[selectedTest.questions[activeQuestionIdx].id] || []).includes(String(oIdx));
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOptionMSQ(selectedTest.questions[activeQuestionIdx].id, String(oIdx))}
                          className={`w-full text-left p-4 rounded-xl border transition flex items-center space-x-3 ${
                            isSelected 
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium" 
                              : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 pointer-events-none" 
                          />
                          <span className="text-sm font-medium text-slate-500 font-mono">[{String.fromCharCode(65 + oIdx)}]</span>
                          <span className="text-sm text-slate-700">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTest.questions[activeQuestionIdx].type === QuestionType.NAT && (
                  <div className="space-y-3 pt-3">
                    <p className="text-xs font-semibold text-amber-600 font-mono uppercase bg-amber-50 w-fit px-2 py-0.5 rounded animate-pulse">
                      * Numerical Answer: Enter numeric values using decimals if required. No negative marking apply.
                    </p>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="text" 
                        value={answers[selectedTest.questions[activeQuestionIdx].id]?.[0] || ""}
                        onChange={(e) => handleSelectOptionNAT(selectedTest.questions[activeQuestionIdx].id, e.target.value)}
                        placeholder="Type standard numerical answer here..."
                        className="border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 max-w-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Action Footer */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-5 gap-3">
                <div className="flex gap-2">
                  <button
                    disabled={activeQuestionIdx === 0}
                    onClick={() => setActiveQuestionIdx(p => p - 1)}
                    className="border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button
                    onClick={() => toggleMarkForReview(selectedTest.questions[activeQuestionIdx].id)}
                    className={`border text-xs font-semibold px-4 py-2.5 rounded-xl transition ${
                      markedForReview[selectedTest.questions[activeQuestionIdx].id]
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {markedForReview[selectedTest.questions[activeQuestionIdx].id] ? "✓ Marked for Review" : "Mark for Review"}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => clearResponse(selectedTest.questions[activeQuestionIdx].id)}
                    className="text-slate-500 hover:text-slate-800 text-xs px-4 py-2.5 font-medium"
                  >
                    Clear Response
                  </button>
                  {activeQuestionIdx < selectedTest.questions.length - 1 ? (
                    <button
                      onClick={() => setActiveQuestionIdx(p => p + 1)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-sm transition"
                    >
                      Save & Next
                    </button>
                  ) : (
                    <button
                      onClick={() => submitTest(false)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-sm transition"
                    >
                      Submit Exam Paper
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Test Status Column */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="font-display font-semibold text-slate-900 text-sm">Response Guide Matrix</h4>
                <p className="text-slate-400 text-xs mt-0.5">Click any node to navigate.</p>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {selectedTest.questions.map((q, idx) => {
                  const hasAnswered = answers[q.id] && answers[q.id].length > 0;
                  const isMarked = markedForReview[q.id];
                  const isActive = activeQuestionIdx === idx;

                  let badgeColor = "bg-slate-50 text-slate-500 border-slate-200";
                  if (isActive) {
                    badgeColor = "border-blue-600 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-600/20";
                  } else if (isMarked) {
                    badgeColor = "bg-amber-100 border-amber-300 text-amber-800 font-medium";
                  } else if (hasAnswered) {
                    badgeColor = "bg-green-100 border-green-300 text-green-800 font-medium";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`h-11 border text-sm font-mono flex items-center justify-center rounded-xl transition ${badgeColor}`}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs font-mono text-slate-500">
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 rounded bg-green-100 border border-green-300 shrink-0" />
                  <span>Submitted Response</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 shrink-0" />
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200 shrink-0" />
                  <span>Not Attempted</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to exit the exam paper? All intermediate answers will be lost.")) {
                      setSelectedTest(null);
                      setIsTestRunning(false);
                    }
                  }}
                  className="w-full text-center bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-semibold border border-rose-100 transition"
                >
                  Exit Exam & Forfeit Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Solution/Attempt Review Room */}
      {activeReviewAttempt && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="space-y-1">
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-mono font-medium border border-emerald-100 inline-block">
                ★ Exam Assessment Certified
              </span>
              <h3 className="text-xl font-display font-bold text-slate-900 mt-2">
                Result Analysis: {activeReviewAttempt?.testTitle}
              </h3>
            </div>
            <button
              onClick={() => setActiveReviewAttempt(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              Back to Exam lobby <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Marks Report Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Score Obtained</span>
              <div className="text-3xl font-display font-bold text-blue-600">
                {activeReviewAttempt.scores.marksObtained} <span className="text-sm text-slate-400 font-normal">/ {activeReviewAttempt.scores.totalMarks}</span>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Accuracy</span>
              <div className="text-3xl font-display font-bold text-emerald-600">
                {activeReviewAttempt.scores.correctCount + activeReviewAttempt.scores.incorrectCount > 0 
                  ? Math.round((activeReviewAttempt.scores.correctCount / (activeReviewAttempt.scores.correctCount + activeReviewAttempt.scores.incorrectCount)) * 100)
                  : 0}%
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Correct Answers</span>
              <div className="text-3xl font-display font-bold text-green-600">
                {activeReviewAttempt.scores.correctCount}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center space-y-1">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Incorrect Answers</span>
              <div className="text-3xl font-display font-bold text-rose-500">
                {activeReviewAttempt.scores.incorrectCount}
              </div>
            </div>
          </div>

          {/* Step by Step derivations */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-slate-900 text-lg">Solution Manual & Explanations</h4>
            {tests.find(t => t.id === activeReviewAttempt.testId)?.questions.map((q, idx) => {
              const userAns = activeReviewAttempt.answers[q.id] || [];
              const isUnattempted = userAns.length === 0;
              
              let isCorrect = false;
              if (!isUnattempted) {
                if (q.type === QuestionType.NAT) {
                  const userNum = parseFloat(userAns[0]);
                  if (!isNaN(userNum)) {
                    if (q.correctAnswer.length === 1) {
                      isCorrect = Math.abs(userNum - parseFloat(q.correctAnswer[0])) < 0.01;
                    } else if (q.correctAnswer.length === 2) {
                      isCorrect = userNum >= parseFloat(q.correctAnswer[0]) && userNum <= parseFloat(q.correctAnswer[1]);
                    }
                  }
                } else if (q.type === QuestionType.MCQ) {
                  isCorrect = userAns[0] === q.correctAnswer[0];
                } else if (q.type === QuestionType.MSQ) {
                  const sortedCorrect = [...q.correctAnswer].sort();
                  const sortedUser = [...userAns].sort();
                  isCorrect = sortedCorrect.length === sortedUser.length && sortedCorrect.every((val, i) => val === sortedUser[i]);
                }
              }

              return (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded font-mono">
                      Q{idx + 1} - {q.type} - {q.marks} Marks
                    </span>
                    {isUnattempted ? (
                      <span className="text-xs text-slate-400 font-mono">Unattempted</span>
                    ) : isCorrect ? (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 font-mono">
                        Wrong Answer
                      </span>
                    )}
                  </div>

                  <p className="font-semibold text-slate-800 text-sm leading-relaxed">{q.questionText}</p>
                  
                  {q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {q.options.map((option, oIndex) => {
                        const isCorrectOption = q.correctAnswer.includes(String(oIndex));
                        const isSelectedByStudent = userAns.includes(String(oIndex));
                        
                        let optionStyle = "border-slate-200 bg-slate-50/50 text-slate-600";
                        if (isCorrectOption) {
                          optionStyle = "border-green-300 bg-green-50 text-green-900 font-medium";
                        } else if (isSelectedByStudent && !isCorrectOption) {
                          optionStyle = "border-rose-300 bg-rose-50 text-rose-950 text-slate-500";
                        }

                        return (
                          <div key={oIndex} className={`p-3 rounded-lg border flex items-center space-x-2.5 ${optionStyle}`}>
                            <span className="font-mono font-bold text-xs">[{String.fromCharCode(65 + oIndex)}]</span>
                            <span>{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 font-sans text-xs">
                    <div>
                      <span className="text-slate-400 font-mono">Your Submission:</span>{" "}
                      <strong className={`font-mono ${isCorrect ? "text-green-600" : "text-rose-600"}`}>
                        {isUnattempted ? "Blank" : userAns.map(a => q.options ? String.fromCharCode(65 + parseInt(a)) : a).join(" / ")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono">Official Benchmark Key:</span>{" "}
                      <strong className="text-slate-800 font-mono">
                        {q.correctAnswer.map(c => q.options ? String.fromCharCode(65 + parseInt(c)) : c).join(" / ")}
                      </strong>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-200 space-y-1.5">
                      <span className="text-blue-600 font-semibold font-display text-xs block">Shiva Mentor Formula & Derivation:</span>
                      <p className="text-slate-600 leading-relaxed font-sans text-xs whitespace-pre-line select-text">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
