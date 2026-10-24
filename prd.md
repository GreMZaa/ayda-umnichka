# Product Requirements Document (PRD)
## Образовательная платформа детского центра «АйДаУмничка» (г. Тольятти)

**Версия:** 1.0  
**Дата:** 24 октября 2026 г.  
**Статус:** Draft / На согласовании  
**Хостинг & Инфраструктура:** Vercel (Frontend & Serverless API), Supabase (PostgreSQL, Auth, Storage, Realtime Signaling)

---

### 1. Обзор продукта (Product Overview)

#### 1.1 Описание проекта
«АйДаУмничка» — многофункциональная онлайн-платформа для детского развивающего центра в Тольятти, сочетающая в себе функции образовательного мессенджера (в стилистике Telegram / VK), сервис персональных видеоуроков 1-на-1 с демонстрацией экрана и интерактивной онлайн-доской, а также систему личных кабинетов для учеников, преподавателей и администрации.

#### 1.2 Главное ценностное предложение и ключевая проблема
* **Устойчивость к «белым спискам»:** В условиях периодической фильтрации зарубежного трафика и блокировок коммерческих зарубежных сервисов (Zoom, Google Meet, Teams, Discord), уроки центра должны проходить бесперебойно.
* **Решение:** Прямое P2P-соединение (Peer-to-Peer WebRTC) между браузерами ученика и преподавателя внутри РФ, где медиатрафик (видео, аудио, экран) идет напрямую между провайдерами участников без зарубежных медиа-серверов. Сигналинг (обмен SDP/ICE) и данные доски передаются через легковесные WebSockets Supabase Realtime.
* **Гибкость расписания (On-Demand уроки):** Уроки не привязаны к жесткой сетке времени. Преподаватель формирует сессию в 1 клик, когда оба участника готовы, отправляет инвайт в чат, а система списывает занятие с баланса только по факту проведения.
* **Нулевые постоянные затраты на старте:** Использование бесплатных планов Vercel, Supabase и нативного WebRTC API браузеров без платных сторонних видео-шлюзов.

#### 1.3 Ключевые метрики успеха (KPIs)
* **Стабильность связи:** $\ge 98\%$ успешных P2P-соединений между участниками внутри РФ.
* **Задержка видео/звука:** $< 200$ мс в пределах региональных сетей Самарской области и РФ.
* **Время подключения к уроку:** $< 5$ секунд от клика по ссылке до появления видеопотока.
* **Retention учеников:** Увеличение посещаемости онлайн-занятий на 30% за счет встроенного мессенджера и удобного контроля баланса родителями.

---

### 2. Целевая аудитория и ролевая модель

| Роль | Портрет пользователя | Ключевые потребности |
| :--- | :--- | :--- |
| **Ученик / Родитель** | Дети дошкольного и школьного возраста, их родители | Простой вход в урок в 1 клик без сложных установок ПО; прозрачный баланс занятий; чат с преподавателем, получение домашних заданий и отправка решений. |
| **Преподаватель** | Педагог центра «АйДаУмничка» | Быстрый старт занятия в любой момент; удобная онлайн-доска для рисования и разбора примеров; шаринг экрана; фиксация заметок по успеваемости ученика. |
| **Администратор** | Руководитель / менеджер центра в Тольятти | Управление базой учеников и преподавателей; пополнение баланса занятий; привязка учеников к педагогам; мониторинг посещаемости и оплат. |

---

### 3. Функциональные требования и спецификация модулей

#### 3.1. Аутентификация и профили (Supabase Auth)
* **Открытая регистрация:**
  * Регистрация по Email и паролю (с подтверждением почты).
  * Опционально: вход через OAuth (VK ID / Telegram Auth) для удобства родителей.
  * При регистрации пользователь выбирает базовую роль (по умолчанию — `student`). Назначение роли `teacher` или `admin` производится администратором через панель управления.
* **Профиль пользователя:**
  * Имя, Фамилия, Аватар (загрузка в Supabase Storage).
  * Контактный телефон родителя, город (Тольятти / онлайн).
  * Статус в сети (Online / Offline / На уроке).

#### 3.2. Образовательный мессенджер (VK/Telegram Style)
* **Структура чатов:**
  * Автоматический постоянный диалог между закрепленным преподавателем и учеником.
  * Системный сервисный чат «Уведомления АйДаУмничка» (напоминания о балансе, ссылки на новые уроки).
