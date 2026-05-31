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
    subjectName: "Discrete Mathematics & Linear Algebra",
    iconName: "Binary",
    totalHours: 45,
    topics: [
      { id: "dm_1", name: "Propositional & First-Order Logic; Sat, Tautologies", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Medium" },
      { id: "dm_2", name: "Combinatorics: Generating Functions & Pigeonhole Principle", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "dm_3", name: "Graph Theory: Connectivity, Coloring & Planarity", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "dm_4", name: "Linear Algebra: Matrices, Eigenvalues & Cayley-Hamilton", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Medium" }
    ]
  },
  {
    subjectName: "Digital Logic & Computer Architecture",
    iconName: "Cpu",
    totalHours: 35,
    topics: [
      { id: "dl_1", name: "Boolean Minimization, K-Maps & Combinational Circuits", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Easy" },
      { id: "dl_2", name: "Sequential Circuits: Counters, Registers & State Diagrams", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "dl_3", name: "Instruction Pipelining: Hazards, Speedup & CPI", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "dl_4", name: "Memory Hierarchy: Cache Mapping & Page Replacement", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Programming & Data Structures",
    iconName: "Code",
    totalHours: 40,
    topics: [
      { id: "ds_1", name: "Recursion, Pointer Arithmetic & Parameter Passing in C", completed: true, notesDownloaded: true, revisionCount: 3, difficulty: "Medium" },
      { id: "ds_2", name: "Stacks, Queues, Linked Lists & Arrays", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Easy" },
      { id: "ds_3", name: "Binary Trees, Binary Search Trees & AVL Trees", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "ds_4", name: "Heaps: Max/Min Heap Operations & Priority Queues", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" }
    ]
  },
  {
    subjectName: "Algorithms Complexities & Graphs",
    iconName: "Code",
    totalHours: 50,
    topics: [
      { id: "alg_1", name: "Asymptotics: Big-O, Master Theorem for Recurrences", completed: true, notesDownloaded: true, revisionCount: 3, difficulty: "Medium" },
      { id: "alg_2", name: "Greedy vs. Dynamic Programming (Matrix Chain, Knapsack)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "alg_3", name: "Graph Search: BFS, DFS, Dijkstra & Bellman-Ford", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Hard" },
      { id: "alg_4", name: "MST Algorithms (Kruskal, Prim) & NP-Completeness", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Theory of Computation",
    iconName: "Binary",
    totalHours: 45,
    topics: [
      { id: "toc_1", name: "DFAs, NFAs, Minimization & Regular Expressions", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Medium" },
      { id: "toc_2", name: "Context-Free Grammars, Languages & Pushdown Automata", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "toc_3", name: "Turing Machines, Computability & Church-Turing Thesis", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "toc_4", name: "Undecidable Problems: Halting & Post Correspondence", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Compiler Design",
    iconName: "Cpu",
    totalHours: 30,
    topics: [
      { id: "cd_1", name: "Lexical Analysis & LL(1) Parsing Table Construction", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Medium" },
      { id: "cd_2", name: "LR Parsers: LR(0), SLR(1), LALR(1) & CLR(1)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "cd_3", name: "Syntax-Directed Translation (S-attributed & L-attributed)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "cd_4", name: "Intermediate Code, Three-Address Code & Register Storage", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" }
    ]
  },
  {
    subjectName: "Operating Systems",
    iconName: "Cpu",
    totalHours: 35,
    topics: [
      { id: "os_1", name: "Process Synchronization: Semaphores, Deadlocks & Bankers", completed: true, notesDownloaded: true, revisionCount: 3, difficulty: "Medium" },
      { id: "os_2", name: "CPU Scheduling Algorithms (FCFS, SJF, Round Robin, SRTF)", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Easy" },
      { id: "os_3", name: "Memory Management: Paging & Segmentation schemes", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "os_4", name: "Virtual Memory, Thrashing & Page Replacement (LRU, FIFO)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Databases (DBMS)",
    iconName: "Database",
    totalHours: 30,
    topics: [
      { id: "db_1", name: "Relational Algebra Formulations & SQL Queries", completed: true, notesDownloaded: true, revisionCount: 2, difficulty: "Easy" },
      { id: "db_2", name: "Normal Forms: Functional Dependencies, 3NF & BCNF", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "db_3", name: "Transactions Concurrency: Conflict Serializability, 2PL", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "db_4", name: "Database Indexing: B & B+ Tree heights & Search Costs", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "Computer Networks",
    iconName: "Globe",
    totalHours: 40,
    topics: [
      { id: "cn_1", name: "Concept of Layering: OSI, TCP/IP, Framing & Sliding Windows", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Easy" },
      { id: "cn_2", name: "IPv4, IPv6, Subnetting, CIDR & Address Routing", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "cn_3", name: "Routing Protocols: Link State (OSPF) & Distance Vector (RIP)", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" },
      { id: "cn_4", name: "Transport Layer: TCP Connection, Flow & Congestion Control", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Hard" }
    ]
  },
  {
    subjectName: "General Aptitude",
    iconName: "Award",
    totalHours: 25,
    topics: [
      { id: "ga_1", name: "Quantitative Aptitude & Clocks/Series Sequences", completed: true, notesDownloaded: true, revisionCount: 1, difficulty: "Easy" },
      { id: "ga_2", name: "Analytical Reasoning & Spatial Visual Layouts", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" },
      { id: "ga_3", name: "Verbal Ability: Contextual Synonyms & Logics", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Easy" },
      { id: "ga_4", name: "Data Interpretation, Charts & Syllogism deductions", completed: false, notesDownloaded: false, revisionCount: 0, difficulty: "Medium" }
    ]
  }
];

const DEFAULT_MOCK_TESTS: MockTest[] = [
  {
    id: "test_1",
    title: "GATE Mini-Mock 1: Automata & Discrete Math",
    description: "Evaluates finite automata structures, CFL closure and set membership properties, and onto function combinatorics.",
    subject: "Theory of Computation & Math",
    durationMinutes: 15,
    questions: [
      {
        id: "q1_1",
        type: QuestionType.MCQ,
        subject: "Theory of Computation",
        topic: "DFAs, NFAs, Minimization & Regular Expressions",
        questionText: "What is the minimum number of states in a minimal Deterministic Finite Automaton (DFA) accepting the language L = { w ∈ {0, 1}* | w contains '010' as a substring }?",
        options: ["3 states", "4 states", "5 states", "6 states"],
        correctAnswer: ["1"], // Index 1 represents "4 states"
        marks: 1,
        explanation: "To detect the substring '010', we construct states corresponding to progress historical prefixes:\n- State q0 (Start): No prefix found yet.\n- State q1: Found '0'.\n- State q2: Found '01'.\n- State q3 (Accept/Trap): Found '010'. Any further inputs keep us here.\nMinimal DFA requires exactly 4 states (q0, q1, q2, q3)."
      },
      {
        id: "q1_2",
        type: QuestionType.MSQ,
        subject: "Theory of Computation",
        topic: "Context-Free Grammars, Languages & Pushdown Automata",
        questionText: "Which of the following statement(s) are TRUE regarding properties of Context-Free Languages (CFL) and Context-Free Grammars (CFG)?",
        options: [
          "The intersection of any two Context-Free Languages is always Context-Free.",
          "The complement of a Context-Free Language is not necessarily Context-Free.",
          "Deterministic Pushdown Automata (DPDA) are strictly less powerful than non-deterministic Pushdown Automata (PDA).",
          "Checking the equivalence of two general Context-Free Grammars is an undecidable decision problem."
        ],
        correctAnswer: ["1", "2", "3"], // Options B, C, D are true
        marks: 2,
        explanation: "1. CFLs are NOT closed under intersection, so Option A is false (e.g. L1 = {a^n b^n c m} and L2 = {a m b^n c^n}).\n2. CFLs are not closed under complementation, so is not necessarily Context-Free (Option B is true).\n3. DPDAs recognize Deterministic CFLs, which are a proper subset of general CFLs (Option C is true).\n4. CFG equivalence is a well-known undecidable problem (Option D is true)."
      },
      {
        id: "q1_3",
        type: QuestionType.NAT,
        subject: "Discrete Mathematics & Linear Algebra",
        topic: "Combinatorics: Generating Functions & Pigeonhole Principle",
        questionText: "What is the total number of onto functions (surjections) from a set A containing exactly 4 elements to a set B containing exactly 2 elements? (Provide only the integer numerical value).",
        correctAnswer: ["14"], // 2^4 - 2 = 14
        marks: 2,
        explanation: "For any function from set A (size m) to set B (size n), the count of onto functions is given by inclusion-exclusion:\nFor n = 2 and m = 4:\nNumber of total possible functions = 2^4 = 16.\nSub-functions mapping all 4 elements to only one option (not onto) occurs when all map to set element 1 or all map to set element 2. There are exactly 2 such functions.\nOnto Functions = Total - Incomplete = 16 - 2 = 14."
      }
    ]
  },
  {
    id: "test_2",
    title: "GATE Mini-Mock 2: Systems, Pipelining & Paging",
    description: "Focuses on CPU scheduling wait times, CIDR IP address matching, and multi-level paging schemes.",
    subject: "OS & Hardware Architectures",
    durationMinutes: 20,
    questions: [
      {
        id: "q2_1",
        type: QuestionType.MCQ,
        subject: "Operating Systems",
        topic: "CPU Scheduling Algorithms (FCFS, SJF, Round Robin, SRTF)",
        questionText: "Consider three processes P1, P2, and P3 arriving at times 0, 1, and 2 with CPU burst times of 6, 4, and 2 ms respectively. Under preemptive Shortest Remaining Time First (SRTF) scheduling, what is the average waiting time of these processes?",
        options: ["2.33 ms", "2.67 ms", "3.0 ms", "3.5 ms"],
        correctAnswer: ["2"], // Index 2 represents 3.0 ms
        marks: 2,
        explanation: "Let's trace SRTF:\n- t=0: P1 arrives with burst 6. Starts execution.\n- t=1: P2 arrives with burst 4. P1 remaining is 5. Since 4 < 5, P2 preempts P1 and runs.\n- t=2: P3 arrives with burst 2. P2 remaining is 3. Since 2 < 3, P3 preempts P2 and runs.\n- t=3: P3 runs.\n- t=4: P3 finishes. Waiting time of P3 = 0 ms.\n- Next, between P1 (rem 5) and P2 (rem 3), P2 runs from t=4 to t=7. P2 finishes. Waiting time of P2 = 4 (execution start) - 1 (arrival) - 1 (first run offset) = 2 ms.\n- Finally, P1 runs from t=7 to t=13. P1 finishes. Waiting of P1 = 7 - 0 - 0 = 7 ms.\nAverage Waiting Time = (7 + 2 + 0) / 3 = 9 / 3 = 3.0 ms."
      },
      {
        id: "q2_2",
        type: QuestionType.MSQ,
        subject: "Computer Networks",
        topic: "IPv4, IPv6, Subnetting, CIDR & Address Routing",
        questionText: "An network IP block is designated with CIDR subnet prefix 192.168.10.128/26. Which of the following IP addresses reside within the valid range of this CIDR block?",
        options: [
          "192.168.10.135",
          "192.168.10.190",
          "192.168.10.127",
          "192.168.10.193"
        ],
        correctAnswer: ["0", "1"], // Option 0 and 1 represent valid contents
        marks: 2,
        explanation: "A subnet mask with prefix /26 uses 26 bits for the network part and 6 bits (32 - 26 = 6) for hosting.\nSize of the IP block = 2^6 = 64 addresses.\nThe block begins at 192.168.10.128 and ends at 192.168.10.191 (inclusive).\nHence, 192.168.10.135 and 192.168.10.190 are valid. 192.168.10.127 falls before the range, and 192.168.10.193 falls after."
      },
      {
        id: "q2_3",
        type: QuestionType.NAT,
        subject: "Operating Systems",
        topic: "Memory Management: Paging & Segmentation schemes",
        questionText: "Consider a computer system with 32-bit logical addresses and a 4 KB page size. Each page table entry (PTE) takes exactly 4 bytes. If we restrict each intermediate and leaf page table to fit exactly inside a single frame of memory to avoid external fragmentation, how many levels of page tables are required to map the complete addressing space? (Provide only the integer numeric value).",
        correctAnswer: ["2"], // 2 levels exactly
        marks: 2,
        explanation: "- Logical address size = 32 bits.\n- Page structure size = 4 KB = 2^12 bytes, mapping lower 12 bits as byte index/offset.\n- Number of virtual directory pages = 32 - 12 = 20 bits remaining.\n- A single frame is 4 KB = 4096 bytes. PTE size = 4 bytes.\n- Max pointers stored per index page table = 4096 / 4 = 1024 = 2^10 entries.\n- Each page table page maps at most 10 bits of addressing directory tree.\n- Level requirement = 20 bits total / 10 bits per levels = exactly 2 levels of page indexing."
      }
    ]
  },
  {
    id: "test_3",
    title: "GATE Mini-Mock 3: Recursion & Complexity",
    description: "Verifies execution of recursive C function trace and recurrence complexities under Master Theorem cases.",
    subject: "Programming & Algorithms",
    durationMinutes: 15,
    questions: [
      {
        id: "q3_1",
        type: QuestionType.MCQ,
        subject: "Programming & Data Structures",
        topic: "Recursion, Pointer Arithmetic & Parameter Passing in C",
        questionText: "Consider the following recursive function written in C programming:\n\nint f(int n) {\n  if (n <= 1) return 1;\n  if (n % 2 == 0) return f(n - 1) + n;\n  return f(n - 2) * n;\n}\n\nWhat value will be returned to the caller when f(5) is evaluated?",
        options: ["11", "15", "21", "25"],
        correctAnswer: ["1"], // Index 1 is 15
        marks: 1,
        explanation: "Let's unwind the recursion for f(5):\n1. f(5): Since 5 is odd, f(5) = f(5-2) * 5 = f(3) * 5.\n2. f(3): Since 3 is odd, f(3) = f(3-2) * 3 = f(1) * 3.\n3. f(1): Triggers the base case (n <= 1), returns 1.\n4. Substituting backwards:\n   - f(3) = 1 * 3 = 3\n   - f(5) = 3 * 5 = 15."
      },
      {
        id: "q3_2",
        type: QuestionType.MSQ,
        subject: "Algorithms Complexities & Graphs",
        topic: "MST Algorithms (Kruskal, Prim) & NP-Completeness",
        questionText: "Which of the following statement(s) is/are TRUE regarding sorting, heaps, and shortest-path graph algorithms?",
        options: [
          "Building a binary max-heap of size N from an arbitrary array takes O(N) worst-case time.",
          "The search cost of finding the minimum element in an existing binary max-heap is O(1) time.",
          "Dijkstra's shortest path algorithm can yield wrong cost weights on graphs with negative edge weights.",
          "The worst-case time to insert elements into an existing binomial tree of order K is strictly bounded by O(K)."
        ],
        correctAnswer: ["0", "2", "3"], // A, C, D are true
        marks: 2,
        explanation: "1. Build-heap is linear O(N) because the cost sums to O(N) using leaf-downward siftdown (Option A is true).\n2. Max-heap element is at the root, but the MINIMUM element can reside anywhere across the leaf levels (N/2 elements), requiring O(N) search time (Option B is false).\n3. Dijkstra operates greedily under non-negative weights; negative edges break this correctness (Option C is true).\n4. Inserting into a binomial heap of order K carries a standard upper bound of O(K) operations (Option D is true)."
      },
      {
        id: "q3_3",
        type: QuestionType.NAT,
        subject: "Algorithms Complexities & Graphs",
        topic: "Asymptotics: Big-O, Master Theorem for Recurrences",
        questionText: "Consider the recurrence relation: T(N) = 4T(N/2) + N^2. Solving this using the Master Theorem gives T(N) = Θ(N^k * log N). What is the value of the exponent integer parameter 'k'? (Provide only the integer numeric value).",
        correctAnswer: ["2"], // k=2 exactly
        marks: 2,
        explanation: "For T(N) = aT(N/b) + f(N), we have a=4, b=2, f(N) = N^2.\nCalculate N^(log_b a) = N^(log_2 4) = N^2.\nSince f(N) = Θ(N^2), this falls under Case 2 of the Master Theorem.\nTherefore, the solution is T(N) = Θ(N^(log_b a) * log N) = Θ(N^2 * log N).\nThe exponent k equals 2."
      }
    ]
  },
  {
    id: "test_4",
    title: "GATE Mini-Mock 4: DBMS Norms & Serializability",
    description: "Evaluates table candiate keys, Boyce-Codd Normal Form detriments, and transaction serializability logs.",
    subject: "Database Management Systems",
    durationMinutes: 15,
    questions: [
      {
        id: "q4_1",
        type: QuestionType.MCQ,
        subject: "Databases (DBMS)",
        topic: "Normal Forms: Functional Dependencies, 3NF & BCNF",
        questionText: "Let R(A, B, C, D) be a relational schema with Functional Dependencies F = { A → B, B → C, C → D, D → A }. What is the highest Normal Form satisfied by this schema R?",
        options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
        correctAnswer: ["3"], // Index 3 is BCNF
        marks: 2,
        explanation: "Let's find candidate keys from F:\n- A+ = ABCD (A is candidate key)\n- B+ = BCDA (B is candidate key)\n- C+ = CDAB (C is candidate key)\n- D+ = DABC (D is candidate key)\nHence, the keys are A, B, C, and D. Every attribute in R is a prime attribute.\nFor each functional dependency X → Y in F, the determinant X is a Superkey. This is the exact condition required for BCNF. Hence, highest normal form is BCNF."
      },
      {
        id: "q4_2",
        type: QuestionType.MSQ,
        subject: "Databases (DBMS)",
        topic: "Transactions Concurrency: Conflict Serializability, 2PL",
        questionText: "Which of the following statement(s) are TRUE regarding database schedules, transaction concurrency, and recoverability?",
        options: [
          "Every conflict-serializable schedule is guaranteed to be view-serializable.",
          "Thomas' Write Rule violates standard conflict-serializability to allow view-serializable schedules.",
          "The structural 2-Phase Locking (2PL) protocol prevents deadlock occurrences.",
          "A transaction schedule is recoverable if, for Ti reading from Tj, the commit of Tj occurs before the commit of Ti."
        ],
        correctAnswer: ["0", "1", "3"], // A, B, D are true
        marks: 2,
        explanation: "1. Conflict serializability is a strict subset of view serializability (Option A is true).\n2. Thomas' write rule allows some blind writes that are not conflict serializable but stay view-serializable (Option B is true).\n3. 2PL does NOT prevent deadlocks, it only guarantees conflict serializability (Option C is false).\n4. Recoverability requires committing writes Tj first before reader Ti commits (Option D is true)."
      },
      {
        id: "q4_3",
        type: QuestionType.NAT,
        subject: "Databases (DBMS)",
        topic: "Database Indexing: B & B+ Tree heights & Search Costs",
        questionText: "In a B+ Tree index, node block pointers have size 8 bytes, and search keys have size 12 bytes. If the file block size is 512 bytes, what is the maximum order (number of block pointers) possible for an internal index node? (Provide only the integer numeric value).",
        correctAnswer: ["26"], // p = 26 exactly
        marks: 2,
        explanation: "For an internal node of order p, we store p block pointers and (p - 1) search keys.\nThe space occupied must not exceed the block size:\np * Pointer_Size + (p - 1) * Key_Size <= Block_Size\np * 8 + (p - 1) * 12 <= 512\n8p + 12p - 12 <= 512\n20p <= 524 => p <= 26.2\nMaximum integer order is 26 pointers."
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
        taskTitle: "Revise CPU Scheduling Principles & SRTF",
        topic: "CPU Scheduling Algorithms (FCFS, SJF, Round Robin, SRTF)",
        subject: "Operating Systems",
        durationMinutes: 120,
        completed: true,
        resources: [
          { name: "CPU Scheduling Core Notes.pdf", type: "pdf", url: "/api/download/resource?id=cpu_notes", downloaded: true },
          { name: "SRTF Preemptive Problems & Solutions.practice", type: "practice", url: "#", downloaded: false }
        ]
      },
      {
        id: "task_2",
        timeSlot: "11:00 AM - 12:30 PM",
        taskTitle: "Solve Linear Algebra Matrices Questions",
        topic: "Linear Algebra: Matrices, Eigenvalues & Cayley-Hamilton",
        subject: "Discrete Mathematics & Linear Algebra",
        durationMinutes: 90,
        completed: true,
        resources: [
          { name: "Eigenvalues Solved standard proofs.pdf", type: "pdf", url: "/api/download/resource?id=la_eigen", downloaded: true }
        ]
      },
      {
        id: "task_3",
        timeSlot: "03:00 PM - 05:30 PM",
        taskTitle: "Relational Normal Forms & Dependency Preservation",
        topic: "Normal Forms: Functional Dependencies, 3NF & BCNF",
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
        taskTitle: "Process Synchronization: Semaphores & Deadlocks",
        topic: "Process Synchronization: Semaphores, Deadlocks & Bankers",
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
        taskTitle: "Formulate Relational Algebra Queries",
        topic: "Relational Algebra Formulations & SQL Queries",
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
    subject: "Algorithms Complexities & Graphs",
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
    content: "Greetings! I am Shiva, your dedicated GATE 2027 Computer Science & Engineering coach. I've analyzed your starting syllabus profile.\n\nYou have strong landmarks in Operating Systems (CPU Scheduling completed), but we need to structure your progress on Algorithms, theory of computation, compilers, and hardware pipelining modules. How are your preparations progressing, and where can I assist you today?",
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
    "subject": "The exact subject name matching one of the 10 syllabus subjects in the database",
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
    pendingTopics.push({ topicName: "Full Length Revision & Formula Booklet", subjectName: "Discrete Mathematics & Linear Algebra" });
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
