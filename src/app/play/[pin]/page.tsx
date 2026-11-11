"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Flame,
  Gift,
  MessageSquare,
  Shield,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { AnswerShapeIcon, OPTION_STYLES } from "@/components/AnswerShapeIcon";
import { FalconLogo } from "@/components/FalconLogo";
import { TripleLeaderboard } from "@/components/TripleLeaderboard";
import { FALCON_DEPARTMENTS, PLAYER_AVATARS } from "@/lib/falcon-data";
import {
  computeIndividualStandings,
  computeLocationStandings,
} from "@/lib/game-engine";
import { soundFX } from "@/lib/sound-fx";
import { PlayerState } from "@/lib/types";
import { useRoomSync } from "@/lib/use-room-sync";

export default function PlayerControllerPage() {
  const params = useParams<{ pin: string }>();
  const router = useRouter();
  const pin = params?.pin || "199400";

  const { room, loading, error, dispatchRoomAction } = useRoomSync(pin);

  const [playerId, setPlayerId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("lekki-hq");
  const [department, setDepartment] = useState<string>(FALCON_DEPARTMENTS[0]);
  const [squadId, setSquadId] = useState<string>("delta-flames");
  const [avatar, setAvatar] = useState<string>(PLAYER_AVATARS[0]);
  const [joining, setJoining] = useState<boolean>(false);
  const [submittingOption, setSubmittingOption] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  // Restore saved player session for this room PIN
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedRaw = window.localStorage.getItem(`falcon-player-${pin}`);
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (parsed.playerId) setPlayerId(parsed.playerId);
        if (parsed.name) setName(parsed.name);
        if (parsed.locationId) setLocationId(parsed.locationId);
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.squadId) setSquadId(parsed.squadId);
        if (parsed.avatar) setAvatar(parsed.avatar);
      } catch {
        // Ignore malformed local state
      }
    }
  }, [pin]);

  const activePlayer: PlayerState | null = useMemo(() => {
    if (!room || !playerId) return null;
    return room.players[playerId] || null;
  }, [room, playerId]);

  const currentQuestion = useMemo(() => {
    if (!room) return null;
    return room.questions[room.currentQuestionIndex] || null;
  }, [room]);

  // Countdown sync on player controller
  useEffect(() => {
    if (
      !room ||
      (room.status !== "team_talk" && room.status !== "question")
    ) {
      setRemainingSec(0);
      return;
    }
    const tick = () => {
      const sec = Math.max(0, Math.ceil((room.phaseEndsAt - Date.now()) / 1000));
      setRemainingSec(sec);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room]);

  // Reset local submitting state when question changes
  useEffect(() => {
    setSubmittingOption(null);
  }, [currentQuestion?.id, room?.status]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !name.trim()) return;
    setJoining(true);

    const newId =
      playerId ||
      `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Auto-balance squad if host disabled manual squad choice
    let assignedSquadId = squadId;
    if (!room.allowPlayerSquadChoice && room.squads.length > 0) {
      const countBySquad = room.squads.map((sq) => ({
        id: sq.id,
        count: Object.values(room.players).filter((p) => p.squadId === sq.id)
          .length,
      }));
      countBySquad.sort((a, b) => a.count - b.count);
      assignedSquadId = countBySquad[0].id;
    }

    const newPlayer: PlayerState = {
      id: newId,
      name: name.trim(),
      department,
      locationId,
      squadId: assignedSquadId,
      avatar,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      answeredCount: 0,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      answers: {},
    };

    await dispatchRoomAction("join_player", { player: newPlayer });
    soundFX.playJoinPop();
    setPlayerId(newId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `falcon-player-${pin}`,
        JSON.stringify({
          playerId: newId,
          name: newPlayer.name,
          locationId: newPlayer.locationId,
          department: newPlayer.department,
          squadId: newPlayer.squadId,
          avatar: newPlayer.avatar,
        })
      );
    }
    setJoining(false);
  };

  const handleSelectOption = async (optionId: number) => {
    if (!room || !activePlayer || !currentQuestion) return;
    if (room.status !== "question") return;
    if (
      activePlayer.answers[currentQuestion.id] ||
      submittingOption !== null
    ) {
      return;
    }
    setSubmittingOption(optionId);
    soundFX.playLockIn();
    await dispatchRoomAction("submit_answer", {
      playerId: activePlayer.id,
      optionId,
    });
  };

  if (loading && !room) {
    return (
      <div className="min-h-screen bg-[#050c1a] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl border-2 border-sky-400 border-t-transparent animate-spin mx-auto" />
          <div className="text-sm font-bold text-white">
            Connecting to Falcon Arena Room #{pin}...
          </div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#050c1a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <div className="text-xl font-black text-white">
            Room #{pin} Not Found
          </div>
          <p className="text-xs text-slate-400">
            Please verify the 6-digit Game PIN on the presenter screen.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl bg-sky-500 text-slate-950 font-black text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ==================== ONBOARDING / JOIN FORM ====================
  if (!activePlayer) {
    return (
      <div className="min-h-screen bg-[#050c1a] flex flex-col justify-between p-4 sm:p-6">
        <div className="max-w-lg w-full mx-auto my-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <FalconLogo size="sm" showTagline={false} />
            <span className="px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 font-black text-xs">
              PIN: {room.pin}
            </span>
          </div>

          <div>
            <h1 className="text-xl font-black text-white">{room.title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your Falcon Corporation location and squad to represent
              your site!
            </p>
          </div>

          <form onSubmit={handleJoinGame} className="space-y-4">
            {/* Name & Avatar */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Name / Nickname
              </label>
              <input
                type="text"
                required
                maxLength={28}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Stephen I."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Choose Your Badge Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_AVATARS.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setAvatar(icon)}
                    className={`py-2 rounded-xl text-xl border transition ${
                      avatar === icon
                        ? "bg-sky-500/20 border-sky-400 scale-105"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Falcon Locations Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Falcon Corporation Location (4 Sites)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {room.locations.map((loc) => {
                  const selected = locationId === loc.id;
                  return (
                    <button
                      type="button"
                      key={loc.id}
                      onClick={() => setLocationId(loc.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selected
                          ? "bg-sky-500/15 border-sky-400 shadow-md"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-xs text-white">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: loc.color }}
                        />
                        <span className="truncate">{loc.shortName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {loc.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Department / Directorate
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-sky-400"
              >
                {FALCON_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Squad Choice */}
            {room.allowPlayerSquadChoice && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Your Falcon Squad (Team Mode)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {room.squads.map((sq) => {
                    const selected = squadId === sq.id;
                    return (
                      <button
                        type="button"
                        key={sq.id}
                        onClick={() => setSquadId(sq.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                          selected
                            ? "bg-amber-500/15 border-amber-400"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-lg">{sq.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {sq.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={joining || !name.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-base shadow-xl shadow-sky-500/20 transition"
            >
              {joining ? "Entering Falcon Arena..." : "Enter Falcon Arena →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE PLAYER CONTROLLER ====================
  const individualStandings = computeIndividualStandings(room);
  const myRank =
    individualStandings.findIndex((p) => p.id === activePlayer.id) + 1;
  const myLocation = room.locations.find(
    (l) => l.id === activePlayer.locationId
  );
  const mySquad = room.squads.find((s) => s.id === activePlayer.squadId);
  const myAnswerForCurrent = currentQuestion
    ? activePlayer.answers[currentQuestion.id]
    : undefined;
  const myRaffleWin = room.raffleHistory.find(
    (r) => r.playerId === activePlayer.id
  );

  return (
    <div className="min-h-screen bg-[#050c1a] flex flex-col justify-between">
      {/* Sticky Player HUD Header */}
      <header className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">{activePlayer.avatar}</span>
            <div className="min-w-0">
              <div className="font-black text-white text-sm truncate flex items-center gap-1.5">
                {activePlayer.name}
                {activePlayer.streak >= 2 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                    <Flame className="w-3 h-3 fill-orange-400" />
                    {activePlayer.streak}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: myLocation?.color || "#38bdf8" }}
                />
                <span>{myLocation?.shortName}</span>
                <span>•</span>
                <span>
                  {mySquad?.icon} {mySquad?.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">
                Rank #{myRank || "-"}
              </div>
              <div className="text-sm font-black text-sky-400">
                {activePlayer.score.toLocaleString()} pts
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Mobile Controller Body */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center gap-4">
        {/* Lucky Draw Winner Alert Banner if this player won! */}
        {myRaffleWin && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 border-2 border-amber-400 text-center space-y-1 animate-bounce">
            <div className="text-xs font-black uppercase text-amber-300 flex items-center justify-center gap-1">
              <Gift className="w-4 h-4" />
              Lucky Draw Winner!
            </div>
            <div className="text-base font-black text-white">
              🎉 You won: {myRaffleWin.prizeTitle}!
            </div>
          </div>
        )}

        {/* 1. LOBBY STATE */}
        {room.status === "lobby" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-3xl mx-auto">
              {activePlayer.avatar}
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                ✓ Checked In &amp; Ready
              </span>
              <h2 className="text-2xl font-black text-white pt-2">
                You&apos;re in, {activePlayer.name}!
              </h2>
              <p className="text-xs text-slate-400">
                Eyes on the main screen or stay right here—questions will appear
                automatically when the Host starts Round 1.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-sky-400" />
                  Your Location Team
                </div>
                <div className="text-sm font-black text-white mt-1">
                  {myLocation?.shortName}
                </div>
                <div className="text-[11px] text-slate-400">
                  {
                    Object.values(room.players).filter(
                      (p) => p.locationId === activePlayer.locationId
                    ).length
                  }{" "}
                  colleagues joined
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-400" />
                  Your Falcon Squad
                </div>
                <div className="text-sm font-black text-white mt-1">
                  {mySquad?.icon} {mySquad?.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {
                    Object.values(room.players).filter(
                      (p) => p.squadId === activePlayer.squadId
                    ).length
                  }{" "}
                  squad members
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TEAM TALK HUDDLE STATE */}
        {room.status === "team_talk" && currentQuestion && (
          <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-400/50 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase">
              <MessageSquare className="w-3.5 h-3.5" />
              Team Talk Huddle ({remainingSec}s)
            </div>
            {currentQuestion.rebusClue && (
              <div className="px-5 py-4 rounded-2xl bg-slate-950 border-2 border-amber-400/60">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                  🧩 Rebus Clue
                </div>
                <pre className="font-mono text-xl font-black text-white whitespace-pre-wrap leading-snug">
                  {currentQuestion.rebusClue}
                </pre>
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {currentQuestion.prompt}
            </h2>
            <p className="text-xs text-amber-200/90">
              Discuss with your{" "}
              <strong className="text-white">{mySquad?.name}</strong> squad or{" "}
              <strong className="text-white">{myLocation?.shortName}</strong>{" "}
              colleagues! Tap buttons unlock in {remainingSec} seconds...
            </p>
          </div>
        )}

        {/* 3. ACTIVE QUESTION STATE */}
        {room.status === "question" && currentQuestion && (
          <div className="space-y-4">
            {/* Personal Mode: Question header on phone */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-400">
                  Round {room.currentQuestionIndex + 1} of{" "}
                  {room.questions.length}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-black ${
                    remainingSec <= 5
                      ? "bg-rose-500/20 text-rose-300 animate-pulse"
                      : "bg-slate-800 text-white"
                  }`}
                >
                  ⏱️ {remainingSec}s
                </span>
              </div>
              {room.personalModeEnabled && currentQuestion.rebusClue && (
                <div className="px-4 py-3 rounded-xl bg-slate-950 border border-amber-400/50 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                    🧩 Decode Rebus Clue
                  </div>
                  <pre className="font-mono text-lg sm:text-xl font-black text-white whitespace-pre-wrap leading-snug">
                    {currentQuestion.rebusClue}
                  </pre>
                </div>
              )}
              {room.personalModeEnabled && (
                <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                  {currentQuestion.prompt}
                </h2>
              )}
            </div>

            {/* If already locked in, show locked confirmation */}
            {myAnswerForCurrent ? (
              <div className="bg-slate-900 border-2 border-sky-500/40 rounded-3xl p-8 text-center space-y-3 shadow-xl">
                <CheckCircle2 className="w-12 h-12 text-sky-400 mx-auto" />
                <div className="text-xl font-black text-white">
                  Answer Locked In!
                </div>
                <p className="text-xs text-slate-400">
                  Submitted in{" "}
                  {(myAnswerForCurrent.responseTimeMs / 1000).toFixed(1)}s.
                  Waiting for reveal across all 4 Falcon locations...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentQuestion.options.map((opt, idx) => {
                  const style = OPTION_STYLES[idx % 4];
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={submittingOption !== null}
                      className={`${style.bg} border-2 ${style.border} rounded-3xl p-5 sm:p-6 flex items-center gap-4 text-left shadow-xl active:scale-95 transition`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-black/25 flex items-center justify-center text-white shrink-0">
                        <AnswerShapeIcon
                          optionId={opt.id}
                          className="w-7 h-7"
                        />
                      </div>
                      <span className="text-base sm:text-lg font-black text-white leading-snug">
                        {room.personalModeEnabled
                          ? opt.text
                          : `Option ${idx + 1} (${style.name})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. REVEAL STATE */}
        {room.status === "reveal" && currentQuestion && (
          <div className="space-y-4">
            {myAnswerForCurrent ? (
              <div
                className={`rounded-3xl p-6 text-center space-y-3 border-2 shadow-2xl ${
                  myAnswerForCurrent.isCorrect
                    ? "bg-emerald-950/50 border-emerald-400"
                    : "bg-rose-950/40 border-rose-500/50"
                }`}
              >
                {myAnswerForCurrent.isCorrect ? (
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                ) : (
                  <XCircle className="w-14 h-14 text-rose-400 mx-auto" />
                )}

                <h2 className="text-2xl font-black text-white">
                  {myAnswerForCurrent.isCorrect
                    ? currentQuestion.mode === "majority_wins"
                      ? "🔥 You Matched the Falcon Majority!"
                      : currentQuestion.mode === "icebreaker_poll"
                      ? "📊 Pulse Vote Recorded!"
                      : "⚡ Spot On! Correct Answer!"
                    : currentQuestion.mode === "majority_wins"
                    ? "Close! Another Option Won the Majority"
                    : "Not Quite This Time!"}
                </h2>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-lg font-black text-amber-300">
                  +{myAnswerForCurrent.pointsAwarded.toLocaleString()} pts
                </div>

                {currentQuestion.funFact && (
                  <p className="text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                    <Sparkles className="w-3.5 h-3.5 inline text-sky-400 mr-1" />
                    {currentQuestion.funFact}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-2">
                <div className="text-lg font-black text-amber-300">
                  Time Expired for Round {room.currentQuestionIndex + 1}
                </div>
                <p className="text-xs text-slate-400">
                  Get ready for the next round!
                </p>
              </div>
            )}

            {/* Quick Location Cup Summary on Phone */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-extrabold uppercase text-slate-400 flex items-center justify-between">
                <span>Live 4-Location Cup Standings</span>
                <span className="text-sky-400">Your Rank: #{myRank}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {computeLocationStandings(room, "average").map((locItem, i) => (
                  <div
                    key={locItem.location.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      locItem.location.id === activePlayer.locationId
                        ? "bg-sky-500/15 border-sky-400/50"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <span className="font-bold text-white truncate">
                      #{i + 1} {locItem.location.shortName}
                    </span>
                    <span className="font-black text-sky-300">
                      {locItem.averageScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. LEADERBOARD / PODIUM / RAFFLE STATES */}
        {(room.status === "leaderboard" ||
          room.status === "podium" ||
          room.status === "raffle") && (
          <div className="space-y-4">
            {room.status === "podium" && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-400/40 text-center space-y-1">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-lg font-black text-white">
                  Final Standings — You Finished #{myRank}!
                </div>
                <div className="text-xs text-slate-300">
                  Total Score: {activePlayer.score.toLocaleString()} pts • Best
                  Streak: {activePlayer.bestStreak}
                </div>
              </div>
            )}

            <TripleLeaderboard room={room} compact />
          </div>
        )}
      </main>
    </div>
  );
}
