import fs from "fs";
import path from "path";

export type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
export type LessonStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  avatar?: string;
  bio?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface LessonNote {
  id: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  content: string;
  grade?: number;
  feedback?: string;
  award?: string;
  awardIcon?: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status: LessonStatus;
  roomName: string;
  notes?: LessonNote[];
}

export interface ParentStudent {
  parentId: string;
  studentId: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  time: string;
  date: string;
  type?: "text" | "voice" | "file" | "lesson_invite";
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  read?: boolean;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  lessonId?: string;
  studentId: string;
  studentName: string;
  teacherId?: string;
  title: string;
  subject: string;
  studentAnswer?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  status: "NEW" | "SUBMITTED" | "CHECKED";
  grade?: number;
  teacherFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
}

interface DatabaseSchema {
  users: User[];
  subjects: Subject[];
  parentStudents: ParentStudent[];
  lessons: Lesson[];
  messages?: ChatMessage[];
  homeworkSubmissions?: HomeworkSubmission[];
}

const DB_FILE = path.join(process.cwd(), "data", "db.json");

function getInitialData(): DatabaseSchema {
  const now = new Date();
  
  const subjects: Subject[] = [
    { id: "sub-1", name: "Математика и логика", color: "#2563eb" },
    { id: "sub-2", name: "Русский язык и чтение", color: "#d946ef" },
    { id: "sub-3", name: "Английский язык", color: "#059669" },
    { id: "sub-4", name: "Подготовка к школе", color: "#d97706" },
  ];

  const users: User[] = [];
  const parentStudents: ParentStudent[] = [];

  const lessons: Lesson[] = [];

  return { users, subjects, parentStudents, lessons };
}

function loadDB(): DatabaseSchema {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("DB Load error:", err);
    return getInitialData();
  }
}

function saveDB(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("DB Save error:", err);
  }
}

