import { UserProfile, LessonSession, HomeworkItem, ChatMessage, BalanceTransaction } from '@/types';

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-student-1',
    role: 'student',
    fullName: 'Тимофей Смирнов (мама: Елена)',
    email: 'elena.smirnova@mail.ru',
    phone: '+7 (927) 891-23-45',
    avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    balanceLessons: 6,
    assignedTeacherName: 'Светлана Васильевна (Логопед-дефектолог)',
    studentGrade: 'Дошкольник (6 лет)',
    city: 'Тольятти (Автозаводский р-н)',
  },
  {
    id: 'user-teacher-1',
    role: 'teacher',
    fullName: 'Светлана Васильевна Морозова',
    email: 'morozova@aidaumnichka.ru',
    phone: '+7 (937) 662-11-22',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    balanceLessons: 0,
    city: 'Тольятти',
  },
  {
    id: 'user-admin-1',
    role: 'admin',
    fullName: 'Ольга Николаевна (Руководитель центра)',
    email: 'director@aidaumnichka.ru',
    phone: '+7 (8482) 55-44-33',
    balanceLessons: 0,
    city: 'Тольятти',
  },
];

export const INITIAL_LESSONS: LessonSession[] = [
  {
    id: 'lesson-101',
    roomToken: 'room-logoped-timofey',
    teacherId: 'user-teacher-1',
    teacherName: 'Светлана Васильевна',
    studentId: 'user-student-1',
    studentName: 'Тимофей Смирнов',
    topic: 'Автоматизация звука [Р] в словах и скороговорках',
    status: 'completed',
    startedAt: '2026-10-23T14:00:00Z',
    endedAt: '2026-10-23T14:45:00Z',
    durationMinutes: 45,
    teacherSummary: 'Тимофей отлично справился с моторной гимнастикой. Звук [Р] изолированно поставлен уверенно.',
    createdAt: '2026-10-23T13:55:00Z',
  },
];

export const INITIAL_HOMEWORKS: HomeworkItem[] = [
  {
    id: 'hw-201',
    lessonId: 'lesson-101',
    teacherName: 'Светлана Васильевна',
    studentId: 'user-student-1',
    title: 'Артикуляционная сказка «Грибок и Ветерок»',
    taskDescription: 'Ежедневно по 5 минут перед зеркалом делать упражнения «Лошадка», «Грибок» и проговаривать чистоговорку: «Ра-ра-ра — во дворе гора». Запишите голосовое сообщение с произношением чистоговорки.',
    status: 'assigned',
    dueDate: '2026-10-26T18:00:00Z',
    createdAt: '2026-10-23T15:00:00Z',
  },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    senderId: 'user-teacher-1',
    senderName: 'Светлана Васильевна',
    senderRole: 'teacher',
    type: 'text',
    text: 'Здравствуйте, Елена! Завтра продолжим отработку звука [Р]. Приготовьте цветные карандаши для интерактивной доски.',
    createdAt: '2026-10-23T12:30:00Z',
  },
  {
    id: 'msg-2',
    senderId: 'user-student-1',
    senderName: 'Елена (мама Тимофея)',
    senderRole: 'student',
    type: 'text',
    text: 'Здравствуйте! Всё приготовили, ждем звонка.',
    createdAt: '2026-10-23T12:45:00Z',
  },
  {
    id: 'msg-3',
    senderId: 'user-student-1',
    senderName: 'Тимофей',
    senderRole: 'student',
    type: 'voice',
    text: 'Аудиозапись выполнения домашнего задания (0:24)',
    voiceDurationSec: 24,
    createdAt: '2026-10-23T16:10:00Z',
  },
];

export const INITIAL_TRANSACTIONS: BalanceTransaction[] = [
  {
    id: 'tx-1',
    studentId: 'user-student-1',
    studentName: 'Тимофей Смирнов',
    adminName: 'Ольга Николаевна (Администратор)',
    amount: 8,
    description: 'Оплата абонемента «Юный оратор: 8 занятий»',
    createdAt: '2026-10-15T11:00:00Z',
  },
  {
    id: 'tx-2',
    studentId: 'user-student-1',
    studentName: 'Тимофей Смирнов',
    adminName: 'Система (Автоматически)',
    amount: -1,
    description: 'Списание за проведенный урок: Автоматизация звука [Р]',
    createdAt: '2026-10-20T14:45:00Z',
  },
  {
    id: 'tx-3',
    studentId: 'user-student-1',
    studentName: 'Тимофей Смирнов',
    adminName: 'Система (Автоматически)',
    amount: -1,
    description: 'Списание за проведенный урок: Скороговорки и дыхание',
    createdAt: '2026-10-23T14:45:00Z',
  },
];
