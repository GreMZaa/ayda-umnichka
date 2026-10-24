import Link from 'next/link';
import { Sparkles, Video, GraduationCap, UserCheck, Shield, MessageCircle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-96 h-96 rounded-full bg-solar-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-solar-300 border border-white/10">
            <Sparkles className="w-4 h-4 text-solar-400" />
            <span>Детский центр развития речи и интеллекта • Тольятти</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Образовательная P2P платформа <span className="text-transparent bg-clip-text bg-gradient-to-r from-solar-400 to-amber-200">«АйДаУмничка»</span>
          </h1>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            Индивидуальные интерактивные онлайн-уроки 1-на-1 без зарубежных видео-шлюзов. Прямой WebRTC медиатрафик внутри РФ, устойчивость к блокировкам («белые списки»), совместная онлайн-доска, голосовой мессенджер и прозрачный учет баланса занятий.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/room/room-logoped-timofey"
              className="inline-flex items-center gap-2 bg-solar-500 hover:bg-solar-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-solar-500/25 active:scale-95 text-sm"
            >
              <Video className="w-4 h-4 text-slate-950" />
              <span>Войти в демо-урок (On-Demand)</span>
            </Link>

            <Link
              href="/student"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-all border border-white/20 text-sm"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Кабинет ученика и Баланс</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Room Notification Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/30">
            <Video className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Активный On-Demand звонок
              </span>
              <span className="text-xs text-slate-500">Комната: room-logoped-timofey</span>
            </div>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              Преподаватель Светлана Васильевна ожидает Тимофея на урок «Автоматизация звука [Р]»
            </p>
          </div>
        </div>

        <Link
          href="/room/room-logoped-timofey"
          className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2"
        >
          <span>Присоединиться к уроку</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Role Cards Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Выберите раздел платформы</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student */}
          <Link
            href="/student"
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-brand-500/50 hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-brand-600 transition-colors">
                Личный кабинет Ученика
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Контроль баланса занятий, вход в активный урок в 1 клик, получение домашних заданий и отправка решений с голосовыми ответами.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-brand-600 gap-1">
              <span>Перейти в кабинет</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Teacher */}
          <Link
            href="/teacher"
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-500/50 hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                Кабинет Преподавателя
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Быстрый запуск on-demand урока в любое время, список закрепленных учеников, заметки логопеда и выдача интерактивных ДЗ.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 gap-1">
              <span>Открыть рабочее место</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin */}
          <Link
            href="/admin"
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-amber-500/50 hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-amber-600 transition-colors">
                Панель Администратора
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Начисление абонементов (+4, +8, +16 занятий), управление связками преподаватель-ученик, журнал транзакций и сводная статистика центра.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-amber-600 gap-1">
              <span>Управление центром</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Technical Highlights */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Архитектурные преимущества платформы «АйДаУмничка»
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-900">Устойчивость в РФ</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Прямой P2P WebRTC между учителем и учеником. Медиатрафик не покидает пределы провайдеров РФ.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-900">On-Demand уроки</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Уроки без жесткой сетки. Педагог начинает занятие кнопкой в 1 клик, когда ребенок готов.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-900">Интерактивная доска</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Совместное рисование, карточки с заданиями, режим PiP (видео в углу) и сохранение снимков в историю.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h4 className="font-bold text-sm text-slate-900">Учет баланса занятий</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Прозрачный баланс абонементов, автоматическое списание за проведенный урок и аудит всех оплат.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