export const db = {
  getUsers: (): User[] => loadDB().users,
  getUserById: (id: string): User | undefined => loadDB().users.find((u) => u.id === id),
  getSubjects: (): Subject[] => loadDB().subjects,

  getLessons: (filter?: {
    teacherId?: string;
    studentId?: string;
    studentIds?: string[];
    status?: LessonStatus;
  }): Lesson[] => {
    let list = loadDB().lessons;
    if (!filter) return list;

    if (filter.teacherId) {
      list = list.filter((l) => l.teacherId === filter.teacherId);
    }
    if (filter.studentId) {
      list = list.filter((l) => l.studentId === filter.studentId);
    }
    if (filter.studentIds && filter.studentIds.length > 0) {
      list = list.filter((l) => filter.studentIds!.includes(l.studentId));
    }
    if (filter.status) {
      list = list.filter((l) => l.status === filter.status);
    }
    // Сортировка: новые/ближайшие сначала
    return list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  getLessonById: (id: string): Lesson | undefined => {
    return loadDB().lessons.find((l) => l.id === id || l.roomName === id);
  },

  getLessonNotes: (lessonId: string): LessonNote[] => {
    const data = loadDB();
    const lesson = data.lessons.find((l) => l.id === lessonId || l.roomName === lessonId);
    return lesson?.notes || [];
  },

  updateLessonStatus: (id: string, status: LessonStatus): Lesson | null => {
    const data = loadDB();
    let lesson = data.lessons.find((l) => l.id === id || l.roomName === id);
    if (!lesson) {
      lesson = {
        id,
        title: "Урок",
        subjectId: "sub-1",
        subjectName: "Предмет",
        subjectColor: "#2563eb",
        teacherId: "882042e2-d020-426c-9826-9fba5b23ad2e",
        teacherName: "Шаронова Василина Владимировна",
        studentId: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
        studentName: "Сергей Дмитриевич",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status,
        roomName: id,
        notes: [],
      };
      data.lessons.push(lesson);
    } else {
      lesson.status = status;
    }
    saveDB(data);
    return lesson;
  },

  extendLesson: (id: string, extendMinutes = 30): Lesson | null => {
    const data = loadDB();
    let lesson = data.lessons.find((l) => l.id === id || l.roomName === id);
    if (!lesson) return null;
    const currentEnd = new Date(lesson.endTime).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    lesson.endTime = new Date(baseTime + extendMinutes * 60 * 1000).toISOString();
    lesson.status = "LIVE";
    saveDB(data);
    return lesson;
  },

  addLessonNote: (
    lessonId: string,
    authorId: string,
    content: string,
    grade?: number,
    feedback?: string,
    authorName?: string,
    award?: string,
    awardIcon?: string
  ): LessonNote => {
    const data = loadDB();
    let lesson = data.lessons.find((l) => l.id === lessonId || l.roomName === lessonId);
    if (!lesson) {
      lesson = {
        id: lessonId,
        title: "Урок",
        subjectId: "sub-1",
        subjectName: "Предмет",
        subjectColor: "#2563eb",
        teacherId: authorId || "882042e2-d020-426c-9826-9fba5b23ad2e",
        teacherName: authorName || "Шаронова Василина Владимировна",
        studentId: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
        studentName: "Сергей Дмитриевич",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: "COMPLETED",
        roomName: lessonId,
        notes: [],
      };
      data.lessons.push(lesson);
    }

    if (!lesson.notes) lesson.notes = [];

    const author = data.users.find((u) => u.id === authorId);
    const resolvedAuthorName = authorName || author?.name || "Шаронова Василина Владимировна";

    const note: LessonNote = {
      id: "note-" + Date.now(),
      lessonId: lesson.id,
      authorId: authorId || "882042e2-d020-426c-9826-9fba5b23ad2e",
      authorName: resolvedAuthorName,
      content,
      grade,
      feedback,
      award,
      awardIcon,
      createdAt: new Date().toISOString(),
    };

    lesson.notes.push(note);
    lesson.status = "COMPLETED";
    saveDB(data);
    return note;
  },

  createLesson: (lessonData: Omit<Lesson, "id" | "notes">): Lesson => {
    const data = loadDB();
    const newLesson: Lesson = {
      ...lessonData,
      id: "les-" + Date.now(),
      notes: [],
    };
    data.lessons.push(newLesson);
    saveDB(data);
    return newLesson;
  },

  getParentChildren: (parentId: string): User[] => {
    const data = loadDB();
    const childIds = data.parentStudents
      .filter((ps) => ps.parentId === parentId)
      .map((ps) => ps.studentId);
    return data.users.filter((u) => childIds.includes(u.id));
  },

  getTeacherStudents: (teacherId: string): User[] => {
    const data = loadDB();
    const studentIds = Array.from(
      new Set(data.lessons.filter((l) => l.teacherId === teacherId).map((l) => l.studentId))
    );
    return data.users.filter((u) => studentIds.includes(u.id));
  },

  getMessages: (chatId: string): ChatMessage[] => {
    const data = loadDB();
    if (!data.messages) return [];
    return data.messages
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  saveMessage: (msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: string; createdAt?: string }): ChatMessage => {
    const data = loadDB();
    if (!data.messages) data.messages = [];
    const newMsg: ChatMessage = {
      ...msg,
      id: msg.id || "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      createdAt: msg.createdAt || new Date().toISOString(),
    };
    data.messages.push(newMsg);
    // Keep max 2000 messages in db.json to prevent memory bloat
    if (data.messages.length > 2000) {
      data.messages = data.messages.slice(-2000);
    }
    saveDB(data);
    return newMsg;
  },

  getHomeworkSubmissions: (filters?: { studentId?: string; teacherId?: string; lessonId?: string }): HomeworkSubmission[] => {
    const data = loadDB();
    if (!data.homeworkSubmissions) return [];
    let list = [...data.homeworkSubmissions];
    if (filters?.studentId) list = list.filter((h) => h.studentId === filters.studentId);
    if (filters?.teacherId) list = list.filter((h) => h.teacherId === filters.teacherId);
    if (filters?.lessonId) list = list.filter((h) => h.lessonId === filters.lessonId);
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  saveHomeworkSubmission: (sub: Omit<HomeworkSubmission, "id" | "submittedAt"> & { id?: string }): HomeworkSubmission => {
    const data = loadDB();
    if (!data.homeworkSubmissions) data.homeworkSubmissions = [];
    
    // Check if existing submission exists for this student & lesson
    const existingIdx = data.homeworkSubmissions.findIndex(
      (h) => (sub.id && h.id === sub.id) || (sub.lessonId && h.lessonId === sub.lessonId && h.studentId === sub.studentId)
    );

    if (existingIdx !== -1) {
      const existing = data.homeworkSubmissions[existingIdx];
      const updated: HomeworkSubmission = {
        ...existing,
        ...sub,
        id: existing.id,
        submittedAt: new Date().toISOString(),
      };
      data.homeworkSubmissions[existingIdx] = updated;
      saveDB(data);
      return updated;
    }

    const newSub: HomeworkSubmission = {
      ...sub,
      id: sub.id || "hw-" + Date.now(),
      submittedAt: new Date().toISOString(),
    };
    data.homeworkSubmissions.push(newSub);
    saveDB(data);
    return newSub;
  },

  gradeHomeworkSubmission: (id: string, grade: number, teacherFeedback?: string): HomeworkSubmission | null => {
    const data = loadDB();
    if (!data.homeworkSubmissions) return null;
    const item = data.homeworkSubmissions.find((h) => h.id === id);
    if (!item) return null;
    item.grade = grade;
    item.teacherFeedback = teacherFeedback;
    item.status = "CHECKED";
    item.reviewedAt = new Date().toISOString();
    saveDB(data);
    return item;
  },
};
