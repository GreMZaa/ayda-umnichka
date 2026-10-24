# 📘 Контекст Проекта (context.md): Образовательная платформа «АйДаУмничка» (Тольятти)

## 1. Обзор проекта и бизнес-контекст
* **Название платформы:** «АйДаУмничка» (Детский развивающий и учебный центр, г. Тольятти).
* **Назначение:** Веб-платформа для проведения индивидуальных интерактивных онлайн-уроков и постоянного сопровождения учеников преподавателями.
* **Ключевая цель:** Обеспечить стабильную, независимую образовательную среду с аудио-/видеосвязью, совместной доской, мессенджером и личными кабинетами, работающую полностью на бесплатных тарифах (Vercel + Supabase) и устойчивую к блокировкам трафика в РФ.
* **Стиль и UX:** Современный, дружелюбный и отзывчивый интерфейс с элементами Telegram, VK и Яндекс Телемоста (чистые панели управления, всплывающие контролы видеосвязи, эргономичный чат).

---

## 2. Архитектура устойчивости к «белым спискам» (РФ)
* **Проблема:** При активации списков разрешенных адресов («белые списки») или фильтрации внешних протоколов зарубежные облачные сервисы видеоконференций (Zoom, Agora, Google Meet, Twilio) блокируются или работают нестабильно.
* **Решение:**
  * **Прямое P2P WebRTC-соединение (Peer-to-Peer):** Поскольку формат занятий — строго **1-на-1** (преподаватель ↔ ученик), видео- и аудиопотоки передаются напрямую между браузерами пользователей внутри Рунета, минуя внешние медиа-серверы.
  * **Сигналинг через Supabase Realtime:** Обмен SDP-офферами, ответами и ICE-кандидатами выполняется через встроенные WebSocket-каналы Supabase (Broadcast / Presence).
  * **STUN/TURN:** Использование доступных локальных/публичных российских STUN/TURN узлов для преодоления симметричных NAT без зависимости от зарубежных коммерческих платформ.

---

## 3. Технологический стек и инфраструктура
* **Frontend:** Next.js (React 19 / App Router), TypeScript, TailwindCSS, shadcn/ui, Lucide Icons.
* **Хостинг и деплой:** Vercel (бесплатный тариф Hobby, Serverless Edge API).
* **Бэкенд, База данных и Realtime:** Supabase (Free Tier):
  * *PostgreSQL* — хранение пользователей, уроков, домашних заданий и балансов.
  * *Supabase Auth* — открытая регистрация и управление сессиями.
  * *Supabase Realtime* — сигналинг WebRTC, мгновенные сообщения в чатах, синхронизация онлайн-доски.
  * *Supabase Storage* — хранение аватаров, материалов уроков, файлов ДЗ и голосовых сообщений (.webm/.ogg).
* **Медиа и звонки:** WebRTC API браузера (`getUserMedia`, `getDisplayMedia`, `RTCPeerConnection`).
* **Интерактивная доска:** Легковесный холст на базе HTML5 Canvas / Fabric.js / Tldraw с трансляцией событий рисования через Supabase Broadcast.

---

## 4. Ролевая модель и модули системы

### 4.1. Роли пользователей
1. **`student` (Ученик / Родитель):**
   * Вход в созданный преподавателем урок по ссылке или коду комнаты.
   * Просмотр баланса оплаченных занятий.
   * Архив пройденных материалов и тем.
   * Раздел домашних заданий (получение, загрузка выполненных работ).
   * Постоянный чат с прикрепленным преподавателем (текст, файлы, голосовые сообщения).
2. **`teacher` (Преподаватель):**
   * Создание урока on-demand (кнопка «Создать урок» ➔ генерация уникальной комнаты и мгновенная отправка ссылки/уведомления ученику).
   * Список закрепленных учеников с карточками заметок и статусом («Готов к уроку», «Оффлайн»).
   * Управление домашними заданиями (выдача, комментирование, выставление оценок).
   * Проведение урока с инструментами: видео, микрофон, демонстрация экрана, онлайн-доска, чат звонка.