* **Возможности переписки:**
  * Текстовые сообщения с поддержкой Emoji.
  * **Голосовые сообщения:** Запись аудио прямо в браузере (MediaRecorder API $\rightarrow$ `.webm` / `.mp3`), отправка в чат с визуализацией звуковой волны (waveform) и воспроизведением.
  * **Обмен файлами и ДЗ:** Загрузка учебных материалов, картинок, PDF и документов до 50 МБ (Supabase Storage).
  * Статусы сообщений: отправлено, доставлено, прочитано.

#### 3.3. Видеосвязь 1-на-1 и устойчивость к «белым спискам»
* **Архитектура связи:**
  * **Peer-to-Peer (P2P) WebRTC:** Браузер ученика и браузер учителя связываются напрямую. Трафик не покидает пределы российских интернет-провайдеров.
  * **Signaling Server:** Канал обмена `offer`, `answer` и `ice-candidate` реализуется через WebSocket-комнаты Supabase Realtime (`presence` и `broadcast`).
  * **STUN-серверы:** Подключение нескольких общедоступных российских и глобальных STUN-серверов (например, локальные адреса провайдеров РФ, `stun.sipnet.ru`, fallback на стандартные STUN) для прохождения NAT без передачи медиатрафика на сторонние серверы.
* **Функционал внутри звонка:**
  * Включение / отключение микрофона (Mute/Unmute).
  * Включение / отключение веб-камеры с выбором источника.
  * **Демонстрация экрана (Screen Sharing):** Захват экрана, окна приложения или вкладки браузера через `getDisplayMedia()`.
  * Индикатор качества соединения (RTT, битрейт, потеря пакетов).
  * Текстовый чат внутри видеозвонка для быстрой отправки ссылок.
  * Завершение урока с подтверждением обеих сторон.

#### 3.4. Интерактивная онлайн-доска (Whiteboard)
* **Инструменты:** Карандаш / кисть (с выбором цвета и толщины линии), ластик, геометрические фигуры (линия, стрелка, круг, прямоугольник), текст, вставка обучающих картинок (карточки, задания, примеры).
* **Совместная работа в реальном времени:**
  * Синхронизация векторных координат и действий через Supabase Realtime Broadcast.
  * Задержка отрисовки штриха $< 50$ мс.
  * Сохранение состояния доски в конце урока в виде изображения (`.png`) в историю урока.
* **Переключение режимов:**
  * Режим «Только видео / экран».
  * Режим «Доска + мини-видео собеседника в углу (PiP)».

#### 3.5. Логика on-demand уроков (без привязки ко времени)
* **Создание сессии:**
  1. Преподаватель в своем кабинете выбирает ученика и нажимает кнопку **«Начать урок»**.
  2. Генерируется уникальная защищенная комната (`room_id` типа UUIDv4).
  3. В чат ученика мгновенно падает интерактивная карточка с кнопкой **«Войти в урок»** и звуковым сигналом.
  4. Одновременно ученику генерируется прямая одноразовая веб-ссылка формата: `https://aidaumnichka.ru/room/[room_id]?token=[jwt_token]`.
* **Завершение и учет баланса:**
  * Урок считается состоявшимся, если совместное нахождение учителя и ученика в комнате составило более 15 минут.
  * По завершении сессии с баланса ученика автоматически списывается 1 занятие, статус меняется на `completed`, создается запись в архиве пройденных уроков.

#### 3.6. Личный кабинет ученика
* **Главный экран:**
  * Крупная статусная кнопка **«Войти в активный урок»** (подсвечивается пульсирующим зеленым индикатором при звонке преподавателя).
  * Виджет **«Баланс занятий»**: количество оставшихся уроков (например, «Осталось: 6 занятий»).
  * Предупреждение при балансе $\le 1$ уроку («Пожалуйста, пополните абонемент у администратора»).
* **Раздел «Домашние задания»:**
  * Список активных и выполненных заданий.
  * Форма прикрепления ответа (фото тетради, рисунок, аудиозапись чтения).
* **Раздел «История занятий»:**
  * Список пройденных уроков с датой, темой, заметками педагога и сохраненным скриншотом доски.

