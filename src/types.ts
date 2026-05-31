export enum QuestionType {
  MCQ = 'MCQ', // Multiple Choice (single correct)
  MSQ = 'MSQ', // Multiple Select (one or more correct)
  NAT = 'NAT'  // Numerical Answer Type (text response containing a number range)
}

export interface GATEQuestion {
  id: string;
  type: QuestionType;
  subject: string;
  topic: string;
  questionText: string;
  options?: string[]; // Empty for NAT
  correctAnswer: string[]; // For MCQ length=1, MSQ length>=1, NAT contains [lowerBound, upperBound] or [exactNumber]
  marks: number;
  explanation: string;
}

export interface MockTest {
  id: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  questions: GATEQuestion[];
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  userId: string;
  attemptedAt: string;
  timeSpentSeconds: number;
  answers: { [questionId: string]: string[] }; // user selected index/choices or numeric value
  scores: {
    totalMarks: number;
    marksObtained: number;
    correctCount: number;
    incorrectCount: number;
    unattemptedCount: number;
  };
}

export interface SyllabusItem {
  id: string;
  name: string;
  completed: boolean;
  notesDownloaded: boolean;
  revisionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface SubjectSyllabus {
  subjectName: string;
  iconName: string;
  totalHours: number;
  topics: SyllabusItem[];
}

export interface DailyScheduleTask {
  id: string;
  timeSlot: string;
  taskTitle: string;
  topic: string;
  subject: string;
  durationMinutes: number;
  completed: boolean;
  resources: {
    name: string;
    type: 'pdf' | 'notes' | 'video' | 'practice';
    url: string;
    downloaded: boolean;
  }[];
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  dayName: string;
  targetDailyHours: number;
  completedHours: number;
  tasks: DailyScheduleTask[];
}

export interface ForumComment {
  id: string;
  authorName: string;
  authorRole: 'Student' | 'AI-Mentor' | 'Moderator' | 'Topper';
  avatarColor: string;
  content: string;
  createdAt: string;
  likes: number;
  isCorrectSolution?: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  subject: string;
  authorName: string;
  authorRole: 'Student' | 'AI-Mentor' | 'Moderator' | 'Topper';
  avatarColor: string;
  createdAt: string;
  likes: number;
  views: number;
  commentsCount: number;
  isResolved: boolean;
  comments: ForumComment[];
}

export interface MentorMessage {
  id: string;
  sender: 'user' | 'mentor';
  content: string;
  timestamp: string;
}

export interface UserPrepState {
  syllabus: SubjectSyllabus[];
  schedules: DailySchedule[];
  testAttempts: TestAttempt[];
  forumPosts: ForumPost[];
  mentorMessages: MentorMessage[];
}
