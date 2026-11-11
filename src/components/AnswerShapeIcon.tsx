import React from "react";

export const OPTION_STYLES = [
  {
    id: 0,
    name: "Triangle",
    bg: "bg-[#E21B3C] hover:bg-[#c81633]",
    border: "border-[#ff4d6a]",
    lightBg: "bg-[#E21B3C]/15",
    text: "text-rose-400",
    hex: "#E21B3C",
  },
  {
    id: 1,
    name: "Diamond",
    bg: "bg-[#1368CE] hover:bg-[#1059b0]",
    border: "border-[#4b96f3]",
    lightBg: "bg-[#1368CE]/15",
    text: "text-sky-400",
    hex: "#1368CE",
  },
  {
    id: 2,
    name: "Circle",
    bg: "bg-[#D89E00] hover:bg-[#b88600]",
    border: "border-[#facc15]",
    lightBg: "bg-[#D89E00]/15",
    text: "text-amber-400",
    hex: "#D89E00",
  },
  {
    id: 3,
    name: "Square",
    bg: "bg-[#26890C] hover:bg-[#1f700a]",
    border: "border-[#4ade80]",
    lightBg: "bg-[#26890C]/15",
    text: "text-emerald-400",
    hex: "#26890C",
  },
];

export function AnswerShapeIcon({
  optionId,
  className = "w-6 h-6",
}: {
  optionId: number;
  className?: string;
}) {
  const index = optionId % 4;
  if (index === 0) {
    // Triangle
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 3L22 20H2L12 3Z" />
      </svg>
    );
  }
  if (index === 1) {
    // Diamond
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 2L22 12L12 22L2 12L12 2Z" />
      </svg>
    );
  }
  if (index === 2) {
    // Circle
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  // Square
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
