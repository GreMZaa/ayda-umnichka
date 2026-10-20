"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TelegramCabinet from "@/components/TelegramCabinet";
import { getSupabase } from "@/lib/supabase";

export default function ChatPage() {
  const router = useRouter();
  const [role, setRole] = useState<"TEACHER" | "STUDENT" | "PARENT" | "ADMIN">("STUDENT");
  const [user, setUser] = useState<any>({
    id: "me",
    name: "Пользователь",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const activeRole = localStorage.getItem("ayda_active_role")?.toUpperCase();
      if (activeRole === "TEACHER" || activeRole === "STUDENT" || activeRole === "PARENT" || activeRole === "ADMIN") {
        setRole(activeRole);
      }

      const savedUser =
        localStorage.getItem("ayda_current_user_profile") || localStorage.getItem("ayda_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.name) setUser(u);
      }
    } catch (e) {}

    const client = getSupabase();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          client
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle()
            .then(({ data: prof }) => {
              if (prof) {
                setUser({
                  id: prof.id,
                  name: prof.name || "Пользователь",
                  email: prof.email,
                  avatar: prof.avatar_url,
                  role: prof.role,
                  phone: prof.phone,
                });
                if (prof.role) {
                  setRole(prof.role.toUpperCase() as any);
                }
              }
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-4rem)] bg-[#eef3f7]">
        <div className="w-10 h-10 border-3 border-[#2481cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TelegramCabinet
      currentRole={role}
      currentUser={{
        id: user.id || "me",
        name: user.name || "Пользователь",
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || user.avatarUrl,
        grade: user.grade,
      }}
    />
  );
}
