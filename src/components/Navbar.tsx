"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Users,
  User,
  ShieldCheck,
  Video,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/teacher", label: "Преподаватель", icon: GraduationCap },
    { href: "/student", label: "Ученик", icon: User },
    { href: "/parent", label: "Родитель", icon: Users },
    { href: "/admin", label: "Управление", icon: ShieldCheck },
  ];

  const isRoom = pathname.startsWith("/room");

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Чистый логотип */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                АйДаУмничка
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block leading-none">
                Онлайн-центр
              </span>
            </div>
          </Link>

          {/* Единая спокойная навигация по кабинетам */}
          {!isRoom && (
            <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      isActive
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Правая кнопка */}
          <div className="flex items-center gap-2">
            {isRoom ? (
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Выйти
              </Link>
            ) : (
              <Link
                href="/room/umnichka-live-room-demo"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Эфир урока</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