3. **`admin` (Руководство центра «АйДаУмничка»):**
   * Полная панель управления: модерация пользователей, назначение ролей (`teacher`, `student`).
   * Закрепление связок «Преподаватель — Ученик».
   * Управление балансом занятий (ручное начисление и списание уроков).
   * Общая аналитика активности и проведенных занятий.

---

## 5. Функциональные модули платформы

### Модуль 1. Уроки On-Demand (Комната урока)
* Уроки **не привязаны к жесткому времени**: преподаватель нажимает «Начать занятие», генерируется уникальный `lesson_id` / комната.
* Ученик получает приглашение в личном кабинете или переходит по ссылке `https://app.aidaumnichka.ru/room/[roomId]`.
* Элементы управления в комнате звонка (плавающая панель Телемост-стиля):
  * Включение/выключение камеры и микрофона.
  * Демонстрация экрана (Screen Sharing).
  * Переключатель «Видео / Интерактивная доска».
  * Боковая шторка встроенного текстового чата урока.
  * Завершение урока с автоматической фиксацией длительности в БД и списанием 1 занятия с баланса.

### Модуль 2. Интерактивная онлайн-доска (Whiteboard)
* Совместное рисование ученика и педагога в реальном времени.
* Базовые инструменты: карандаш, маркер-выделитель, ластик, геометрические фигуры, текст, выбор цвета и толщины линии.
* Возможность загрузить изображение или скан учебника/задания на холст.
* Синхронизация через каналы `supabase.channel('room:[id]:whiteboard')`.

### Модуль 3. Постоянный мессенджер (Вне звонка)
* Личные диалоги между преподавателем и закрепленным учеником (VK/Telegram UI-стиль).
* Поддержка текстовых сообщений, прикрепления документов и картинок (PDF, DOCX, PNG, JPG).
* **Голосовые сообщения:** запись через `MediaRecorder API`, визуализатор волны, хранение аудиофайлов в бакете `chat-attachments`.
* Встроенный модуль сдачи домашних заданий прямо в ветку переписки с бейджем статуса («На проверке», «Принято»).

### Модуль 4. Регистрация и Авторизация
* Открытая регистрация по Email/Паролю.
* По умолчанию новому аккаунту присваивается роль `student`. Преподаватели и администраторы подтверждаются или назначаются через админ-панель.

---

## 6. Структура базы данных (Supabase PostgreSQL)

```sql
-- 1. Профили пользователей
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('student', 'teacher', 'admin')) default 'student',
  full_name text not null,
  avatar_url text,
  phone text,
  balance int default 0,
  created_at timestamptz default now()
);

-- 2. Связка Преподаватель <-> Ученик
create table public.teacher_students (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  notes text,
  status text default 'active',
  created_at timestamptz default now(),
  unique(teacher_id, student_id)
);

-- 3. Комнаты и сессии уроков
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  room_code text unique not null,
  teacher_id uuid references public.profiles(id),
  student_id uuid references public.profiles(id),
  topic text,
  status text check (status in ('waiting', 'in_progress', 'completed', 'cancelled')) default 'waiting',
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- 4. Чаты и Сообщения
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.profiles(id),
  student_id uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique(teacher_id, student_id)
);

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  type text check (type in ('text', 'voice', 'file', 'homework')) default 'text',
  content text,
  file_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 5. Домашние задания
create table public.homeworks (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.profiles(id),
  student_id uuid references public.profiles(id),
  lesson_id uuid references public.lessons(id),
  title text not null,
  description text,
  file_attachments jsonb default '[]'::jsonb,
  submission_attachments jsonb default '[]'::jsonb,
  status text check (status in ('assigned', 'submitted', 'reviewed')) default 'assigned',
  feedback text,
  due_date timestamptz,
  created_at timestamptz default now()
);