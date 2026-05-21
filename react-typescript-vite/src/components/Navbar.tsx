import React, { useState } from "react";
import { Bell, Shield, User, Award, HelpCircle } from "lucide-react";
import { UserRole, AgentLevel } from "../types";

interface NavbarProps {
  currentUser: {
    phone: string;
    name: string;
    role: UserRole;
    points: number;
    level: AgentLevel;
    score: number;
  } | null;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
  onMarkNotificationsRead: () => void;
  onLogout: () => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  openChatbot: () => void;
  openSupport: () => void;
}

export default function Navbar({
  currentUser,
  notifications,
  onMarkNotificationsRead,
  onLogout,
  activeRole,
  onChangeRole,
  openChatbot,
  openSupport
}: NavbarProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getLevelBadgeColor = (level?: AgentLevel) => {
    switch (level) {
      case AgentLevel.ELITE:
        return "bg-purple-100 text-purple-700 border-purple-200";
      case AgentLevel.GOLD:
        return "bg-amber-100 text-amber-700 border-amber-200";
      case AgentLevel.SILVER:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getProgressToNextLevel = (points: number) => {
    if (points >= 5000) return { pct: 100, next: "Max", rem: 0 };
    if (points >= 2000) return { pct: ((points - 2000) / 3000) * 100, next: "ÉLITE", rem: 5000 - points };
    if (points >= 500) return { pct: ((points - 500) / 1500) * 100, next: "GOLD", rem: 2000 - points };
    return { pct: (points / 500) * 100, next: "SILVER", rem: 500 - points };
  };

  const progress = currentUser ? getProgressToNextLevel(currentUser.points) : { pct: 0, next: "SILVER", rem: 500 };

  return (
    <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-slate-200 gap-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
          DB229
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            DataBroker229 <span className="text-emerald-600 underline decoration-yellow-400">🇧🇯</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            Bénin • Des données terrain fiables
          </p>
        </div>
      </div>

      {currentUser && (
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {/* Role selector dropdown wrapper */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              id="role-agent-btn"
              onClick={() => onChangeRole(UserRole.AGENT)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeRole === UserRole.AGENT
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Agent
            </button>
            <button
              id="role-client-btn"
              onClick={() => onChangeRole(UserRole.CLIENT)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeRole === UserRole.CLIENT
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Client
            </button>
            {currentUser.role === UserRole.ADMIN && (
              <button
                id="role-admin-btn"
                onClick={() => onChangeRole(UserRole.ADMIN)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                  activeRole === UserRole.ADMIN
                    ? "bg-slate-900 text-yellow-400 shadow-sm"
                    : "text-red-500 hover:text-red-700"
                }`}
              >
                <Shield className="w-3 h-3" /> Admin
              </button>
            )}
          </div>

          {/* Gamification Indicator */}
          {activeRole === UserRole.AGENT && (
            <div className="hidden lg:flex flex-col items-end border-l border-slate-200 pl-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Niveau Actuel</span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${getLevelBadgeColor(currentUser.level)}`}>
                  {currentUser.level} ({currentUser.level === AgentLevel.ELITE ? "+15%" : currentUser.level === AgentLevel.GOLD ? "+10%" : currentUser.level === AgentLevel.SILVER ? "+5%" : "0%"} BONUS)
                </span>
                <span className="text-base font-black text-emerald-600 italic">
                  {currentUser.points.toLocaleString()} pts
                </span>
              </div>
              <div className="w-36 bg-slate-100 h-1.5 rounded-full mt-1.5 relative overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress.pct}%` }}></div>
              </div>
            </div>
          )}

          {/* Helper buttons */}
          <button
            id="chatbot-nav-btn"
            onClick={openChatbot}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Assistant IA & Guide"
          >
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span className="hidden sm:inline">Aide IA</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              id="notif-bell-btn"
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (!showNotifDropdown) onMarkNotificationsRead();
              }}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-extrabold text-xs text-slate-700 uppercase">Alerte info Bénin</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkNotificationsRead}
                      className="text-[10px] font-bold text-emerald-600 hover:underline"
                    >
                      Tout lire
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">Aucune notification</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`p-3 text-xs leading-relaxed ${!n.isRead ? "bg-emerald-50/40" : ""}`}>
                        <div className="font-bold text-slate-800 flex justify-between items-center mb-0.5">
                          <span>{n.title}</span>
                          <span className="text-[9px] font-medium text-slate-400 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logged user details & signout */}
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-black text-slate-800 truncate max-w-[120px]">{currentUser.name}</div>
              <div className="text-[9px] text-slate-400 font-mono">{currentUser.phone}</div>
            </div>
            <button
              id="user-logout-btn"
              onClick={onLogout}
              className="px-2 py-1 text-xs font-bold ring-1 ring-slate-200 hover:ring-rose-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
            >
              Quitter
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
