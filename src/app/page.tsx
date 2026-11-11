"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Flame,
  Gift,
  Play,
  Radio,
  Smartphone,
  Sparkles,
  Tv,
  Zap,
} from "lucide-react";
import { FalconLogo } from "@/components/FalconLogo";
import {
  DEFAULT_FALCON_LOCATIONS,
  DEFAULT_FALCON_SQUADS,
  PREBUILT_GAME_DECKS,
} from "@/lib/falcon-data";
import { generatePin } from "@/lib/game-engine";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [joinPin, setJoinPin] = useState("199400");
  const [selectedDeckId, setSelectedDeckId] = useState(
    PREBUILT_GAME_DECKS[0].id
  );
  const [teamTalkEnabled, setTeamTalkEnabled] = useState(true);
  const [personalModeEnabled, setPersonalModeEnabled] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinPin.replace(/\D/g, "").slice(0, 6);
    if (!cleaned) return;
    router.push(`/play/${cleaned}`);
  };

  const handleCreateRoom = async (customPin?: string) => {
    setCreatingRoom(true);
    const pin = customPin || generatePin();
    const deck =
      PREBUILT_GAME_DECKS.find((d) => d.id === selectedDeckId) ||
      PREBUILT_GAME_DECKS[0];
    try {
      await fetch(`/api/rooms/${pin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_room",
          deckId: deck.id,
          title: deck.title,
          teamTalkEnabled,
          defaultTeamTalkSec: 6,
          personalModeEnabled,
          allowPlayerSquadChoice: true,
        }),
      });
      router.push(`/host/${pin}`);
    } catch {
      router.push(`/host/${pin}`);
    } finally {
      setCreatingRoom(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050c1a] relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <FalconLogo />

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              {isSupabaseConfigured
                ? "Realtime Sync Connected"
                : "Live Hybrid Engine Ready"}
            </div>
            <button
              onClick={() => router.push("/host/199400")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              Open Demo Host (#199400)
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-14">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Brand Value + Join as Player */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Falcon Corporation Interactive Team Engagement Platform
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]">
              One Arena.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-400">
                4 Falcon Locations.
              </span>{" "}
              One Connected Team.
            </h1>

            <p className="text-base text-slate-300 leading-relaxed">
              Bring{" "}
              <strong className="text-white">Lekki HQ</strong>,{" "}
              <strong className="text-white">Ikorodu LDC</strong>,{" "}
              <strong className="text-white">Port Harcourt (Rumuolumeni)</strong>
              , and <strong className="text-white">Lekki Free Trade Zone</strong>{" "}
              together in real time with{" "}
              <span className="text-sky-300 font-semibold">
                Speed Trivia, Visual Rebus Puzzles &amp; Team Talk
              </span>{" "}
              alongside{" "}
              <span className="text-amber-300 font-semibold">
                Majority Wins, Live Polls &amp; Town Hall Lucky Draws
              </span>
              .
            </p>

            {/* Player Join Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-sky-500/40 shadow-2xl shadow-sky-500/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg font-black text-white">
                    Join a Live Game as Staff / Player
                  </h2>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Instant Browser Play
                </span>
              </div>

              <form
                onSubmit={handleJoinSubmit}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value)}
                  placeholder="Enter 6-digit Game PIN"
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white font-black text-xl tracking-[0.22em] text-center focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-base shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 shrink-0"
                >
                  Join Game
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                <span>
                  Try instant demo room PIN:{" "}
                  <button
                    type="button"
                    onClick={() => setJoinPin("199400")}
                    className="text-sky-400 font-bold underline"
                  >
                    199400
                  </button>
                </span>
                <span>Works on any phone, tablet, or laptop browser</span>
              </div>
            </div>

            {/* 4 Falcon Locations Strip (Clean without staff headcount numbers) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DEFAULT_FALCON_LOCATIONS.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: loc.color }}
                    />
                    <div className="font-extrabold text-white text-xs truncate">
                      {loc.shortName}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {loc.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Host & Launch Game Studio */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  Host &amp; Presenter Console
                </span>
                <h2 className="text-2xl font-black text-white">
                  Launch a Falcon Arena Session
                </h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Tv className="w-6 h-6" />
              </div>
            </div>

            {/* Select Game Pack */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Choose a Falcon Game Arena (Editable in Room)
              </label>
              <div className="space-y-2.5">
                {PREBUILT_GAME_DECKS.map((deck) => {
                  const selected = deck.id === selectedDeckId;
                  return (
                    <div
                      key={deck.id}
                      onClick={() => setSelectedDeckId(deck.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition ${
                        selected
                          ? "bg-sky-500/10 border-sky-400 shadow-lg shadow-sky-500/10"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-extrabold text-white text-sm">
                          {deck.title}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700 shrink-0">
                          {deck.questions.length} Rounds • ~
                          {deck.estimatedMinutes}m
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {deck.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gameplay Toggles */}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teamTalkEnabled}
                  onChange={(e) => setTeamTalkEnabled(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-sky-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    &ldquo;Team Talk&rdquo; Huddle Timer
                  </div>
                  <div className="text-[11px] text-slate-400">
                    6s squad huddle before answer buttons unlock
                  </div>
                </div>
              </label>

              <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={personalModeEnabled}
                  onChange={(e) => setPersonalModeEnabled(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-sky-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Mobile &ldquo;Personal Mode&rdquo;
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Show questions + options on every staff phone
                  </div>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => handleCreateRoom()}
                disabled={creatingRoom}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                {creatingRoom
                  ? "Launching Host Stage..."
                  : "Launch New Live Room"}
              </button>

              <button
                onClick={() => handleCreateRoom("199400")}
                disabled={creatingRoom}
                className="py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                Host Room #199400
              </button>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="space-y-5 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                Platform Capabilities
              </span>
              <h2 className="text-2xl font-black text-white">
                Built for Falcon Corporation Town Halls, HSE &amp; Team Bonding
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_FALCON_SQUADS.map((sq) => (
                <span
                  key={sq.id}
                  className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300"
                >
                  {sq.icon} {sq.name}
                </span>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">
                Speed Trivia &amp; Rebus Puzzles
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Millisecond reaction scoring up to 1,000 pts per round, visual
                Rebus wordplay riddles, 2x Double Energy rounds, and answer
                streak multipliers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">
                Majority Wins &amp; Live Polls
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Not every round needs a textbook answer—vote on workplace
                icebreakers and win +750 points when your choice matches the
                Falcon room majority!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">
                4-Location Cup + Squads
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live normalized scoring pits Lekki HQ, Ikorodu LDC, Port
                Harcourt, and Lekki Free Trade Zone head-to-head while
                cross-location Squads confer during &ldquo;Team Talk&rdquo;.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">
                Town Hall Lucky Draw
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Spin the live slot drum to draw lucky winners from all joined
                staff or isolate a specific Falcon location for regional prizes.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
