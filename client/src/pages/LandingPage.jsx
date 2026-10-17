import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Lock,
  Users,
  Smartphone,
  Download,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { PulseLogo } from '../components/common/PulseLogo';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 lg:px-12 py-5 border-b border-slate-800/80 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="flex items-center space-x-3">
          <Link to="/" className="group hover:opacity-90 transition">
            <PulseLogo size="md" animated={true} />
          </Link>
          <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-full">
            AES-256 E2EE
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-5xl mx-auto relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Socket.IO messaging with client-side Web Crypto</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Next-Generation Encrypted Real-Time Messaging.
        </h1>

        <p className="mt-5 text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Experience frictionless instant private chats, rich group collaboration, media sharing, and verifiable End-to-End Encryption with full data sovereignty.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          <Link
            to="/register"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center space-x-2 transition hover:scale-105 active:scale-95"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition"
          >
            <span>Launch Messenger</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">End-to-End Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Messages are encrypted directly on client devices using Web Crypto AES-256-GCM. The database and backend never possess your plaintext.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Zero-Latency Socket.IO</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant delivery receipts, live typing indicators, presence tracking, emoji reactions, and message editing without reloading.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-800/60 text-violet-400 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Group Governance & Safety</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular group roles (Owners, Admins, Members), invite links, announcement channels, server-side user blocking, and moderation reports.
            </p>
          </div>
        </div>

        {/* Feature Checkmarks */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Chat Transcript Export (HTML, JSON, TXT)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>GDPR Data Portability</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Multi-Session Device Management</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>PulseChat &copy; 2026. Built with React, Tailwind CSS, Express, Socket.IO & MongoDB.</p>
      </footer>
    </div>
  );
};
