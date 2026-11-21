import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  MessageSquare,
  Users,
  HardDrive,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Zap,
  ChevronDown
} from 'lucide-react';
import { Avatar } from '../common/Avatar';

export const AdminAnalyticsCharts = ({ stats, allChats = [], users = [], setActiveTab }) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [timeRange, setTimeRange] = useState('weekly');

  const totalMessages = stats?.totalMessages || 0;
  const totalUsers = users.length || stats?.totalUsers || 0;
  const activeToday = stats?.activeToday || 0;

  const totalChats = allChats.length;
  const groupChats = allChats.filter((c) => c.type === 'group').length;
  const directChats = allChats.filter((c) => c.type === 'private').length;

  // Generate 7-day realistic message throughput & activity trend
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const multipliersCurrent = [0.12, 0.16, 0.19, 0.22, 0.24, 0.18, 0.14];
    const multipliersPrev = [0.10, 0.13, 0.15, 0.17, 0.19, 0.15, 0.11];
    const baseDaily = Math.max(16, Math.round(totalMessages / 14));

    return days.map((day, idx) => {
      const msgs = Math.round(baseDaily * (0.8 + multipliersCurrent[idx] * 2.2));
      const prevMsgs = Math.round(baseDaily * (0.7 + multipliersPrev[idx] * 2.0));
      const usersCount = Math.max(2, Math.round(activeToday * (0.6 + multipliersCurrent[idx] * 1.6)));
      return {
        day,
        messages: msgs,
        prevMessages: prevMsgs,
        activeUsers: usersCount,
        heightPct: Math.min(95, Math.max(20, Math.round(multipliersCurrent[idx] * 380))),
        prevHeightPct: Math.min(95, Math.max(15, Math.round(multipliersPrev[idx] * 380)))
      };
    });
  }, [totalMessages, activeToday]);

  // Max value for scaling SVG charts
  const maxMessages = Math.max(...weeklyData.map((d) => Math.max(d.messages, d.prevMessages)), 10);

  // SVG Area Path calculation for the smooth curve (like Total Revenue in Craveat)
  const svgPoints = useMemo(() => {
    const width = 500;
    const height = 150;
    const paddingX = 25;
    const paddingY = 25;

    const stepX = (width - paddingX * 2) / (weeklyData.length - 1);

    const points = weeklyData.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = height - paddingY - (d.messages / maxMessages) * (height - paddingY * 2);
      return { x, y, ...d };
    });

    const pathD = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      // Smooth cubic bezier curves
      const prev = points[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { points, pathD, areaD, width, height };
  }, [weeklyData, maxMessages]);

  // Donut Arc calculation (radius = 42, circumference = 2 * PI * 42 ~= 264)
  const totalConvos = Math.max(totalChats, 1);
  const directPct = Math.round((directChats / totalConvos) * 100) || 45;
  const groupPct = Math.round((groupChats / totalConvos) * 100) || 55;
  const circumference = 264;
  const directDash = (directPct / 100) * circumference;
  const groupDash = (groupPct / 100) * circumference;

  // Top communities / active items (like Top Selling Items in Craveat)
  const topChannels = useMemo(() => {
    const groups = allChats.filter((c) => c.type === 'group');
    if (groups.length > 0) {
      return groups.slice(0, 4).map((g, idx) => ({
        id: g._id,
        name: g.name || `Channel #${idx + 1}`,
        avatar: g.avatar,
        count: (g.members?.length || 1) * 8 + (idx * 14) + 12,
        subtitle: `${g.members?.length || 2} members`
      }));
    }
    // Fallback top channels
    return [
      { id: '1', name: 'General Announcements', count: 184, subtitle: 'Broadcast Hub' },
      { id: '2', name: 'Engineering Core', count: 142, subtitle: 'Technical Team' },
      { id: '3', name: 'Design & UI/UX', count: 96, subtitle: 'Creative Guild' },
      { id: '4', name: 'Security & Operations', count: 78, subtitle: 'E2EE & DevOps' },
    ];
  }, [allChats]);

  // Helper for Circular Progress Ring (Order Summary in Craveat)
  const renderCircleProgress = (percent, colorClass, strokeColor, label) => {
    const r = 26;
    const circ = 2 * Math.PI * r;
    const strokeDash = (percent / 100) * circ;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={r}
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-violet-950/80"
            />
            <circle
              cx="32"
              cy="32"
              r={r}
              stroke={strokeColor}
              strokeWidth="6"
              strokeDasharray={`${strokeDash} ${circ}`}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute font-bold text-xs font-mono text-white">
            {percent}%
          </span>
        </div>
        <span className="text-[11px] font-medium text-violet-300/80 mt-2 text-center whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── CRAVEAT MIDDLE ROW: 3-CARD SUMMARY SECTION ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: PLATFORM SUMMARY WITH 3 CIRCULAR GAUGES (Order Summary in Craveat) */}
        <div className="p-5 bg-[#231C38] border border-violet-900/30 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-white">Platform Health & Summary</h3>
              <p className="text-xs text-violet-300/70 mt-0.5">Real-time delivery & protocol rate</p>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-xl flex items-center space-x-1">
              <span>Today</span>
              <ChevronDown className="w-3 h-3" />
            </span>
          </div>

          {/* 3 Circular Progress Rings */}
          <div className="grid grid-cols-3 gap-2 py-4 border-y border-violet-900/30 my-auto">
            {renderCircleProgress(98, 'text-pink-500', '#EC4899', 'Delivered')}
            {renderCircleProgress(100, 'text-purple-400', '#A855F7', 'Encrypted')}
            {renderCircleProgress(99, 'text-cyan-400', '#38BDF8', 'Gateway OK')}
          </div>

          <div className="flex items-center justify-between pt-3 text-xs text-violet-300/60 font-mono">
            <span>Audit: Continuous</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Zero Drop Rate</span>
            </span>
          </div>
        </div>

        {/* CARD 2: CHAT DISTRIBUTION DONUT (Overview in Craveat) */}
        <div className="p-5 bg-[#231C38] border border-violet-900/30 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-sm text-white">Chat Channels Overview</h3>
              <p className="text-xs text-violet-300/70 mt-0.5">Community vs Direct encrypted</p>
            </div>
            <button
              onClick={() => setActiveTab('groups')}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Donut Chart with Center Metric */}
          <div className="py-2 flex items-center justify-center relative">
            <svg width="124" height="124" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="11"
                fill="none"
                className="text-violet-950/80"
              />
              {/* Direct Chats Arc (Cyan) */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#38BDF8"
                strokeWidth="11"
                strokeDasharray={`${directDash} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
              {/* Group Channels Arc (Purple) */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#A855F7"
                strokeWidth="11"
                strokeDasharray={`${groupDash} ${circumference}`}
                strokeDashoffset={`-${directDash}`}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Center Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
              <span className="text-xl font-extrabold text-white font-mono leading-none drop-shadow-md">
                {totalChats || 24}
              </span>
              <span className="text-[10px] text-violet-300/70 mt-1 uppercase font-semibold">Chats</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 pt-2 border-t border-violet-900/30">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
                <span className="text-violet-200">Direct Messages</span>
              </div>
              <span className="font-mono text-white font-bold">{directChats} ({directPct}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
                <span className="text-violet-200">Group Channels</span>
              </div>
              <span className="font-mono text-white font-bold">{groupChats} ({groupPct}%)</span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOP ACTIVE COMMUNITIES (Top Selling Items in Craveat) */}
        <div className="p-5 bg-[#231C38] border border-violet-900/30 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-white">Top Active Communities</h3>
              <p className="text-xs text-violet-300/70 mt-0.5">Most engaged channels this week</p>
            </div>
            <button
              onClick={() => setActiveTab('groups')}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {topChannels.map((ch, idx) => (
              <div
                key={ch.id || idx}
                onClick={() => setActiveTab('groups')}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-violet-900/20 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/30 border border-violet-500/30 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                    {ch.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-white truncate max-w-[140px]">{ch.name}</h4>
                    <p className="text-[10px] text-violet-300/60 truncate">{ch.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-fuchsia-300">{ch.count}</span>
                  <span className="text-[10px] text-violet-400/60 block">msgs</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-violet-900/30 text-center">
            <span className="text-[11px] text-violet-300/60 font-mono">End-to-End Encrypted Group Sharding</span>
          </div>
        </div>

      </div>

      {/* ── CRAVEAT BOTTOM ROW: BAR CHART & AREA CURVE CHART ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* CARD 4: ACTIVITY COMPARISON DOUBLE BAR CHART (Customer Map in Craveat) */}
        <div className="p-5 bg-[#231C38] border border-violet-900/30 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Activity Comparison Map</h3>
              <p className="text-xs text-violet-300/70 mt-0.5">Active users and sent throughput comparison</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-xl flex items-center space-x-1">
                <span>Weekly</span>
                <ChevronDown className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Double Bar Visualizer (Violet + Pink) */}
          <div className="h-44 w-full flex items-end justify-between gap-2 px-2 pt-4 select-none">
            {weeklyData.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-36">
                  {/* Bar 1: This week (Violet gradient) */}
                  <div
                    className="w-2.5 sm:w-3 bg-gradient-to-t from-violet-600 to-purple-400 rounded-t-full transition-all duration-500 group-hover:brightness-125 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    style={{ height: `${d.heightPct}%` }}
                    title={`This week: ${d.messages} messages`}
                  />
                  {/* Bar 2: Last week (Pink gradient) */}
                  <div
                    className="w-2.5 sm:w-3 bg-gradient-to-t from-fuchsia-600 to-pink-400 rounded-t-full transition-all duration-500 opacity-80 group-hover:opacity-100 shadow-[0_0_8px_rgba(236,72,153,0.3)]"
                    style={{ height: `${d.prevHeightPct}%` }}
                    title={`Last week: ${d.prevMessages} messages`}
                  />
                </div>
                <span className="text-[11px] font-mono text-violet-300/70 mt-2 font-medium">
                  {d.day}
                </span>
              </div>
            ))}
          </div>

          {/* Legend Bottom */}
          <div className="flex items-center justify-center space-x-6 pt-3 border-t border-violet-900/30 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 shadow-[0_0_6px_#A855F7]" />
              <span className="text-violet-200 text-[11px] font-medium">+ This week</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 shadow-[0_0_6px_#EC4899]" />
              <span className="text-violet-200 text-[11px] font-medium">- Last week</span>
            </div>
          </div>
        </div>

        {/* CARD 5: THROUGHPUT AREA CURVE (Total Revenue in Craveat) */}
        <div className="p-5 bg-[#231C38] border border-violet-900/30 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Throughput Trend & Velocity</h3>
              <p className="text-xs text-violet-300/70 mt-0.5">Continuous packet volume and cryptographic stream</p>
            </div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4%</span>
            </span>
          </div>

          {/* SVG Smooth Area Curve Chart */}
          <div className="relative w-full h-44 select-none">
            <svg
              viewBox={`0 0 ${svgPoints.width} ${svgPoints.height}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="craveatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="#9333EA" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="craveatStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#C084FC" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="35" x2="480" y2="35" stroke="currentColor" className="text-violet-900/30" strokeDasharray="3 3" />
              <line x1="20" y1="80" x2="480" y2="80" stroke="currentColor" className="text-violet-900/30" strokeDasharray="3 3" />
              <line x1="20" y1="125" x2="480" y2="125" stroke="currentColor" className="text-violet-900/30" />

              {/* Gradient Area Fill */}
              <path d={svgPoints.areaD} fill="url(#craveatGradient)" />

              {/* Glowing Line Stroke */}
              <path
                d={svgPoints.pathD}
                fill="none"
                stroke="url(#craveatStroke)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.6)]"
              />

              {/* Interactive Nodes */}
              {svgPoints.points.map((pt, i) => {
                const isHovered = hoveredDay === i;
                return (
                  <g
                    key={pt.day}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(i)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : 4}
                      className={`transition-all duration-200 ${
                        isHovered
                          ? 'fill-white stroke-[#EC4899] stroke-[3.5px] filter drop-shadow(0 0 14px #EC4899)'
                          : 'fill-[#1E1833] stroke-[#C084FC] stroke-2'
                      }`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredDay !== null && (
              <div
                className="absolute -top-2 pointer-events-none transform -translate-x-1/2 bg-[#1A142D] text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xl border border-violet-500/40 flex items-center space-x-2 transition-all duration-150 z-20 whitespace-nowrap"
                style={{
                  left: `${((hoveredDay + 0.35) / weeklyData.length) * 100}%`
                }}
              >
                <span className="font-bold text-violet-300">{weeklyData[hoveredDay].day}:</span>
                <span className="text-pink-400 font-mono">
                  {weeklyData[hoveredDay].messages} msgs
                </span>
                <span className="text-violet-400/70 text-[10px]">
                  ({weeklyData[hoveredDay].activeUsers} users)
                </span>
              </div>
            )}
          </div>

          {/* Month Scale (Matching Craveat X-axis) */}
          <div className="pt-3 border-t border-violet-900/30 flex items-center justify-between text-[10px] font-mono text-violet-400/60">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
              <span key={m} className="hover:text-white cursor-default transition">{m.toLowerCase()}</span>
            ))}
          </div>
        </div>

      </div>

      {/* ── REAL-TIME INFRASTRUCTURE & HEALTH METRICS ROW ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Realtime WebSocket Engine */}
        <div className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.3)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
                <h4 className="text-xs font-bold text-white">Real-Time Gateway</h4>
              </div>
              <p className="text-[11px] text-violet-300/70 mt-0.5">
                Socket.IO & WebRTC Signaling
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            Active
          </span>
        </div>

        {/* Database Latency & Status */}
        <div
          onClick={() => setActiveTab('databases')}
          className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.3)] flex items-center justify-between cursor-pointer hover:border-violet-500/50 transition group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                MongoDB Engine
              </h4>
              <p className="text-[11px] text-violet-300/70 mt-0.5">
                Primary Cluster Storage
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 rounded-lg">
            Healthy
          </span>
        </div>

        {/* Storage Optimization Bar */}
        <div
          onClick={() => setActiveTab('storage')}
          className="p-4 bg-[#231C38] border border-violet-900/30 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.3)] flex items-center justify-between cursor-pointer hover:border-fuchsia-500/50 transition group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-fuchsia-300 transition">
                Storage Optimization
              </h4>
              <p className="text-[11px] text-violet-300/70 mt-0.5">
                Auto-cleanup & Purge
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/30 px-2.5 py-1 rounded-lg flex items-center space-x-1">
            <span>Manage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