#### 3.7. Личный кабинет преподавателя
* **Список закрепленных учеников:**
  * Карточки учеников со статусом готовности (`Офлайн`, `В сети`, `Готов к уроку`).
  * Текущий баланс занятий каждого ребенка.
  * Кнопка быстрого вызова на урок.
* **Блок заметок и программы:**
  * Персональная карточка ученика с историей прогресса.
  * Поле для приватных педагогических заметок (не видны родителям) и публичных комментариев к уроку.
* **Конструктор заданий:**
  * Прикрепление домашнего задания к прошедшему уроку за 2 клика.

#### 3.8. Панель Администратора (Управление центром)
* **Управление пользователями:**
  * Просмотр всех зарегистрированных учеников и преподавателей.
  * Изменение ролей (назначение учителя, блокировка).
  * Закрепление учеников за конкретными преподавателями.
* **Управление балансами и абонементами:**
  * Начисление пакетов занятий ученику (+4, +8, +16 уроков).
  * История финансовых операций и ручных корректировок.
* **Сводная статистика и журнал:**
  * Количество проведенных уроков за день / неделю / месяц.
  * Отчет по часам работы каждого преподавателя.

---

### 4. Техническая архитектура и стек решений

```
                        АРХИТЕКТУРНАЯ СХЕМА
                        
+-------------------------------------------------------------------------+
|                  КЛИЕНТСКИЙ УРОВЕНЬ (Frontend PWA)                      |
|           Next.js 15 (React 19) / Tailwind CSS / shadcn/ui              |
|        WebRTC Browser Engine (MediaStream, RTCPeerConnection)           |
+--------------------+--------------------------------+-------------------+
                     |                                |
         HTTP / REST | (Signaling & Auth)             | Прямой медиапоток
       WebSocket Sub |                                | (Видео, Аудио, Экран)
                     v                                v
+--------------------+----------------+     +---------+-------------------+
|            VERCEL & SUPABASE        |     |      БРАУЗЕР СОБЕСЕДНИКА    |
|                                     |     |                             |
|  [Vercel Serverless]: Next.js SSR,  |     |  WebRTC P2P соединение      |
|  API Routes, Webhook Handlers       |     |  внутри Рунета (без серверов|
|                                     |     |  посредников)               |
|  [Supabase Platform]:               |     |  STUN: sipnet.ru / public   |
|  - PostgreSQL 16 (Data Schema)      |     +-----------------------------+
|  - Realtime Channels (Signaling,    |
|    Whiteboard sync, Presence)       |
|  - Supabase Storage (Файлы, Аудио)  |
|  - Supabase Auth (JWT, RLS)         |
+-------------------------------------+
```

#### 4.1. Стек технологий
* **Фронтенд:** Next.js (App Router), React, TypeScript.
* **Стилизация & UI:** Tailwind CSS, библиотека компонентов `shadcn/ui`, иконки Lucide React.
* **Realtime-инфраструктура:** `@supabase/supabase-js` (WebSocket Channels для сигналинга звонка и синхронизации доски).
* **Интерактивная доска:** HTML5 Canvas / библиотека `@tldraw/tldraw` или `fabric.js` с кастомным адаптером через Supabase Realtime Broadcast.
* **Хранилище данных:** Supabase PostgreSQL + Supabase Storage (бакеты `avatars`, `homework`, `chat-attachments`, `voice-messages`).
* **Хостинг веб-части:** Vercel (Hobby / Pro tier, edge network).

#### 4.2. Схема базы данных (Supabase PostgreSQL DDL)

