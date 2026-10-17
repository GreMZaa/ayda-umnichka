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

interface DatabaseSchema {
  users: User[];
  subjects: Subject[];
  parentStudents: ParentStudent[];
  lessons: Lesson[];
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

  const users: User[] = [
    {
      id: "u-teacher-1",
      email: "teacher@umnichka.ru",
      name: "Анна Сергеевна Иванова",
      phone: "+7 (999) 111-22-33",
      role: "TEACHER",
      bio: "Преподаватель высшей категории, стаж 12 лет. Математика и развитие логического мышления.",
      avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "u-student-1",
      email: "misha@umnichka.ru",
      name: "Миша Смирнов",
      phone: "+7 (999) 333-44-55",
      role: "STUDENT",
      bio: "3 класс. Увлекается робототехникой, математикой и шахматами.",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "u-student-2",
      email: "alisa@umnichka.ru",
      name: "Алиса Смирнова",
      phone: "+7 (999) 333-44-56",
      role: "STUDENT",
      bio: "5 класс. Увлекается литературой и разговорным английским.",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "u-parent-1",
      email: "parent@umnichka.ru",
      name: "Елена Смирнова",
      phone: "+7 (999) 555-66-77",
      role: "PARENT",
      bio: "Мама Миши и Алисы.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "u-admin-1",
      email: "admin@umnichka.ru",
      name: "Ольга Николаевна (Директор центра)",
      phone: "+7 (999) 777-88-99",
      role: "ADMIN",
      bio: "Руководитель репетиторского центра «АйДаУмничка».",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces",
    },
  ];

  const parentStudents: ParentStudent[] = [
    { parentId: "u-parent-1", studentId: "u-student-1" },
    { parentId: "u-parent-1", studentId: "u-student-2" },
  ];

  // Активный урок (начат 10 мин назад, идет еще 35 мин)
  const startTimeLive = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const endTimeLive = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

  // Запланированный урок через 2 дня
  const startTimeUpcoming = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const endTimeUpcoming = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

  // Завершенный урок позавчера
  const startTimePast = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const endTimePast = new Date(now.getTime() - 47 * 60 * 60 * 1000).toISOString();

  const lessons: Lesson[] = [
    {
      id: "les-live-1",
      title: "Математика: Олимпиадные задачи и пространственная логика",
      subjectId: "sub-1",
      subjectName: "Математика и логика",
      subjectColor: "#2563eb",
      teacherId: "u-teacher-1",
      teacherName: "Анна Сергеевна Иванова",
      teacherAvatar: users[0].avatar,
      studentId: "u-student-1",
      studentName: "Миша Смирнов",
      studentAvatar: users[1].avatar,
      startTime: startTimeLive,
      endTime: endTimeLive,
      status: "LIVE",
      roomName: "umnichka-live-room-demo",
      notes: [],
    },
    {
      id: "les-upcoming-1",
      title: "Английский: Разговорный клуб и расширение словарного запаса",
      subjectId: "sub-3",
      subjectName: "Английский язык",
      subjectColor: "#059669",
      teacherId: "u-teacher-1",
      teacherName: "Анна Сергеевна Иванова",
      teacherAvatar: users[0].avatar,
      studentId: "u-student-2",
      studentName: "Алиса Смирнова",
      studentAvatar: users[2].avatar,
      startTime: startTimeUpcoming,
      endTime: endTimeUpcoming,
      status: "SCHEDULED",
      roomName: "umnichka-eng-demo",
      notes: [],
    },
    {
      id: "les-past-1",
      title: "Математика: Сложение и вычитание дробей",
      subjectId: "sub-1",
      subjectName: "Математика и логика",
      subjectColor: "#2563eb",
      teacherId: "u-teacher-1",
      teacherName: "Анна Сергеевна Иванова",
      teacherAvatar: users[0].avatar,
      studentId: "u-student-1",
      studentName: "Миша Смирнов",
      studentAvatar: users[1].avatar,
      startTime: startTimePast,
      endTime: endTimePast,
      status: "COMPLETED",
      roomName: "umnichka-past-demo",
      notes: [
        {
          id: "note-1",
          lessonId: "les-past-1",
          authorId: "u-teacher-1",
          authorName: "Анна Сергеевна Иванова",
          content: "Успешно разобрали сложные примеры из олимпиадной части. Миша отлично понял алгоритм приведения к общему знаменателю.",
          grade: 5,
          feedback: "Рекомендуется решить 3 дополнительных примера из прикрепленного файла перед следующим уроком.",
          createdAt: startTimePast,
        },
      ],
    },
  ];

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

  updateLessonStatus: (id: string, status: LessonStatus): Lesson | null => {
    const data = loadDB();
    const index = data.lessons.findIndex((l) => l.id === id || l.roomName === id);
    if (index === -1) return null;
    data.lessons[index].status = status;
    saveDB(data);
    return data.lessons[index];
  },

  addLessonNote: (
    lessonId: string,
    authorId: string,
    content: string,
    grade?: number,
    feedback?: string
  ): LessonNote | null => {
    const data = loadDB();
    const lesson = data.lessons.find((l) => l.id === lessonId || l.roomName === lessonId);
    const author = data.users.find((u) => u.id === authorId);
    if (!lesson || !author) return null;

    if (!lesson.notes) lesson.notes = [];

    const note: LessonNote = {
      id: "note-" + Date.now(),
      lessonId: lesson.id,
      authorId: author.id,
      authorName: author.name,
      content,
      grade,
      feedback,
      createdAt: new Date().toISOString(),
    };

    lesson.notes.push(note);
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
};
