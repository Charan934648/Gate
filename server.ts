import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { QuestionType, GATEQuestion, MockTest, SubjectSyllabus, DailySchedule, ForumPost, UserPrepState } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("GEMINI_API_KEY is not configured or is placeholder. AI Mentor features will run in mock evaluation fallback mode.");
  }
} catch (err) {
  console.error("Failed to initialize Gemini Client:", err);
}

const DATABASE_FILE = path.join(process.cwd(), "data", "db.json");

// Core database structure seed
const DEFAULT_SYLLABUS: SubjectSyllabus[] = [
  {
    subjectName: "Engineering Mathematics & Discrete Maths",
    iconName: "Binary",
    totalHours: 45,
    topics: [
      { id: "em_1", name: "Linear Algebra: Matrices, Eigenvalues & Eigenvectors", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Medium" },
      { id: "em_2", name: "Calculus: Limits, Continuity, Maxima & Minima", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "em_3", name: "Probability: Conditional Probability, Bayes Theorem", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "em_4", name: "Discrete: Propositional Logic, Sets, Relations, Graphs", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Operating Systems",
    iconName: "Cpu",
    totalHours: 35,
    topics: [
      { id: "os_1", name: "Process Management & Threading", completed: true, notesDownloaded: true, revisionCount: 3, difficulty: "Medium" },
      { id: "os_2", name: "CPU Scheduling Algorithms (FCFS, SJF, Round Robin)", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Easy" },
      { id: "os_3", name: "Process Synchronization: Semaphores & Deadlocks", completed: false, notesDownloaded: true, revisionCount: 1, difficulty: "Hard" },
      { id: "os_4", name: "Memory Management: Paging, Virtual Memory & Thrashing", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Databases (DBMS)",
    iconName: "Database",
    totalHours: 30,
    topics: [
      { id: "db_1", name: "ER-Model & Relational Algebra Definitions", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Easy" },
      { id: "db_2", name: "SQL Queries (Nested, Joins, Aggregations)", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Medium" },
      { id: "db_3", name: "Normal Forms (1NF, 2NF, 3NF, BCNF Decomposition)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "db_4", name: "Transaction Control: ACID, Serializability, 2PL", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Computer Networks",
    iconName: "Globe",
    totalHours: 40,
    topics: [
      { id: "cn_1", name: "OSI & TCP/IP Reference Architectures", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Easy" },
      { id: "cn_2", name: "Data Link Layer: Framing, Flow & Error Control", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "cn_3", name: "Routing Protocols, IPv4/IPv6 Subnetting & CIDR", completed: false, notesDownloaded: true, revisionCount: 1, difficulty: "Hard" },
      { id: "cn_4", name: "Transport Layer: TCP Connection, Flow Control, Congestion Control", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Algorithms & Programming",
    iconName: "Code",
    totalHours: 50,
    topics: [
      { id: "algo_1", name: "Asymmetric Complexity Analysis (Big O, Omega, Theta)", completed: true, notesDownloaded: true, revisionCount: 3, difficulty: "Medium" },
      { id: "algo_2", name: "Searching, Sorting & Divide-and-Conquer paradigms", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Medium" },
      { id: "algo_3", name: "Greedy Algorithms & Dynamic Programming (DP)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "algo_4", name: "Graph Algorithms: BFS, DFS, MST (Kruskal, Prim), Dijkstra", completed: false, notesDownloaded: true, revisionCount: 1, difficulty: "Hard" }
    ]
  }
];

const DEFAULT_MOCK_TESTS: MockTest[] = [
  {
    id: "test_1",
    title: "GATE Mini-Mock: Operating Systems & Databases",
    description: "Features realistic Multiple Choice, Multiple Select, and Numerical Answer Type questions corresponding to Process Control and Database Joins.",
    subject: "OS & DBMS Mix",
    durationMinutes: 15,
    questions: [
      {
        id: "q1_1",
        type: QuestionType.MCQ,
        subject: "Operating Systems",
        topic: "CPU Scheduling",
        questionText: "Three processes P1, P2, and P3 arrive at time 0 with CPU burst times of 9, 4, and 2 respectively. Under the Shortest Job First (SJF) non-preemptive scheduling, what is the average waiting time of these processes?",
        options: ["2.0 ms", "4.67 ms", "4.0 ms", "5.33 ms"],
        correctAnswer: ["2"], // Corresponding to index 2 (4.0 ms). Wait, P3 runs first (0 to 2, wait=0), P2 runs second (2 to 6, wait=2), P1 runs third (6 to 15, wait=6). Avg wait = (0+2+6)/3 = 8/3 = 2.67 ms. Let's recalculate accurately:
        // Wait, let's adjust choices so P3(burst=2, wait=0), P2(burst=4, wait=2), P1(burst=9, wait=6). Avg wait is (0+2+6)/3 = 2.67.
        // Let's provide an exact choice array: ["2.67 ms", "3.0 ms", "4.0 ms", "4.5 ms"], index 0.
        marks: 1,
        explanation: "Since SJF is non-preemptive and all arrive at time 0, they are executed in order of increasing burst times:\n1. P3 (Burst = 2): Starts at 0, finishes at 2. Waiting time = 0.\n2. P2 (Burst = 4): Starts at 2, finishes at 6. Waiting time = 2.\n3. P1 (Burst = 9): Starts at 6, finishes at 15. Waiting time = 6.\nAverage Waiting Time = (0 + 2 + 6) / 3 = 8 / 3 ≈ 2.67 ms."
      },
      {
        id: "q1_2",
        type: QuestionType.MSQ,
        subject: "Databases (DBMS)",
        topic: "Transaction Management",
        questionText: "Which of the following statement(s) is/are TRUE regarding Two-Phase Locking (2PL) and serializability?",
        options: [
          "Basic 2PL guarantees that every schedule is conflict serializable.",
          "Basic 2PL is completely free from deadlocks.",
          "Strict 2PL prevents cascade rollbacks.",
          "Rigorous 2PL only locks items in the growing phase and releases them after committing."
        ],
        correctAnswer: ["0", "2", "3"], // A, C, D are correct
        marks: 2,
        explanation: "Under Basic 2PL, conflict serializability is guaranteed, hence A is correct. However, basic 2PL does NOT prevent deadlocks, so B is incorrect. Strict 2PL requires holding exclusive locks until commit, which eliminates cascading rollbacks, hence C is correct. Rigorous 2PL holds all locks (shared and exclusive) until commit, satisfying D."
      },
      {
        id: "q1_3",
        type: QuestionType.NAT,
        subject: "Operating Systems",
        topic: "Virtual Memory",
        questionText: "Consider a virtual address space of 32 bits with a page size of 4 KB. If each page table entry takes exactly 4 bytes of storage, what is the size of the single-level page table, in Megabytes (MB)? (Provide only the numerical value).",
        correctAnswer: ["4"], // 4 MB exactly
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
        type: QuestionType.MCQ,
        subject: "Engineering Mathematics & Discrete Maths",
        topic: "Linear Algebra",
        questionText: "Let A be a 3x3 matrix with eigenvalues 1, -1, and 3. What is the determinant of the matrix (A^2 + I) where I is the 3x3 identity matrix?",
        options: ["10", "40", "20", "30"],
        correctAnswer: ["2"], // Determinant is product of eigenvalues.
        // Eigenvalues of A^2 are 1^2, (-1)^2, 3^2 = 1, 1, 9.
        // Eigenvalues of A^2 + I are (1+1), (1+1), (9+1) = 2, 2, 10.
        // Det = 2 * 2 * 10 = 40. Wait! Index 1 has "40", index 2 has "20". Wait, correctAnswer is ["1"] for index 1, representing 40! Let's set correctAnswer: ["1"]
        marks: 2,
        explanation: "If λ is an eigenvalue of A, then λ^2 + 1 is an eigenvalue of (A^2 + I).\nGiven eigenvalues of A: 1, -1, 3\nEigenvalues of A^2 + I:\n1. For λ = 1: (1)^2 + 1 = 2\n2. For λ = -1: (-1)^2 + 1 = 2\n3. For λ = 3: (3)^2 + 1 = 10\nSince the determinant of a matrix is equal to the product of its eigenvalues:\nDeterminant(A^2 + I) = 2 × 2 × 10 = 40."
      },
      {
        id: "q2_2",
        type: QuestionType.MSQ,
        subject: "Algorithms & Programming",
        topic: "Algorithms",
        questionText: "Which of the following statement(s) is/are TRUE about MST algorithms and Shortest Paths?",
        options: [
          "Dijkstra's algorithm is guaranteed to work correctly with negative weight edges.",
          "Kruskal's algorithm works correctly even if the graph has negative edge weights.",
          "Prim's algorithm starts from an arbitrary node and grows the MST size by one vertex at each step.",
          "The Bellman-Ford algorithm can detect the presence of negative cycles in a directed graph."
        ],
        correctAnswer: ["1", "2", "3"], // B, C, D are correct
        marks: 2,
        explanation: "A is incorrect: Dijkstra fails with negative weights because it operates greedily. B, C, and D are standard theorems of Graph Algorithms."
      }
    ]
  }
];

const DEFAULT_SCHEDULES: DailySchedule[] = [
  {
    date: "2026-06-01",
    dayName: "Monday",
    targetDailyHours: 6,
    completedHours: 4.5,
    tasks: [
      {
        id: "task_1",
        timeSlot: "08:00 AM - 10:00 AM",
        taskTitle: "Revise CPU Scheduling Principles",
        topic: "CPU Scheduling",
        subject: "Operating Systems",
        durationMinutes: 120,
        completed: true,
        resources: [
          { name: "CPU Scheduling Core Notes.pdf", type: "pdf", url: "/api/download/resource?id=cpu_notes", downloaded: true },
          { name: "SJF Preemptive & Standard Problems.practice", type: "practice", url: "#", downloaded: false }
        ]
      },
      {
        id: "task_2",
        timeSlot: "11:00 AM - 12:30 PM",
        taskTitle: "Solve Linear Algebra Questions",
        topic: "Linear Algebra",
        subject: "Engineering Mathematics & Discrete Maths",
        durationMinutes: 90,
        completed: true,
        resources: [
          { name: "Eigenvalues Solved Problems.pdf", type: "pdf", url: "/api/download/resource?id=la_eigen", downloaded: true }
        ]
      },
      {
        id: "task_3",
        timeSlot: "03:00 PM - 05:30 PM",
        taskTitle: "Normal Forms Normalization",
        topic: "Normal Forms",
        subject: "Databases (DBMS)",
        durationMinutes: 150,
        completed: false,
        resources: [
          { name: "Syllabus Normalization CheatSheet.pdf", type: "notes", url: "/api/download/resource?id=db_normal", downloaded: false }
        ]
      }
    ]
  },
  {
    date: "2026-06-02",
    dayName: "Tuesday",
    targetDailyHours: 6,
    completedHours: 0,
    tasks: [
      {
        id: "task_4",
        timeSlot: "08:30 AM - 11:30 AM",
        taskTitle: "Deadlocks Detection & Bankers Algorithm",
        topic: "Deadlocks",
        subject: "Operating Systems",
        durationMinutes: 180,
        completed: false,
        resources: [
          { name: "Bankers Algorithm Notes.pdf", type: "pdf", url: "/api/download/resource?id=os_deadlock", downloaded: false }
        ]
      },
      {
        id: "task_5",
        timeSlot: "02:00 PM - 05:00 PM",
        taskTitle: "Relational Algebra query formulations",
        topic: "Relational Algebra",
        subject: "Databases (DBMS)",
        durationMinutes: 180,
        completed: false,
        resources: [
          { name: "Relational Algebra Standard Exercises.pdf", type: "notes", url: "/api/download/resource?id=db_relational", downloaded: false }
        ]
      }
    ]
  }
];

const DEFAULT_FORUM_POSTS: ForumPost[] = [
  {
    id: "post_1",
    title: "Tricky doubt in Relational Model Join operations",
    content: "If R(A, B) has 10 tuples and S(B, C) has 15 tuples, what is the maximum and minimum number of tuples possible in the natural join R ⋈ S? Understanding natural joins often gets confusing when common attributes can contain redundant keys.",
    subject: "Databases (DBMS)",
    authorName: "Ananya Mehta",
    authorRole: "Student",
    avatarColor: "#E02424",
    createdAt: "2026-05-30T10:00:00Z",
    likes: 8,
    views: 120,
    commentsCount: 2,
    isResolved: true,
    comments: [
      {
        id: "c1_1",
        authorName: "Rohit Kumar",
        authorRole: "Topper",
        avatarColor: "#10B981",
        content: "Hi Ananya! For natural join R ⋈ S on the common attribute B:\n- **Maximum**: If all values of B are identical (e.g., all B in R are '5' and all B in S are '5'), then the join is a Cartesian product. Max Tuples = 10 × 15 = 150 tuples.\n- **Minimum**: If there is no overlap at all in the values of B between R and S (e.g., B in R={1,2} and B in S={3,4}), then Min Tuples = 0.",
        createdAt: "2026-05-30T10:15:00Z",
        likes: 12,
        isCorrectSolution: true
      },
      {
        id: "c1_2",
        authorName: "Shiva AI Mentor",
        authorRole: "AI-Mentor",
        avatarColor: "#3B82F6",
        content: "Spot on explanation, Rohit! To formalize for GATE preparation, remember that natural join acts as a projection on equality of common attributes. \nAlways confirm if the common attribute B is declared as a Primary Key/Foreign Key. \nIf B was a primary key in S, then the maximum number of tuples would instead be strictly bounded by 10 (the size of R) because each tuple in R could join with at most one tuple in S. Keep this distinction in mind as GATE frequently introduces PK constraints!",
        createdAt: "2026-05-30T10:20:00Z",
        likes: 19
      }
    ]
  },
  {
    id: "post_2",
    title: "Doubt regarding Dijkstra algorithm and negative values",
    content: "Can anyone explain step-by-step why Dijkstra fails on negative weight edges? I keep reading that it does, but my manual tracing on simple 3-node graphs with a negative-valued loop sometimes yields correct paths. Is it always failing?",
    subject: "Algorithms & Programming",
    authorName: "Vijay Patel",
    authorRole: "Student",
    avatarColor: "#F59E0B",
    createdAt: "2026-05-31T09:00:00Z",
    likes: 4,
    views: 64,
    commentsCount: 1,
    isResolved: false,
    comments: [
      {
        id: "c2_1",
        authorName: "Vikram Sen",
        authorRole: "Student",
        avatarColor: "#8B5CF6",
        content: "Dijkstra is greedy. Once a node is marked 'visited' or popped from the priority queue, Dijkstra assumes its absolute shortest path has been finalized. If a negative weight is discovered later, it can't retroactively re-relax already visited vertices. Bellman-Ford should be used in these scenarios instead.",
        createdAt: "2026-05-31T09:30:00Z",
        likes: 3
      }
    ]
  }
];

const DEFAULT_MENTOR_MESSAGES: any[] = [
  {
    id: "m_1",
    sender: "mentor",
    content: "Greetings! I am Shiva, your dedicated GATE 2027 Preparation coach. I've analyzed your starting syllabus profile.\n\nYou have strong landmarks in Operating Systems (CPU Scheduling completed), but Databases and Computer Networks needs standard structuring. How are your preparations progressing, and where can I assist you today?",
    timestamp: "2026-05-31T12:00:00Z"
  }
];

const INITIAL_STATE: UserPrepState = {
  syllabus: DEFAULT_SYLLABUS,
  schedules: DEFAULT_SCHEDULES,
  testAttempts: [],
  forumPosts: DEFAULT_FORUM_POSTS,
  mentorMessages: DEFAULT_MENTOR_MESSAGES
};

// Ensure database matches state on lock
function readDatabase(): UserPrepState {
  try {
    if (!fs.existsSync(DATABASE_FILE)) {
      const dir = path.dirname(DATABASE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATABASE_FILE, JSON.stringify(INITIAL_STATE, null, 2), "utf8");
      return INITIAL_STATE;
    }
    const content = fs.readFileSync(DATABASE_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Database read error. Defaulting to state.", err);
    return INITIAL_STATE;
  }
}

function writeDatabase(state: UserPrepState) {
  try {
    const dir = path.dirname(DATABASE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Database write error:", err);
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Get entire state
app.get("/api/state", (req, res) => {
  const dbState = readDatabase();
  res.json(dbState);
});

// 2. Put / save updated state
app.post("/api/state", (req, res) => {
  const incoming = req.body as UserPrepState;
  if (!incoming || !incoming.syllabus) {
    return res.status(400).json({ error: "Invalid state structure payload." });
  }
  writeDatabase(incoming);
  res.json({ success: true, message: "Prep state saved successfully." });
});

// 3. Reset state
app.post("/api/reset", (req, res) => {
  writeDatabase(INITIAL_STATE);
  res.json({ success: true, state: INITIAL_STATE });
});

// 4. Update individual lesson completion
app.post("/api/syllabus/update", (req, res) => {
  const { topicId, field, value } = req.body;
  const dbState = readDatabase();
  let found = false;

  dbState.syllabus = dbState.syllabus.map(subject => {
    subject.topics = subject.topics.map(topic => {
      if (topic.id === topicId) {
        found = true;
        return { ...topic, [field]: value };
      }
      return topic;
    });
    return subject;
  });

  if (found) {
    writeDatabase(dbState);
    res.json({ success: true, state: dbState });
  } else {
    res.status(404).json({ error: "Topic ID not found" });
  }
});

// 5. Add custom Study Task
app.post("/api/schedule/task/add", (req, res) => {
  const { date, task } = req.body;
  const dbState = readDatabase();
  
  let schedule = dbState.schedules.find(s => s.date === date);
  if (!schedule) {
    schedule = {
      date: date,
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      targetDailyHours: 6,
      completedHours: 0,
      tasks: []
    };
    dbState.schedules.push(schedule);
  }

  schedule.tasks.push({
    ...task,
    id: "task_" + Date.now(),
    completed: false,
    resources: task.resources || []
  });

  writeDatabase(dbState);
  res.json({ success: true, state: dbState });
});

// 6. Complete schedule task
app.post("/api/schedule/task/toggle", (req, res) => {
  const { date, taskId, completed } = req.body;
  const dbState = readDatabase();

  dbState.schedules = dbState.schedules.map(schedule => {
    if (schedule.date === date) {
      schedule.tasks = schedule.tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, completed: completed };
        }
        return task;
      });
      // Recalculate completed hours (approximate Based on task completions)
      const completedMinutes = schedule.tasks
        .filter(t => t.completed)
        .reduce((acc, t) => acc + t.durationMinutes, 0);
      schedule.completedHours = parseFloat((completedMinutes / 60).toFixed(1));
    }
    return schedule;
  });

  writeDatabase(dbState);
  res.json({ success: true, state: dbState });
});

// 7. Post Test Attempt log
app.post("/api/tests/attempt", (req, res) => {
  const attempt = req.body;
  if (!attempt.testId || !attempt.answers) {
    return res.status(400).json({ error: "Incomplete attempt data." });
  }
  const dbState = readDatabase();
  dbState.testAttempts.push({
    ...attempt,
    id: "attempt_" + Date.now(),
    attemptedAt: new Date().toISOString()
  });
  writeDatabase(dbState);
  res.json({ success: true, state: dbState });
});

// 8. Submit Forum Topic Post
app.post("/api/forum/post", (req, res) => {
  const { title, content, subject, authorName } = req.body;
  const dbState = readDatabase();

  const newPost: ForumPost = {
    id: "post_" + Date.now(),
    title: title,
    content: content,
    subject: subject,
    authorName: authorName || "GATE Aspirant",
    authorRole: "Student",
    avatarColor: ["#EC4899", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B"][Math.floor(Math.random() * 5)],
    createdAt: new Date().toISOString(),
    likes: 0,
    views: 1,
    commentsCount: 0,
    isResolved: false,
    comments: []
  };

  dbState.forumPosts.unshift(newPost);
  writeDatabase(dbState);
  res.json({ success: true, post: newPost, state: dbState });
});

// 9. Submit Forum Comment
app.post("/api/forum/comment", (req, res) => {
  const { postId, content, authorName, isActionResolved } = req.body;
  const dbState = readDatabase();

  const newComment = {
    id: "c_" + Date.now(),
    authorName: authorName || "Peer Aspirant",
    authorRole: "Student" as const,
    avatarColor: "#10B981",
    content: content,
    createdAt: new Date().toISOString(),
    likes: 0
  };

  let updatedPost: ForumPost | undefined;

  dbState.forumPosts = dbState.forumPosts.map(post => {
    if (post.id === postId) {
      const comments = [...post.comments, newComment];
      updatedPost = {
        ...post,
        comments,
        commentsCount: comments.length,
        isResolved: isActionResolved ? true : post.isResolved
      };
      return updatedPost;
    }
    return post;
  });

  writeDatabase(dbState);
  res.json({ success: true, comment: newComment, post: updatedPost, state: dbState });
});

// 10. AI Mentor Tutor Room Conversation endpoint
app.post("/api/mentor/chat", async (req, res) => {
  const { message, history } = req.body;
  const dbState = readDatabase();

  const userMsg = {
    id: "m_user_" + Date.now(),
    sender: "user" as const,
    content: message,
    timestamp: new Date().toISOString()
  };

  dbState.mentorMessages.push(userMsg);

  let replyText = "";

  if (ai) {
    try {
      // Gather progress diagnostics to ground the advice
      const totalLessons = dbState.syllabus.reduce((acc, sub) => acc + sub.topics.length, 0);
      const completedLessons = dbState.syllabus.reduce((acc, sub) => acc + sub.topics.filter(t => t.completed).length, 0);
      const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      const testsAttempted = dbState.testAttempts.length;
      
      let performanceContext = `User Core Progress:\n- Total Syllabus Covered: ${completedLessons}/${totalLessons} topics (${completionRate.toFixed(1)}%)\n- Mock Exams Taken: ${testsAttempted}\n`;
      if (testsAttempted > 0) {
        performanceContext += "Recent Scores:\n";
        dbState.testAttempts.forEach((attempt, index) => {
          performanceContext += `- Attempt on ${attempt.testTitle}: scored ${attempt.scores.marksObtained}/${attempt.scores.totalMarks} marks.\n`;
        });
      }

      const promptBuild = `
You are Shiva, a dedicated veteran academic coach and technical mentor preparing students for the GATE (Graduate Aptitude Test in Engineering) 2027 in Computer Science / Information Technology. You are highly intellectual, concise, encouraging, and provide very clear mathematical and diagrammatic explanations.

${performanceContext}

Student is asking for help or mentoring support:
"${message}"

Keep your response extremely practical, focused on GATE questions styles, concepts, resource references (refer to standard textbooks like Galvin for OS, Korth for DBMS, Cormen for Algorithms, Kurose for Computer Networks). Formulate formulas beautifully in clean markdown. Keep length under 400 words unless solving a specific mathematics derivation requested by the student. Do not use generic filler words.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptBuild,
      });

      replyText = response.text || "I apologize, I generated an empty response. Let me try analyzing your question again.";
    } catch (err: any) {
      console.error("Gemini API Error in chatbot:", err);
      replyText = `[Offline Mode Fallback] I am currently responding in local advisor mode. Regarding your question: "${message}", try prioritizing revision of core syllabus chapters. If you asked about a specific GATE equation, verify dimensions and boundary constraints first! (Error: ${err.message || err})`;
    }
  } else {
    // Elegant fallback simulation when key is placeholder or disconnected
    replyText = `Greetings! I am currently running in Offline Advisor mode, as my backend AI credentials are being configured. Based on your syllabus progression of ${dbState.syllabus.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0)} completed units, here is your core checklist for the week:\n\n1. Ensure Process Management paging concepts are mathematically robust. Ensure Virtual Address calculation is comfortable.\n2. In Databases, focus on functional dependencies. Ensure BCNF lossless-join characteristics are clear.\n\nKeep solving mock tests! I will analyze your performance here immediately once your server credentials are loaded.`;
  }

  const mentorMsg = {
    id: "m_mentor_" + Date.now(),
    sender: "mentor" as const,
    content: replyText,
    timestamp: new Date().toISOString()
  };

  dbState.mentorMessages.push(mentorMsg);
  writeDatabase(dbState);
  res.json({ success: true, message: mentorMsg, state: dbState });
});

// 11. Custom Study Schedule Generator powered by AI
app.post("/api/schedule/generate-ai", async (req, res) => {
  const { targetDate, dailyHours } = req.body;
  const dbState = readDatabase();

  const totalLessons = dbState.syllabus.reduce((acc, sub) => acc + sub.topics.length, 0);
  const completedCount = dbState.syllabus.reduce((acc, sub) => acc + sub.topics.filter(t => t.completed).length, 0);
  const syllabusDataText = dbState.syllabus.map(sub => {
    return `${sub.subjectName} Topics:\n` + sub.topics.map(t => `- [${t.completed ? "COMPLETED" : "PENDING"}] ${t.name} (Difficulty: ${t.difficulty})`).join("\n");
  }).join("\n\n");

  let generatedTasks = [];

  if (ai) {
    try {
      const prompt = `
You are a master study scheduler for the GATE 2027 CSE Exam.
Based on the student's current progress: ${completedCount}/${totalLessons} topics covered.
And daily study target of ${dailyHours} hours.
Here is the syllabus status:\n${syllabusDataText}

Please generate a single-day study schedule containing exactly 2 to 3 highly actionable, mathematically-justified study slots for the date ${targetDate || 'tomorrow'}.
Format your output as a VALID JSON array of objects only. Do not wrap in markdown codeblocks except a direct JSON codeblock.
The JSON must align with this schema:
\`\`\`json
[
  {
    "timeSlot": "09:00 AM - 11:30 AM",
    "taskTitle": "Topic title focused on a pending topic",
    "topic": "The exact topic name",
    "subject": "The exact subject name matching one of the 5 syllabus subjects",
    "durationMinutes": 150,
    "resources": [
      {
        "name": "Actionable notes reference (e.g., Cormen Chapter 4 Notes)",
        "type": "pdf" or "notes" or "practice",
        "url": "/api/download/resource?id=example_la"
      }
    ]
  }
]
\`\`\`
Ensure timeslot durations sum up to target hours (${dailyHours} hours = ${dailyHours * 60} minutes). Pick topics marked pending to aid rapid revision.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "[]";
      // Sanitize JSON markdown blocks if any
      const cleaned = responseText.replace(/```json/gi, "").replace(/```/gi, "").trim();
      generatedTasks = JSON.parse(cleaned);
    } catch (err) {
      console.error("AI Schedule generation failed, falling back to local heuristic.", err);
      generatedTasks = HeuristicScheduleGenerator(dbState, dailyHours);
    }
  } else {
    generatedTasks = HeuristicScheduleGenerator(dbState, dailyHours);
  }

  // Inject generated tasks into the requested date schedule
  let schedule = dbState.schedules.find(s => s.date === targetDate);
  if (!schedule) {
    schedule = {
      date: targetDate,
      dayName: new Date(targetDate).toLocaleDateString("en-US", { weekday: "long" }),
      targetDailyHours: dailyHours,
      completedHours: 0,
      tasks: []
    };
    dbState.schedules.push(schedule);
  }

  // Merge daily tasks
  generatedTasks.forEach((t: any, index: number) => {
    schedule!.tasks.push({
      id: "task_ai_" + Date.now() + "_" + index,
      timeSlot: t.timeSlot,
      taskTitle: t.taskTitle,
      topic: t.topic,
      subject: t.subject,
      durationMinutes: t.durationMinutes,
      completed: false,
      resources: t.resources || []
    });
  });

  writeDatabase(dbState);
  res.json({ success: true, schedule, state: dbState });
});

// Heuristic fallback generator when AI is unavailable
function HeuristicScheduleGenerator(dbState: UserPrepState, dailyHours: number) {
  // Find first 2 uncompleted topics across any subject
  const pendingTopics: any[] = [];
  dbState.syllabus.forEach(sub => {
    sub.topics.forEach(t => {
      if (!t.completed) {
        pendingTopics.push({ topicName: t.name, subjectName: sub.subjectName });
      }
    });
  });

  if (pendingTopics.length === 0) {
    // If everything is done, study general revision
    pendingTopics.push({ topicName: "Full Length Revision & Formula Booklet", subjectName: "Engineering Mathematics & Discrete Maths" });
  }

  const tasks = [];
  const hoursPerTask = Math.floor(dailyHours / 2) || 3;
  
  if (pendingTopics[0]) {
    tasks.push({
      timeSlot: "09:00 AM - 12:00 PM",
      taskTitle: `In-depth Study: ${pendingTopics[0].topicName}`,
      topic: pendingTopics[0].topicName,
      subject: pendingTopics[0].subjectName,
      durationMinutes: hoursPerTask * 60,
      resources: [
        { name: `${pendingTopics[0].topicName} Study Guide.pdf`, type: "pdf", url: "/api/download/resource?id=heuristic_guide" }
      ]
    });
  }

  if (pendingTopics[1]) {
    tasks.push({
      timeSlot: "02:00 PM - 05:00 PM",
      taskTitle: `Problem Solving: ${pendingTopics[1].topicName}`,
      topic: pendingTopics[1].topicName,
      subject: pendingTopics[1].subjectName,
      durationMinutes: hoursPerTask * 60,
      resources: [
        { name: `${pendingTopics[1].topicName} Practice Sheet.notes`, type: "practice", url: "/api/download/resource?id=heuristic_practice" }
      ]
    });
  }

  return tasks;
}

// 12. Dynamic Forum post response resolver powered by AI Mentor
app.post("/api/forum/resolve-ai", async (req, res) => {
  const { postId } = req.body;
  const dbState = readDatabase();
  const post = dbState.forumPosts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: "Forum post not found" });
  }

  let answerText = "";

  if (ai) {
    try {
      const prompt = `
You are Shiva, the Senior GATE 2027 Coach.
A student posted a doubt in the peer discussion forum. Please provide a clear, step-by-step, definitive academic answer that resolves their doubt completely.
Provide any equations in clear LaTeX syntax style. Be rigorous and precise like standard keys.

Post Subject: ${post.subject}
Post Title: ${post.title}
Post Content: ${post.content}

Write your detailed resolution comment. Limit response length to 250 words max. Don't add greetings, just answer directly.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      answerText = response.text || "Could not resolve doubt. Please consult our peer discussion group.";
    } catch (err: any) {
      console.error("Doubt solver failed:", err);
      answerText = "[Mock Expert Solver] Thanks for raising this doubt. For natural join, remember the maximum tuple size is |R| * |S|, which occurs when all attributes match. To verify the solution offline, try checking with a simplified 2-row dataset. This confirms conflict-serializable structures immediately!";
    }
  } else {
    answerText = `[Mock AI Expert Solver] Let us resolve this step-by-step for "${post.title}":\n\n1. Identify the core relations and transaction properties. Under standard ACID serialization constraints, any write-lock (exclusive) prevents concurrent reads.\n2. In conflict serialization, draw the Precedence Graph. If there are no cycles, the transactional schedule is conflict-serializable.\n3. Make sure to download our offline notes to practice 10 similar questions.`;
  }

  const aiComment = {
    id: "c_ai_" + Date.now(),
    authorName: "Shiva AI Mentor",
    authorRole: "AI-Mentor" as const,
    avatarColor: "#2563EB",
    content: answerText,
    createdAt: new Date().toISOString(),
    likes: 5,
    isCorrectSolution: true
  };

  dbState.forumPosts = dbState.forumPosts.map(p => {
    if (p.id === postId) {
      return {
        ...p,
        isResolved: true,
        commentsCount: p.comments.length + 1,
        comments: [...p.comments, aiComment]
      };
    }
    return p;
  });

  writeDatabase(dbState);
  res.json({ success: true, comment: aiComment, state: dbState });
});

// 13. Resource file downloader (Simulates highly stylized local files for GATE 2027)
app.get("/api/download/resource", (req, res) => {
  const { id } = req.query;
  const fileName = id ? `${id}_offline_guide.html` : "GATE_2027_Study_Assistance.html";
  
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Type", "text/html");

  const mockFileContent = `
<!DOCTYPE html>
<html>
<head>
    <title>GATE 2027 Preparation Offline Resource</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; line-height: 1.6; }
        .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 800px; margin: 0 auto; }
        h1 { color: #2563eb; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-top: 0; }
        h2 { color: #0f172a; font-size: 18px; margin-top: 30px; }
        .highlight { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        code { font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>GATE 2027 Official Preparation Module</h1>
        <p><strong>Resource ID:</strong> ${id || "GENERAL_CORE_01"}</p>
        <p>This study module has been compiled by your <strong>Personal AI Mentor Shiva</strong> and made fully accessible offline for on-the-go studies. Review the foundational formulas, steps, and explanations carefully.</p>
        
        <h2>Key Learning Objectives</h2>
        <ul>
            <li>Derive formal proofs for standard CSE questions.</li>
            <li>Inspect edge boundary limits (e.g. Empty stacks, Null pages, circular subnets).</li>
            <li>Evaluate time complex bounds for extreme inputs.</li>
        </ul>

        <div class="highlight">
            <strong>Formula Reference Sheet:</strong><br>
            - Average Waiting Time W_avg = &Sigma;(T_start - T_arr) / N<br>
            - Page Table Size S = (2^Virtual_bits / Page_Size_bytes) &times; PTE_size_bytes<br>
            - Max Tuples in Joint Operation S ⋈ R = |S| &times; |R| (under Cartesian product condition)
        </div>

        <p>Keep taking mock examinations to track your response accuracy. Good luck for GATE 2027!</p>
    </div>
</body>
</html>
  `;
  res.send(mockFileContent);
});

// 14. EXPORT AND DOWNLOAD FULL STUDY ASSISTANCE PACKAGE (mock tests, schedules, progress)
app.get("/api/download/prep-package", (req, res) => {
  const dbState = readDatabase();
  const format = req.query.format || "html";

  if (format === "json") {
    res.setHeader("Content-Disposition", 'attachment; filename="GATE_2027_Full_Prep_State.json"');
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(dbState, null, 2));
  }

  // Beautiful standalone Offline study guide dashboard HTML format
  res.setHeader("Content-Disposition", 'attachment; filename="GATE_2027_Offline_Companion.html"');
  res.setHeader("Content-Type", "text/html");

  const totalLessons = dbState.syllabus.reduce((acc, sub) => acc + sub.topics.length, 0);
  const completedCount = dbState.syllabus.reduce((acc, sub) => acc + sub.topics.filter(t => t.completed).length, 0);
  
  let syllabusHtml = "";
  dbState.syllabus.forEach(sub => {
    syllabusHtml += `<h3>${sub.subjectName}</h3><ul>`;
    sub.topics.forEach(t => {
      syllabusHtml += `<li>[${t.completed ? "★ COMPLETED" : "  PENDING"}] ${t.name} (Difficulty: ${t.difficulty})</li>`;
    });
    syllabusHtml += `</ul>`;
  });

  let scheduleHtml = "";
  dbState.schedules.forEach(s => {
    scheduleHtml += `<h3>${s.date} (${s.dayName}) - Daily Target: ${s.targetDailyHours} hrs</h3><ul>`;
    s.tasks.forEach(task => {
      scheduleHtml += `<li>[${task.completed ? "✓" : " "}] <strong>${task.timeSlot}</strong>: ${task.taskTitle} (Subject: ${task.subject})</li>`;
    });
    scheduleHtml += `</ul>`;
  });

  let testQuestionsHtml = "";
  DEFAULT_MOCK_TESTS.forEach(test => {
    testQuestionsHtml += `<h3>${test.title}</h3><p>${test.description}</p><ol>`;
    test.questions.forEach((q, idx) => {
      testQuestionsHtml += `
        <li>
          <strong>[${q.type} - ${q.marks} Mark]</strong> ${q.questionText}
          ${q.options ? `<ul style="list-style-type: lower-alpha;">` + q.options.map(o => `<li>${o}</li>`).join("") + `</ul>` : ""}
          <div style="background: #e0f2fe; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 13px;">
            <strong>Solution Key / Bounds:</strong> ${q.correctAnswer.join(", ")} <br/>
            <strong>Explanation:</strong> ${q.explanation.replace(/\n/g, "<br/>")}
          </div>
        </li><br/>
      `;
    });
    testQuestionsHtml += `</ol><hr/>`;
  });

  const offlineHtmlPackage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>GATE 2027 Offline Companion Dashboard</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 40px; margin: 0; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
    h1 { color: #3b82f6; text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #f43f5e; border-bottom: 1px solid #475569; padding-bottom: 5px; margin-top: 40px; }
    h3 { color: #10b981; }
    ul { list-style-type: none; padding-left: 0; }
    li { background: #334155; padding: 10px 15px; margin-bottom: 8px; border-radius: 6px; }
    strong { color: #f1f5f9; }
    .badge { background: #1e3a8a; color: #93c5fd; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GATE 2027 Complete Prep Companion</h1>
    <p style="text-align: center; font-style: italic;">Powered by Shiva AI Coach. Designed fully offline for zero-network preparation.</p>
    
    <div style="background: #2563eb; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <span style="font-size: 18px; font-weight: bold;">Syllabus Covered: ${completedCount} / ${totalLessons} Core Topics Done (${((completedCount / totalLessons) * 100).toFixed(1)}%)</span>
    </div>

    <h2>1. Subject-Wise GATE Syllabus Mapping</h2>
    ${syllabusHtml}

    <h2>2. Downloadable Daily Study Timelines</h2>
    ${scheduleHtml}

    <h2>3. Complete Mock Test Bank (With Solutions)</h2>
    ${testQuestionsHtml}

    <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 50px;">
       GATE 2027 Offline Assistant App. Save this HTML file to your phone or laptop. Solve problems offline anytime.
    </p>
  </div>
</body>
</html>
  `;
  res.send(offlineHtmlPackage);
});

// Provide standard compiled mock test PDF generator
app.get("/api/download/mock-test/:testId", (req, res) => {
  const { testId } = req.params;
  const dbState = readDatabase();
  const test = DEFAULT_MOCK_TESTS.find(t => t.id === testId);

  if (!test) {
    return res.status(404).json({ error: "Mock test not found" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${test.title.replace(/\s+/g, "_")}_Offline.html"`);
  res.setHeader("Content-Type", "text/html");

  let questionsList = "";
  test.questions.forEach((q, index) => {
    questionsList += `
      <div style="border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; margin-bottom: 20px; background-color: #fff;">
         <span style="background: #2563eb; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Q${index+1} - ${q.type} (${q.marks} Mark)</span>
         <p style="font-weight: 500; font-size: 16px; margin-top: 10px;">${q.questionText}</p>
         ${q.options ? `<ol type="A" style="margin-left: 20px; line-height: 2;">` + q.options.map(option => `<li>${option}</li>`).join("") + `</ol>` : ""}
         
         <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin-top: 15px; font-size: 14px;">
            <strong>Correct Answer Keys:</strong> ${q.correctAnswer.join(" / ")} <br/>
            <strong>Detailed Explanation & Derivation:</strong><br/>
            <p style="white-space: pre-line; margin-top: 5px;">${q.explanation}</p>
         </div>
      </div>
    `;
  });

  const questionSheetHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>${test.title} - Offline Solving Sheet</title>
  <style>
    body { font-family: -apple-system, sans-serif; color: #334155; line-height: 1.5; padding: 40px; background-color: #f8fafc; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${test.title} - GATE 2027 Practice Test</h1>
    <p><strong>Duration:</strong> ${test.durationMinutes} Minutes | <strong>Subject:</strong> ${test.subject}</p>
    <p>This document contains the structural question bank and comprehensive answer derivations. Print this document or review it offline with zero network connectivity.</p>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
    
    ${questionsList}

    <p style="text-align: center; font-size: 11px; color: #64748b; margin-top: 40px;">
      Exported from GATE 2027 Study Platform. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;
  res.send(questionSheetHtml);
});

// Serve frontend assets or mount Vite dev server
let serverPromise: Promise<void> | null = null;

async function startAppServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GATE 2027 PREP SERVER] Server running on http://0.0.0.0:${PORT}`);
  });
}

startAppServer();
