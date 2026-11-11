import React from "react";

export function FalconLogo({
  size = "md",
  showTagline = true,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const iconDimensions =
    size === "sm" ? "w-8 h-8" : size === "lg" ? "w-13 h-13" : "w-10 h-10";
  const titleSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`${iconDimensions} rounded-xl bg-gradient-to-br from-sky-400 via-blue-600 to-amber-500 p-[2px] shadow-lg shadow-sky-500/20`}
      >
        <div className="w-full h-full bg-[#071326] rounded-[10px] flex items-center justify-center relative overflow-hidden">
          {/* Stylized Falcon Wing + Gas Flame SVG */}
          <svg
            viewBox="0 0 36 36"
            className="w-6 h-6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 25C10 15 18 9 30 7C24 13 21 17 20 22C24 20 27 19 30 19C23 25 16 28 6 25Z"
              fill="url(#falconGrad)"
            />
            <path
              d="M14 28C16 23 20 20 26 19C22 24 19 27 14 28Z"
              fill="#F59E0B"
            />
            <defs>
              <linearGradient
                id="falconGrad"
                x1="6"
                y1="7"
                x2="30"
                y2="28"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#38BDF8" />
                <stop offset="1" stopColor="#0284C7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight text-white ${titleSize}`}
          >
            FALCON <span className="text-sky-400">ARENA</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
            LIVE
          </span>
        </div>
        {showTagline && (
          <p className="text-xs text-slate-400 font-medium">
            Falcon Corporation Limited • 4 Locations • One Team
          </p>
        )}
      </div>
    </div>
  );
}
