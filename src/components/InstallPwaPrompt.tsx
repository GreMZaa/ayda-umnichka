"use client";

import { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2 } from "lucide-react";

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Проверка, запущено ли уже как установленное приложение (PWA standalone)
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // Проверка iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Проверка, не закрывал ли пользователь баннер недавно
    const dismissed = localStorage.getItem("ayda_pwa_dismissed");
    if (!dismissed) {
      // Показываем плашку через 3 секунды после первого входа
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Обработка нативного события установки Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleCustomOpen = () => {
      setShowBanner(true);
      if (isIosDevice) {
        setShowIosGuide(true);
      }
    };
    window.addEventListener("open-pwa-install", handleCustomOpen);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("open-pwa-install", handleCustomOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Инструкция для других браузеров
      alert("Чтобы добавить на рабочий стол, нажмите Меню браузера (три точки) и выберите «Установить приложение» или «Добавить на главный экран».");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("ayda_pwa_dismissed", "true");
    } catch (e) {}
  };

  if (isStandalone) return null;

  return (
    <>
      {/* 1. Плавающий баннер внизу экрана для мобильных устройств */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-blue-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192x192.png"
                alt="АйДаУмничка"
                className="w-12 h-12 rounded-2xl shadow-md shrink-0 object-cover"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Приложение «АйДаУмничка»
                  </h4>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Установите на рабочий стол для быстрого входа
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Установить
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Закрыть уведомление"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Модальная подсказка для iPhone / iPad (iOS Safari) */}
      {showIosGuide && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIosGuide(false);
          }}
          className="fixed inset-0 z-[100] w-screen h-screen bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">
                Как установить на iPhone / iPad:
              </h3>
              <p className="text-xs text-slate-500">
                Всего 3 простых шага в браузере Safari:
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-3 text-xs text-slate-700 border border-slate-100">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Нажмите на кнопку <strong>«Поделиться»</strong> <Share className="w-3.5 h-3.5 inline text-blue-600 -mt-0.5" /> в нижней панели Safari.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Прокрутите список вниз и выберите <strong>«На экран „Домой“»</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 -mt-0.5" />.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Нажмите <strong>«Добавить»</strong> в правом верхнем углу. Иконка появится на рабочем столе!
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
}
