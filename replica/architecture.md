# Архитектура платформы «АйДаУмничка» (MVP)

## 1. Стек технологий

| Слой | Выбранная технология | Обоснование |
| :--- | :--- | :--- |
| **Fullstack Web App** | Next.js 14+ (App Router, React 18/19, TypeScript) | Быстрый SSR, Server Actions, безопасная работа с БД, zero-config API |
| **Стилизация & UI** | Tailwind CSS + Lucide Icons + Radix UI components | Адаптивный, современный дизайн под смартфоны родителей и ноутбуки учителей |
| **База данных** | SQLite (Prisma ORM) с возможностью перехода на PostgreSQL / Supabase в 1 команду | Локальная автономность разработки без поднятия внешних контейнеров, строгая типизация |
| **Видеосвязь** | WebRTC (Jitsi Meet API / 8x8 Video Engine) | Бесплатно, без скачивания программ, HD видео, демонстрация экрана, чат в браузере |
| **Авторизация** | Ролевая система сессий (Cookie-based / JWT) | Роли: `ADMIN`, `TEACHER`, `STUDENT`, `PARENT` |

---

## 2. Модель данных (Prisma Schema)

```prisma
enum Role {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}

enum LessonStatus {
  SCHEDULED
  LIVE
  COMPLETED
  CANCELLED
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  phone         String?
  role          Role      @default(STUDENT)
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Связи преподавателя
  teacherLessons Lesson[] @relation("TeacherLessons")
  
  // Связи ученика
  studentLessons Lesson[] @relation("StudentLessons")
  parents        ParentStudent[] @relation("StudentToParent")

  // Связи родителя
  children       ParentStudent[] @relation("ParentToStudent")

  // Заметки/отзывы преподавателя
  teacherNotes   LessonNote[] @relation("AuthorNotes")
}

model ParentStudent {
  id        String   @id @default(uuid())
  parentId  String
  studentId String
  parent    User     @relation("ParentToStudent", fields: [parentId], references: [id], onDelete: Cascade)
  student   User     @relation("StudentToParent", fields: [studentId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([parentId, studentId])
}

model Subject {
  id          String   @id @default(uuid())
  name        String   // Математика, Русский язык, Английский и т.д.
  color       String   @default("#4F46E5")
  lessons     Lesson[]
}

model Lesson {
  id          String        @id @default(uuid())
  title       String
  subjectId   String
  subject     Subject       @relation(fields: [subjectId], references: [id])
  
  teacherId   String
  teacher     User          @relation("TeacherLessons", fields: [teacherId], references: [id])

  studentId   String
  student     User          @relation("StudentLessons", fields: [studentId], references: [id])

  startTime   DateTime
  endTime     DateTime
  status      LessonStatus  @default(SCHEDULED)
  roomName    String        @unique // Уникальный идентификатор WebRTC комнаты

  notes       LessonNote[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model LessonNote {
  id        String   @id @default(uuid())
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("AuthorNotes", fields: [authorId], references: [id])
  content   String   // Что пройдено, успехи ученика, замечания для родителя
  isPublicForParent Boolean @default(true)
  createdAt DateTime @default(now())
}
```

---

## 3. Маршруты и страницы приложения

- `/` — Главная презентационная страница центра «АйДаУмничка» с кнопкой «Войти в личный кабинет» и демо-входом.
- `/login` — Выбор роли и авторизация.
- `/teacher` — Личный кабинет преподавателя (расписание, ученики, кнопка запуска урока).
- `/student` — Личный кабинет ученика (ближайший урок, кнопка «Войти на урок»).
- `/parent` — Личный кабинет родителя (выбор ребенка, расписание, история, отзывы учителей).
- `/admin` — Панель администратора центра (добавление репетиторов, создание уроков).
- `/room/[id]` — Видеокомната урока (встроенный WebRTC Jitsi с управлением микрофоном, камерой, экраном и чатом).
