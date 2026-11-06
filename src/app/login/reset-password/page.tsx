'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function hashIndicatesRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  return params.get('type') === 'recovery' && Boolean(params.get('access_token'));
}

function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Сервис авторизации временно недоступен');
      setChecking(false);
      return;
    }

    let cancelled = false;

    const finishCheck = (allowed: boolean) => {
      if (cancelled) return;
      setReady(allowed);
      setChecking(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        finishCheck(true);
      }
    });

    const run = async () => {
      if (hashIndicatesRecovery()) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          finishCheck(false);
          return;
        }
        finishCheck(Boolean(data.session));
        return;
      }
      finishCheck(false);
    };

    void run();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password.length < 6) {
      setErrorMessage('Пароль должен быть не короче 6 символов');
      return;
    }
    if (password !== password2) {
      setErrorMessage('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMessage('Пароль успешно изменён. Сейчас перенаправим на вход...');
      await supabase.auth.signOut();
      setTimeout(() => {
        router.replace('/login?reset=success');
      }, 1500);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Не удалось сохранить пароль';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-[#FFF7EE] p-4">
        <div className="w-8 h-8 border-3 border-coralAccent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-[#FFF7EE] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-[#F2DECE] shadow-sm text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-coralAccent mx-auto" />
          <h1 className="text-lg font-black text-[#161F38]">Ссылка недействительна или устарела</h1>
          <p className="text-xs text-[#6B758E] leading-relaxed">
            Новый пароль можно задать только по ссылке из письма «Восстановление пароля». Запросите письмо на
            странице входа.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-coralAccent text-white py-2.5 rounded-full text-xs font-black"
          >
            На страницу входа
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-[#FFF7EE] p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] shadow-sm space-y-4">
        <div>
          <h1 className="text-lg font-black text-[#161F38]">Новый пароль</h1>
          <p className="text-[11px] text-[#6B758E] mt-1">
            Вы перешли по ссылке из письма. Задайте новый пароль для входа в личный кабинет.
          </p>
        </div>

        {errorMessage && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-2 bg-[#EAF7CF] border border-[#D5ECA3] rounded-xl text-xs text-[#456512] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-0.5">
            <label className="text-[11px] font-extrabold text-[#161F38]">Новый пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-xl px-3 py-2 pl-8 pr-8 text-sm font-mono focus:outline-none focus:border-coralAccent"
                autoComplete="new-password"
              />
              <Lock className="w-3.5 h-3.5 text-[#9E9085] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9085]"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-0.5">
            <label className="text-[11px] font-extrabold text-[#161F38]">Повторите пароль</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-coralAccent"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-sm py-2.5 rounded-full flex items-center justify-center gap-2 disabled:opacity-80"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <Link href="/login" className="block text-center text-xs font-bold text-[#6B758E] hover:text-coralAccent">
          ← Вернуться ко входу
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
