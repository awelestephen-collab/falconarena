"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gift,
  MessageSquare,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { AnswerShapeIcon, OPTION_STYLES } from "@/components/AnswerShapeIcon";
import { FalconLogo } from "@/components/FalconLogo";
import { GameStudioModal } from "@/components/GameStudioModal";
import { TownHallRaffleStage } from "@/components/TownHallRaffleStage";
import { TripleLeaderboard } from "@/components/TripleLeaderboard";
import {
  computeIndividualStandings,
  computeLocationStandings,
  computeSquadStandings,
} from "@/lib/game-engine";
import { soundFX } from "@/lib/sound-fx";
import { useRoomSync } from "@/lib/use-room-sync";

export default function HostStagePage() {
  const params = useParams<{ pin: string }>();
  const router = useRouter();
  const pin = params?.pin || "199400";

  const { room, loading, realtimeMode, dispatchRoomAction } = useRoomSync(pin);
  const [studioOpen, setStudioOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [originUrl, setOriginUrl] = useState("https://falcon-arena.vercel.app");
  const [remainingSec, setRemainingSec] = useState<number>(0);

  const botSimulatedForQuestionRef = useRef<string | null>(null);
  const phaseTransitionLockRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.muted = next;
  };

  const joinUrl = `${originUrl}/play/${pin}`;

  const copyJoinLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentQuestion = useMemo(() => {
    if (!room) return null;
    return room.questions[room.currentQuestionIndex] || null;
  }, [room]);

  const playersList = useMemo(() => {
    if (!room) return [];
    return Object.values(room.players);
  }, [room]);

  const answeredCount = useMemo(() => {
    if (!room || !currentQuestion) return 0;
    return playersList.filter(
      (p) => p.answers[currentQuestion.id] !== undefined
    ).length;
  }, [room, currentQuestion, playersList]);

  // Automatically trigger simulated bot votes 1.4s after a question opens
  useEffect(() => {
    if (!room || room.status !== "question" || !currentQuestion) return;
    const hasSimulated = Object.values(room.players).some((p) => p.isSimulated);
    if (!hasSimulated) return;

    const key = `${room.pin}-${currentQuestion.id}-${room.phaseStartedAt}`;
    if (botSimulatedForQuestionRef.current === key) return;
    botSimulatedForQuestionRef.current = key;

    const timer = setTimeout(() => {
      dispatchRoomAction("simulate_answers");
    }, 1400);
    return () => clearTimeout(timer);
  }, [room, currentQuestion, dispatchRoomAction]);

  // Countdown timer for team_talk and question phases
  useEffect(() => {
    if (
      !room ||
      (room.status !== "team_talk" && room.status !== "question")
    ) {
      setRemainingSec(0);
      return;
    }

    const updateTimer = () => {
      const msLeft = Math.max(0, room.phaseEndsAt - Date.now());
      const secLeft = Math.ceil(msLeft / 1000);
      setRemainingSec((prev) => {
        if (
          secLeft !== prev &&
          secLeft > 0 &&
          secLeft <= 5 &&
          room.status === "question"
        ) {
          soundFX.playTick(true);
        }
        return secLeft;
      });

      if (msLeft <= 0) {
        const lockKey = `${room.status}-${room.currentQuestionIndex}-${room.phaseEndsAt}`;
        if (phaseTransitionLockRef.current !== lockKey) {
          phaseTransitionLockRef.current = lockKey;
          if (room.status === "team_talk") {
            soundFX.playLockIn();
            dispatchRoomAction("open_question_answers");
          } else if (room.status === "question") {
            soundFX.playRevealFanfare();
            dispatchRoomAction("reveal_question");
          }
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [room, dispatchRoomAction]);

  // Fire confetti when entering podium
  useEffect(() => {
    if (room?.status === "podium") {
      soundFX.playRevealFanfare();
      try {
        confetti({ particleCount: 130, spread: 90, origin: { y: 0.6 } });
      } catch {
        // Ignore on headless
      }
    }
  }, [room?.status]);

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-[#050c1a] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl border-2 border-sky-400 border-t-transparent animate-spin mx-auto" />
          <div className="text-lg font-bold text-white">
            Initializing Falcon Arena Stage (#{pin})...
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = room.questions.length;
  const isLastQuestion = room.currentQuestionIndex >= totalQuestions - 1;

  // Option vote distribution for reveal phase
  const optionBreakdown = currentQuestion
    ? currentQuestion.options.map((opt) => {
        const voters = playersList.filter(
          (p) => p.answers[currentQuestion.id]?.optionId === opt.id
        );
        const count = voters.length;
        const percent =
          answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
        return { option: opt, count, percent, voters };
      })
    : [];

  const maxOptionVotes = Math.max(0, ...optionBreakdown.map((o) => o.count));

  const isWinningOption = (optId: number) => {
    if (!currentQuestion) return false;
    if (currentQuestion.mode === "speed_trivia") {
      return currentQuestion.correctOptionId === optId;
    }
    if (currentQuestion.mode === "majority_wins") {
      const item = optionBreakdown.find((o) => o.option.id === optId);
      return Boolean(item && item.count > 0 && item.count === maxOptionVotes);
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050c1a] text-slate-100">
      {/* Top Presenter Bar */}
      <header className="border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div onClick={() => router.push("/")} className="cursor-pointer">
              <FalconLogo size="sm" showTagline={false} />
            </div>
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="text-xs text-slate-400">PIN:</span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 font-black text-sky-300 tracking-widest text-sm">
                {room.pin}
              </span>
              <span className="text-xs text-slate-400 ml-2 truncate max-w-[240px]">
                {room.title}
              </span>
            </div>
          </div>

          {/* Stage Navigation Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatchRoomAction("set_phase", { status: "lobby" })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                room.status === "lobby"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Lobby ({playersList.length})
            </button>

            <button
              onClick={() =>
                dispatchRoomAction("set_phase", { status: "leaderboard" })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                room.status === "leaderboard"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              4-Location &amp; Squad Cup
            </button>

            <button
              onClick={() =>
                dispatchRoomAction("set_phase", { status: "raffle" })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                room.status === "raffle"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-500/30"
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Lucky Draw
            </button>

            <button
              onClick={() => setStudioOpen(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              title="Open Falcon Studio & Edit 4 Locations / Questions"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              title={muted ? "Unmute Audio FX" : "Mute Audio FX"}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Presenter Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between gap-6">
        {/* ==================== PHASE 1: LOBBY ==================== */}
        {room.status === "lobby" && (
          <div className="space-y-6">
            {/* Giant Join Banner + QR Code */}
            <div className="grid lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 via-[#091b38] to-slate-950 border-2 border-sky-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold">
                      {realtimeMode === "supabase"
                        ? "⚡ Realtime Sync Active"
                        : "⚡ Live Sync Ready"}
                    </span>
                    {room.teamTalkEnabled && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        🗣️ Team Talk Huddle ({room.defaultTeamTalkSec}s)
                      </span>
                    )}
                    {room.personalModeEnabled && (
                      <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-bold">
                        📱 Mobile Personal Mode Enabled
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-black text-white">
                    {room.title}
                  </h1>
                  <p className="text-sm text-slate-300">
                    Scan the QR code with your phone or open{" "}
                    <span className="text-sky-300 font-bold underline">
                      {joinUrl}
                    </span>{" "}
                    and enter the Game PIN:
                  </p>
                </div>

                <div className="my-6 flex flex-wrap items-center gap-4">
                  <div className="px-6 py-4 rounded-2xl bg-slate-950/90 border-2 border-sky-400 shadow-lg shadow-sky-500/20">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      GAME PIN
                    </div>
                    <div className="text-4xl sm:text-6xl font-black tracking-[0.18em] text-white">
                      {room.pin}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={copyJoinLink}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 border border-slate-700 transition"
                    >
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      {copied ? "Copied Player Link!" : "Copy Player Join Link"}
                    </button>
                    <a
                      href={`/play/${room.pin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-xs font-bold text-sky-300 flex items-center gap-2 border border-sky-500/30 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Player Controller in New Tab
                    </a>
                  </div>
                </div>

                {/* Host Action Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      soundFX.playTeamTalkChime();
                      dispatchRoomAction("start_question", { questionIndex: 0 });
                    }}
                    className="px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 transition flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-slate-950" />
                    Start Game ({totalQuestions} Rounds)
                  </button>

                  <button
                    onClick={() => {
                      soundFX.playJoinPop();
                      dispatchRoomAction("simulate_players", { count: 40 });
                    }}
                    className="px-4 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs border border-slate-700 transition flex items-center gap-2"
                    title="Populate simulated Falcon staff across Lekki HQ, Ikorodu LDC, Port Harcourt, and Lekki Free Trade Zone"
                  >
                    <Bot className="w-4 h-4" />
                    Simulate Demo Staff
                  </button>

                  <button
                    onClick={() => setStudioOpen(true)}
                    className="px-4 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition flex items-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" />
                    Customize Deck &amp; Locations
                  </button>

                  {playersList.length > 0 && (
                    <button
                      onClick={() => dispatchRoomAction("reset_room")}
                      className="px-3.5 py-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/25 transition flex items-center gap-1.5"
                      title="Clear players & scores"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code Card */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={joinUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div>
                  <div className="text-sm font-black text-white">
                    Scan to Join on Smartphone
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Works across Lekki HQ, Ikorodu LDC, Port Harcourt &amp;
                    Lekki Free Trade Zone
                  </p>
                </div>
                <div className="w-full pt-2 border-t border-slate-800 flex items-center justify-around text-xs">
                  <div>
                    <div className="text-slate-400">Connected Staff</div>
                    <div className="text-xl font-black text-emerald-400">
                      {playersList.length}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div>
                    <div className="text-slate-400">Active Locations</div>
                    <div className="text-xl font-black text-sky-400">
                      {room.locations.length} Sites
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Falcon Locations Live Attendance Cards (Clean without expected headcount numbers) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  Falcon Corporation Locations
                </h2>
                <span className="text-xs text-slate-400">
                  {playersList.length} joined in lobby
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {room.locations.map((loc) => {
                  const locPlayers = playersList.filter(
                    (p) => p.locationId === loc.id
                  );
                  return (
                    <div
                      key={loc.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-white text-sm flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: loc.color }}
                          />
                          {loc.shortName}
                        </span>
                        {locPlayers.length > 0 && (
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${loc.color}20`,
                              color: loc.color,
                            }}
                          >
                            {locPlayers.length} joined
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {loc.subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Joined Staff Roster */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Joined Falcon Staff &amp; Squad Assignments (
                  {playersList.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {room.squads.map((sq) => {
                    const count = playersList.filter(
                      (p) => p.squadId === sq.id
                    ).length;
                    return (
                      <span
                        key={sq.id}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300"
                      >
                        {sq.icon} {sq.name}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>

              {playersList.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="text-slate-400 text-sm">
                    Waiting for participants to scan the QR code or enter PIN{" "}
                    <strong className="text-white">{room.pin}</strong>...
                  </div>
                  <p className="text-xs text-slate-500">
                    Tip: Click &ldquo;Simulate Demo Staff&rdquo; above to
                    preview a live multi-location game!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {playersList.slice(0, 200).map((player) => {
                    const loc = room.locations.find(
                      (l) => l.id === player.locationId
                    );
                    const sq = room.squads.find((s) => s.id === player.squadId);
                    return (
                      <div
                        key={player.id}
                        className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center gap-2 min-w-0"
                      >
                        <span className="text-lg shrink-0">
                          {player.avatar}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {player.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: loc?.color || "#38bdf8",
                              }}
                            />
                            <span>{loc?.shortName}</span>
                            <span>•</span>
                            <span>{sq?.icon}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== PHASE 2: TEAM TALK HUDDLE ==================== */}
        {room.status === "team_talk" && currentQuestion && (
          <div className="my-auto bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border-2 border-amber-400/50 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-widest">
              <MessageSquare className="w-4 h-4" />
              Team Talk Huddle — Round {room.currentQuestionIndex + 1} of{" "}
              {totalQuestions}
            </div>

            {currentQuestion.rebusClue && (
              <div className="max-w-lg mx-auto px-8 py-6 rounded-3xl bg-slate-950/95 border-2 border-amber-400/60 shadow-2xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">
                  🧩 Rebus Visual Clue
                </div>
                <pre className="font-mono text-2xl sm:text-4xl font-black text-white whitespace-pre-wrap leading-snug tracking-wider">
                  {currentQuestion.rebusClue}
                </pre>
              </div>
            )}

            <h2 className="text-3xl sm:text-5xl font-black text-white max-w-4xl mx-auto leading-tight">
              {currentQuestion.prompt}
            </h2>

            <p className="text-base text-amber-200/90 max-w-2xl mx-auto">
              Confer with your{" "}
              <strong className="text-white">Falcon Squad</strong> and{" "}
              <strong className="text-white">Location Teammates</strong> now!
              Answer buttons unlock on your devices in:
            </p>

            <div className="w-28 h-28 rounded-3xl bg-amber-400 text-slate-950 font-black text-5xl flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30 animate-bounce">
              {remainingSec}s
            </div>

            <div className="pt-4">
              <button
                onClick={() => dispatchRoomAction("open_question_answers")}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
              >
                Skip Team Talk &amp; Unlock Answers Now →
              </button>
            </div>
          </div>
        )}

        {/* ==================== PHASE 3: ACTIVE QUESTION ==================== */}
        {room.status === "question" && currentQuestion && (
          <div className="space-y-6 my-auto">
            {/* Top Question Meta & Timer */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-black">
                    Round {room.currentQuestionIndex + 1} / {totalQuestions}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold">
                    {currentQuestion.rebusClue
                      ? "🧩 Rebus Puzzle Challenge"
                      : currentQuestion.mode === "speed_trivia"
                      ? "⚡ Speed Trivia"
                      : currentQuestion.mode === "majority_wins"
                      ? "🔥 Majority Wins (+750 pts)"
                      : "📊 Live Icebreaker Poll (+300 pts)"}
                  </span>
                  {currentQuestion.pointsMultiplier === 2 && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black animate-pulse">
                      2x DOUBLE ENERGY POINTS
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => dispatchRoomAction("reveal_question")}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                  >
                    Reveal Results Now
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-center">
                {/* Countdown Ring */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center">
                  <div
                    className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center font-black border-4 shadow-xl ${
                      remainingSec <= 5
                        ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                        : "bg-slate-950 border-sky-400 text-white"
                    }`}
                  >
                    <span className="text-4xl leading-none">
                      {remainingSec}
                    </span>
                    <span className="text-[10px] uppercase text-slate-400 mt-1">
                      sec left
                    </span>
                  </div>
                </div>

                {/* Question Prompt + Optional Rebus Visual Box */}
                <div className="lg:col-span-7 text-center lg:text-left space-y-4">
                  {currentQuestion.rebusClue && (
                    <div className="inline-block px-7 py-5 rounded-2xl bg-slate-950 border-2 border-amber-400/60 shadow-xl">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1.5">
                        🧩 Decode This Rebus Box
                      </div>
                      <pre className="font-mono text-2xl sm:text-3xl font-black text-white whitespace-pre-wrap leading-snug tracking-wider text-center">
                        {currentQuestion.rebusClue}
                      </pre>
                    </div>
                  )}

                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                    {currentQuestion.prompt}
                  </h2>
                  {currentQuestion.subtitle && (
                    <p className="text-sm text-slate-400">
                      {currentQuestion.subtitle}
                    </p>
                  )}
                </div>

                {/* Live Answer Counter */}
                <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
                  <div className="text-xs font-bold uppercase text-slate-400">
                    Locked-In Responses
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {answeredCount}{" "}
                    <span className="text-base text-slate-500">
                      / {playersList.length}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{
                        width: `${
                          playersList.length > 0
                            ? Math.round(
                                (answeredCount / playersList.length) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Per-Location Live Response Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
                {room.locations.map((loc) => {
                  const locPlayers = playersList.filter(
                    (p) => p.locationId === loc.id
                  );
                  const locAnswered = locPlayers.filter(
                    (p) => p.answers[currentQuestion.id] !== undefined
                  ).length;
                  return (
                    <div
                      key={loc.id}
                      className="px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: loc.color }}
                        />
                        {loc.shortName}
                      </span>
                      <span className="font-black text-white">
                        {locAnswered}/{locPlayers.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Geometric Option Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, idx) => {
                const style = OPTION_STYLES[idx % 4];
                return (
                  <div
                    key={opt.id}
                    className={`${style.bg} border-2 ${style.border} rounded-3xl p-6 sm:p-7 flex items-center gap-5 shadow-xl`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-black/25 flex items-center justify-center text-white shrink-0">
                      <AnswerShapeIcon
                        optionId={opt.id}
                        className="w-8 h-8"
                      />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white leading-snug">
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== PHASE 4: REVEAL & 4-LOCATION BREAKDOWN ==================== */}
        {room.status === "reveal" && currentQuestion && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                    Round {room.currentQuestionIndex + 1} Results Breakdown
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {currentQuestion.prompt}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() =>
                      dispatchRoomAction("set_phase", { status: "leaderboard" })
                    }
                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Show 4-Location &amp; Squad Standings
                  </button>

                  {!isLastQuestion ? (
                    <button
                      onClick={() => {
                        soundFX.playTeamTalkChime();
                        dispatchRoomAction("start_question", {
                          questionIndex: room.currentQuestionIndex + 1,
                        });
                      }}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-sky-500/25 transition flex items-center gap-1.5"
                    >
                      Next Round ({room.currentQuestionIndex + 2}/
                      {totalQuestions})
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        dispatchRoomAction("set_phase", { status: "podium" })
                      }
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      Crown Final Champions Podium!
                    </button>
                  )}
                </div>
              </div>

              {/* Option Histogram Cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                {optionBreakdown.map(({ option, count, percent }, idx) => {
                  const style = OPTION_STYLES[idx % 4];
                  const winner = isWinningOption(option.id);
                  return (
                    <div
                      key={option.id}
                      className={`p-5 rounded-2xl border-2 transition relative overflow-hidden ${
                        winner
                          ? "bg-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/15"
                          : "bg-slate-950/60 border-slate-800 opacity-65"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center text-white shrink-0`}
                          >
                            <AnswerShapeIcon
                              optionId={option.id}
                              className="w-5 h-5"
                            />
                          </div>
                          <span className="font-black text-white text-base sm:text-lg">
                            {option.text}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-white">
                            {count}{" "}
                            <span className="text-xs text-slate-400">
                              ({percent}%)
                            </span>
                          </div>
                          {winner && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {currentQuestion.mode === "speed_trivia"
                                ? "Correct Answer"
                                : currentQuestion.mode === "majority_wins"
                                ? "Majority Winner!"
                                : "Pulse Choice"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(4, percent)}%`,
                            backgroundColor: style.hex,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fun Fact / Insight */}
              {currentQuestion.funFact && (
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-sky-100">
                    <strong className="text-sky-300">Falcon Insight: </strong>
                    {currentQuestion.funFact}
                  </div>
                </div>
              )}

              {/* How Each of the 4 Falcon Locations Voted */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  How Each Falcon Location Responded This Round
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {room.locations.map((loc) => {
                    const locPlayers = playersList.filter(
                      (p) =>
                        p.locationId === loc.id &&
                        p.answers[currentQuestion.id] !== undefined
                    );
                    const locCorrect = locPlayers.filter(
                      (p) => p.answers[currentQuestion.id]?.isCorrect
                    ).length;
                    const rate =
                      locPlayers.length > 0
                        ? Math.round((locCorrect / locPlayers.length) * 100)
                        : 0;
                    return (
                      <div
                        key={loc.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: loc.color }}
                            />
                            {loc.shortName}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {locCorrect}/{locPlayers.length} scored
                          </div>
                        </div>
                        <div className="text-lg font-black text-emerald-400">
                          {rate}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PHASE 5: MID-GAME LEADERBOARD ==================== */}
        {room.status === "leaderboard" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-sky-400">
                  Live Standings After Round {room.currentQuestionIndex + 1} of{" "}
                  {totalQuestions}
                </span>
                <h2 className="text-xl font-black text-white">
                  4-Location Cup, Falcon Squads &amp; Individual Standings
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {!isLastQuestion ? (
                  <button
                    onClick={() => {
                      soundFX.playTeamTalkChime();
                      dispatchRoomAction("start_question", {
                        questionIndex: room.currentQuestionIndex + 1,
                      });
                    }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black text-sm flex items-center gap-2"
                  >
                    Start Round {room.currentQuestionIndex + 2}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      dispatchRoomAction("set_phase", { status: "podium" })
                    }
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    Final Championship Podium
                  </button>
                )}
              </div>
            </div>

            <TripleLeaderboard room={room} />
          </div>
        )}

        {/* ==================== PHASE 6: TOWN HALL RAFFLE ==================== */}
        {room.status === "raffle" && (
          <TownHallRaffleStage
            room={room}
            onDrawWinner={(opts) => dispatchRoomAction("draw_raffle", opts)}
          />
        )}

        {/* ==================== PHASE 7: CHAMPIONSHIP PODIUM ==================== */}
        {room.status === "podium" && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-slate-900 via-[#0b1f40] to-slate-950 border-2 border-amber-400/50 rounded-3xl p-6 sm:p-10 text-center space-y-8 shadow-2xl">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-widest">
                  <Trophy className="w-4 h-4" />
                  Falcon Corporation Official Podium
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-white">
                  {room.title} — Champions!
                </h1>
              </div>

              {/* Champion Location + Champion Squad Banners */}
              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {(() => {
                  const topLoc = computeLocationStandings(room, "average")[0];
                  if (!topLoc) return null;
                  return (
                    <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-sky-400/50 text-left flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-sky-400">
                          🏆 Winning Falcon Location Cup
                        </div>
                        <div className="text-2xl font-black text-white mt-1">
                          {topLoc.location.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {topLoc.averageScore.toLocaleString()} avg pts/staff •{" "}
                          {topLoc.playerCount} staff • MVP:{" "}
                          {topLoc.topPlayerName || "N/A"}
                        </div>
                      </div>
                      <Building2 className="w-10 h-10 text-sky-400 shrink-0" />
                    </div>
                  );
                })()}

                {(() => {
                  const topSq = computeSquadStandings(room, "average")[0];
                  if (!topSq) return null;
                  return (
                    <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-amber-400/50 text-left flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-amber-400">
                          🛡️ Winning Falcon Squad
                        </div>
                        <div className="text-2xl font-black text-white mt-1">
                          {topSq.squad.icon} {topSq.squad.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {topSq.averageScore.toLocaleString()} avg pts •{" "}
                          {topSq.playerCount} squad members
                        </div>
                      </div>
                      <Zap className="w-10 h-10 text-amber-400 shrink-0" />
                    </div>
                  );
                })()}
              </div>

              {/* Top 3 Individual Podium Columns */}
              {(() => {
                const top3 = computeIndividualStandings(room).slice(0, 3);
                if (top3.length === 0) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto items-end pt-4">
                    {/* 2nd Place */}
                    {top3[1] && (
                      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-700 space-y-2 order-2 sm:order-1">
                        <div className="text-2xl">🥈</div>
                        <div className="text-2xl">{top3[1].avatar}</div>
                        <div className="font-black text-white text-lg truncate">
                          {top3[1].name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {
                            room.locations.find(
                              (l) => l.id === top3[1].locationId
                            )?.shortName
                          }
                        </div>
                        <div className="text-xl font-black text-slate-200">
                          {top3[1].score.toLocaleString()} pts
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {top3[0] && (
                      <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/25 to-slate-950 border-2 border-amber-400 space-y-2 order-1 sm:order-2 sm:-translate-y-4 shadow-2xl shadow-amber-500/20">
                        <div className="text-3xl">👑 🥇</div>
                        <div className="text-3xl">{top3[0].avatar}</div>
                        <div className="font-black text-white text-xl truncate">
                          {top3[0].name}
                        </div>
                        <div className="text-xs text-amber-300 font-bold">
                          {
                            room.locations.find(
                              (l) => l.id === top3[0].locationId
                            )?.shortName
                          }{" "}
                          • {top3[0].department}
                        </div>
                        <div className="text-2xl font-black text-amber-300">
                          {top3[0].score.toLocaleString()} pts
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {top3[2] && (
                      <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-800/60 space-y-2 order-3">
                        <div className="text-2xl">🥉</div>
                        <div className="text-2xl">{top3[2].avatar}</div>
                        <div className="font-black text-white text-lg truncate">
                          {top3[2].name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {
                            room.locations.find(
                              (l) => l.id === top3[2].locationId
                            )?.shortName
                          }
                        </div>
                        <div className="text-xl font-black text-amber-400">
                          {top3[2].score.toLocaleString()} pts
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() =>
                    dispatchRoomAction("set_phase", { status: "raffle" })
                  }
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  Launch Town Hall Lucky Draw
                </button>
                <button
                  onClick={() =>
                    dispatchRoomAction("start_question", { questionIndex: 0 })
                  }
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Replay Rounds
                </button>
              </div>
            </div>

            <TripleLeaderboard room={room} />
          </div>
        )}
      </main>

      {studioOpen && (
        <GameStudioModal
          room={room}
          onClose={() => setStudioOpen(false)}
          onSave={async (payload) => {
            await dispatchRoomAction("update_settings", payload);
          }}
        />
      )}
    </div>
  );
}
