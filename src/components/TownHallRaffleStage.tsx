"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { Gift, Sparkles, Trophy, MapPin, CheckCircle2 } from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { GameRoomState, RaffleWinnerRecord } from "@/lib/types";

export function TownHallRaffleStage({
  room,
  onDrawWinner,
}: {
  room: GameRoomState;
  onDrawWinner: (params: {
    locationFilterId: string;
    excludePreviousWinners: boolean;
    prizeTitle: string;
  }) => Promise<{ winner?: RaffleWinnerRecord | null }>;
}) {
  const [locationFilterId, setLocationFilterId] = useState<string>("all");
  const [excludePreviousWinners, setExcludePreviousWinners] =
    useState<boolean>(true);
  const [prizeTitle, setPrizeTitle] = useState<string>(
    "Falcon Town Hall Star Prize"
  );
  const [spinning, setSpinning] = useState<boolean>(false);
  const [rollingName, setRollingName] = useState<string>("");
  const [latestWinner, setLatestWinner] = useState<RaffleWinnerRecord | null>(
    room.raffleHistory[0] || null
  );

  const prevWinnerIds = new Set(room.raffleHistory.map((w) => w.playerId));
  const eligiblePlayers = Object.values(room.players).filter((p) => {
    if (locationFilterId !== "all" && p.locationId !== locationFilterId) {
      return false;
    }
    if (excludePreviousWinners && prevWinnerIds.has(p.id)) {
      return false;
    }
    return true;
  });

  const handleSpin = async () => {
    if (spinning || eligiblePlayers.length === 0) return;
    setSpinning(true);
    setLatestWinner(null);

    // Animated slot-machine name roll
    let ticks = 0;
    const maxTicks = 24;
    const rollInterval = setInterval(() => {
      ticks += 1;
      const randomCandidate =
        eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
      if (randomCandidate) {
        setRollingName(
          `${randomCandidate.avatar} ${randomCandidate.name} (${
            room.locations.find((l) => l.id === randomCandidate.locationId)
              ?.shortName || ""
          })`
        );
      }
      soundFX.playRaffleSpinTick();
      if (ticks >= maxTicks) {
        clearInterval(rollInterval);
      }
    }, 85);

    setTimeout(async () => {
      clearInterval(rollInterval);
      const res = await onDrawWinner({
        locationFilterId,
        excludePreviousWinners,
        prizeTitle,
      });
      setSpinning(false);
      if (res?.winner) {
        setLatestWinner(res.winner);
        setRollingName("");
        soundFX.playRevealFanfare();
        try {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore confetti error on headless environments
        }
      }
    }, maxTicks * 85 + 120);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            <Gift className="w-3.5 h-3.5" />
            Falcon Lucky Draw Stage
          </span>
          <h2 className="text-2xl lg:text-3xl font-black text-white">
            Falcon Town Hall Lucky Draw
          </h2>
          <p className="text-sm text-slate-400">
            Draw verified winners from all joined staff or filter by any of
            the 4 Falcon Corporation locations.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-right">
          <div className="text-xs text-slate-400">Eligible Pool</div>
          <div className="text-2xl font-black text-sky-400">
            {eligiblePlayers.length}{" "}
            <span className="text-xs font-semibold text-slate-400">staff</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Prize / Recognition Title
          </label>
          <input
            type="text"
            value={prizeTitle}
            onChange={(e) => setPrizeTitle(e.target.value)}
            placeholder="e.g. Weekend Resort Voucher / HSE Star Gift"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Location Filter (4 Falcon Sites)
          </label>
          <select
            value={locationFilterId}
            onChange={(e) => setLocationFilterId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-400"
          >
            <option value="all">
              All 4 Falcon Locations ({Object.keys(room.players).length} staff)
            </option>
            {room.locations.map((loc) => {
              const count = Object.values(room.players).filter(
                (p) => p.locationId === loc.id
              ).length;
              return (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({count} staff)
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={excludePreviousWinners}
              onChange={(e) => setExcludePreviousWinners(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded"
            />
            <span className="text-xs font-semibold text-slate-200">
              Exclude previous raffle winners ({room.raffleHistory.length})
            </span>
          </label>
        </div>
      </div>

      {/* Main Drum / Reel Display */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-[#091931] to-slate-950 border-2 border-amber-500/40 p-8 text-center overflow-hidden shadow-inner">
        {spinning ? (
          <div className="py-8 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-400 animate-pulse">
              Spinning Across Falcon Locations...
            </div>
            <div className="text-3xl lg:text-5xl font-black text-white tracking-tight transition-all">
              {rollingName || "Selecting..."}
            </div>
          </div>
        ) : latestWinner ? (
          <div className="py-4 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Official Winner Drawn — {latestWinner.prizeTitle}
            </div>
            <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-sky-300">
              🎉 {latestWinner.playerName}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
              <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 font-bold text-sky-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {latestWinner.locationName}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 font-semibold">
                Squad: {latestWinner.squadName}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-400">
                {latestWinner.department}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-2">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-slate-200">
              Ready to Draw a Falcon Lucky Winner
            </div>
            <p className="text-xs text-slate-400">
              Click the button below to spin the live drum across{" "}
              {eligiblePlayers.length} eligible participants.
            </p>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleSpin}
            disabled={spinning || eligiblePlayers.length === 0}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition transform active:scale-95 inline-flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            {spinning
              ? "Drawing Winner..."
              : eligiblePlayers.length === 0
              ? "No Eligible Staff in Filter"
              : `Spin & Draw Winner (${eligiblePlayers.length} in Pool)`}
          </button>
        </div>
      </div>

      {/* Winner History Log */}
      {room.raffleHistory.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Drawn Winners Log ({room.raffleHistory.length})
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {room.raffleHistory.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-amber-300 truncate">
                    #{room.raffleHistory.length - idx} • {item.prizeTitle}
                  </div>
                  <div className="text-sm font-extrabold text-white truncate">
                    {item.playerName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {item.locationName} • {item.department}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