```sql
-- Перечисления (Enums)
create type user_role as enum ('student', 'teacher', 'admin');
create type lesson_status as enum ('pending', 'active', 'completed', 'cancelled');
create type hw_status as enum ('assigned', 'submitted', 'reviewed');

-- 1. Таблица профилей
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    role user_role default 'student' not null,
    full_name text not null,
    phone text,
    avatar_url text,
    balance_lessons int default 0 not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. Связка "Преподаватель - Ученик"
create table public.teacher_students (
    id uuid default gen_random_uuid() primary key,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    student_id uuid references public.profiles(id) on delete cascade not null,
    notes text,
    created_at timestamptz default now() not null,
    unique(teacher_id, student_id)
);

-- 3. Чаты (Диалоги)
create table public.conversations (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    last_message_at timestamptz default now() not null,
    created_at timestamptz default now() not null,
    unique(student_id, teacher_id)
);

-- 4. Сообщения мессенджера
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) on delete cascade not null,
    text text,
    file_url text,
    file_type text, -- 'image', 'audio_voice', 'document'
    is_read boolean default false not null,
    created_at timestamptz default now() not null
);

-- 5. Сессии уроков (On-Demand звонки)
create table public.lessons (
    id uuid default gen_random_uuid() primary key,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    student_id uuid references public.profiles(id) on delete cascade not null,
    status lesson_status default 'pending' not null,
    room_token text unique not null,
    started_at timestamptz,
    ended_at timestamptz,
    duration_minutes int default 0,
    whiteboard_snapshot_url text,
    teacher_summary text,
    created_at timestamptz default now() not null
);

-- 6. Домашние задания
create table public.homework (
    id uuid default gen_random_uuid() primary key,
    lesson_id uuid references public.lessons(id) on delete cascade,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    student_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    task_description text not null,
    task_file_url text,
    student_solution_text text,
    student_solution_file_url text,
    status hw_status default 'assigned' not null,
    teacher_feedback text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 7. Журнал транзакций баланса уроков
create table public.lesson_transactions (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    admin_id uuid references public.profiles(id),
    amount int not null, -- +8 (покупка) или -1 (списание за урок)
    description text not null,
    created_at timestamptz default now() not null
);

-- Включение Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;
alter table public.lessons enable row level security;
alter table public.homework enable row level security;
alter table public.teacher_students enable row level security;
alter table public.lesson_transactions enable row level security;
```

#### 4.3. Логика WebRTC Signaling через Supabase Realtime
Для обеспечения 100% бесплатного и отказоустойчивого соединения используется канал Supabase Realtime:

```javascript
// Концептуальный код сигналинга комнаты (Next.js / WebRTC)
const roomChannel = supabase.channel(`lesson-room:${roomId}`, {
  config: { broadcast: { self: false }, presence: { key: currentUserId } }
});

// Отправка SDP Offer
roomChannel.send({
  type: 'broadcast',
  event: 'signal',
  payload: { type: 'offer', sdp: peerConnection.localDescription }
});

// Передача ICE-кандидатов напрямую в канал
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    roomChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'candidate', candidate: event.candidate }
    });
  }
};

// Прием сигналов вторым клиентом
roomChannel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
  if (payload.type === 'offer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    roomChannel.send({ type: 'broadcast', event: 'signal', payload: { type: 'answer', sdp: answer } });
  } else if (payload.type === 'answer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  } else if (payload.type === 'candidate') {
    await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
  }
});
```

---

### 5. Принципы UI/UX дизайна платформы

* **Общий визуальный стиль:**  
  Современная дружелюбная цветовая гамма детского образовательного центра: мягкий индиго/лазурный (`#4F46E5`), теплый солнечный акцент (`#F59E0B`), светлый чистый фон (`#F8FAFC`) и четкая контрастная типографика.
* **Адаптивность (Mobile First):**  
  Интерфейс спроектирован так, чтобы ребенок или родитель мог комфортно пользоваться платформой с планшета (iPad/Android) или телефона:
  * В мобильной версии звонка видео собеседника разворачивается на весь экран, элементы управления фиксируются снизу.
  * Панель рисования на доске имеет крупные сенсорные кнопки, предотвращающие случайные нажатия.
* **UX звонка:**
  * Верхняя панель: статус урока, таймер, кнопка переключения «Доска / Видео».
  * Плавающее окно камеры собеседника с возможностью переноса в любой угол.
  * Быстрый доступ к чату без сворачивания видеозвонка.

---

### 6. Нефункциональные требования (NFR) и безопасность

* **Автономность в РФ (Анти-блокировки):**
  * Отсутствие зависимостей от зарубежных видео-SDK (Agora, Twilio, Daily.co, Zoom SDK).
  * WebRTC использует стандарт RFC 5245 (ICE/STUN). В случае работы через локальных провайдеров связь устанавливается по локальным IP (Host/Srflx candidates).
  * Шрифты и иконки бандлятся локально в Next.js проект без обращений к CDN Google Fonts.
* **Безопасность данных (ФЗ-152):**
  * Авторизационные токены JWT с коротким временем жизни (1 час) и автообновлением.
  * Row Level Security (RLS) в Supabase гарантирует, что ученик видит только свои сообщения, свои уроки и свой баланс.
  * Медиапотоки WebRTC шифруются сквозным шифрованием по умолчанию (DTLS/SRTP).
* **Производительность:**
  * Начальная загрузка веб-страницы $< 1.8$ секунды при мобильном 4G-соединении.
  * Оптимизация размера бандла доски (динамический импорт компонентов Whiteboard только при открытии урока).

---

### 7. Поэтапный план реализации (Roadmap)

#### Фаза 1: Инфраструктура и Аутентификация (1-я неделя)
* Настройка репозитория Next.js + Tailwind CSS + shadcn/ui.
* Инициализация проекта Supabase, настройка RLS-политик и схемы таблиц.
* Реализация экранов открытой регистрации, входа и профиля пользователя.
* Деплой окружения на Vercel.

#### Фаза 2: Мессенджер и передача файлов (2-я неделя)
* Реализация чатов «Преподаватель — Ученик» на Supabase Realtime Postgres Changes.
* Модуль записи и отправки голосовых сообщений (аудио-плеер со спектрограммой).
* Загрузка учебных файлов и картинок в Supabase Storage.

#### Фаза 3: Видеосвязь 1-на-1 и демонстрация экрана (3-я неделя)
* Интеграция WebRTC PeerConnection и модуля сигналинга на каналах Supabase Broadcast.
* Разработка интерфейса комнаты звонка: контролы микрофона, камеры, шеринга экрана.
* Тестирование устойчивости видеосвязи в различных браузерах (Chrome, Safari, Яндекс.Браузер).

#### Фаза 4: Интерактивная доска и On-Demand запуск (4-я неделя)
* Разработка легковесного холста совместного рисования (векторная синхронизация фигур и линий).
* Механика «Создать урок» у преподавателя с генерацией одноразовой ссылки и пуш-уведомлением ученику в чат.
* Сохранение снимка доски в конце урока.

#### Фаза 5: Личные кабинеты, учет баланса и Админка (5-я неделя)
* Личный кабинет ученика (виджет баланса, история тем, домашние задания).
* Личный кабинет преподавателя (список учеников, заметки, выставление ДЗ).
* Панель администратора: начисление занятий, управление преподавателями, статистика центра.

#### Фаза 6: QA, стресс-тесты и запуск MVP (6-я неделя)
* Сквозное E2E-тестирование пользовательских сценариев.
* Проверка качества видеосвязи на мобильных сетях и слабых устройствах.
* Обучение педагогов центра «АйДаУмничка» и старт пилотных уроков.

---

### 8. Оценка операционных расходов (TCO)

| Статья расходов | Сервис | Тариф / План | Ежемесячная стоимость |
| :--- | :--- | :--- | :--- |
| **Хостинг фронтенда** | Vercel | Hobby Tier | $0 (Бесплатно) |
| **База данных & Realtime** | Supabase | Free Tier (500MB DB, 50k MAU Realtime) | $0 (Бесплатно) |
| **P2P Видео и звук** | Браузерный WebRTC | Прямое соединение без SFU-сервера | $0 (Бесплатно) |
| **Хранилище файлов и аудио** | Supabase Storage | 1 GB Free включено | $0 (Бесплатно) |
| **Доменное имя** | Регистратор РФ (`.ru`) | Годовое продление | ~300 – 500 ₽ / год |
| **ИТОГО НА СТАРТЕ** | | | **0 ₽ / месяц** |

---

### 9. Критерии приемки проекта (Acceptance Criteria)
* [ ] Преподаватель может нажать «Начать урок», ученик в чате видит вызов и заходит в видеокомнату в 1 клик.
* [ ] Видео, звук и демонстрация экрана стабильно работают напрямую между участниками без разрывов при 60-минутной сессии.
* [ ] На интерактивной доске оба участника могут одновременно рисовать, вставлять картинки и видеть изменения без задержек.
* [ ] Голосовые сообщения корректно записываются и воспроизводятся в чате на смартфонах и ПК.
* [ ] Администратор может начислить ученику занятия, и баланс корректно уменьшается на 1 после подтверждения проведенного урока.