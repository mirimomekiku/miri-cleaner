import React from "react";

interface MascotProps {
  mood?: "happy" | "scanning" | "cleaning" | "celebrate" | "alert";
  size?: "sm" | "md" | "lg";
}

export const Mascot: React.FC<MascotProps> = ({ mood = "happy", size = "md" }) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
    lg: "w-36 h-36",
  };

  // Idle life only for restful moods; scanning/cleaning already read as busy
  // via their own eye/antenna cues, and alert should stay still and serious.
  const idleBreathe = mood === "happy" || mood === "celebrate";

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} transition-transform duration-300 hover:scale-105 select-none`}>
      {/* Playful Pixel/Vector Robot Mascot Miri */}
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full drop-shadow-md overflow-visible ${idleBreathe ? "animate-mascot-breathe" : ""}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sparkles / Pixel Dust when happy or celebrate */}
        {(mood === "happy" || mood === "celebrate") && (
          <>
            <rect x="12" y="10" width="6" height="6" fill="#FFC800" className="animate-pulse" />
            <rect x="80" y="15" width="8" height="8" fill="#58CC02" className="animate-pulse" />
            <rect x="85" y="65" width="5" height="5" fill="#FF9D9D" />
          </>
        )}

        {/* Antenna */}
        <rect x="47" y="12" width="6" height="12" fill="#FF7B7B" rx="3" />
        <circle
          cx="50"
          cy="10"
          r="6"
          fill={mood === "alert" ? "#FF4B4B" : mood === "scanning" ? "#1CB0F6" : "#FFC800"}
          className={mood === "scanning" ? "animate-ping" : ""}
        />

        {/* Mascot Main Body: Soft Coral Rounded Box */}
        <rect
          x="18"
          y="24"
          width="64"
          height="60"
          rx="22"
          fill="#FF9D9D"
          stroke="#E05B5B"
          strokeWidth="4"
        />

        {/* White Visor / Screen Face */}
        <rect
          x="26"
          y="32"
          width="48"
          height="34"
          rx="12"
          fill="#FFFFFF"
          stroke="#FFD6D6"
          strokeWidth="3"
        />

        {/* Eyes based on mood */}
        {mood === "happy" || mood === "celebrate" ? (
          <>
            {/* Cheerful inverted arc eyes ^_^ */}
            <path
              d="M34 46 Q39 40 44 46"
              stroke="#2D2327"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M56 46 Q61 40 66 46"
              stroke="#2D2327"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : mood === "scanning" ? (
          <>
            {/* Focused scanning circles */}
            <circle cx="39" cy="46" r="5" fill="#1CB0F6" className="animate-pulse" />
            <circle cx="61" cy="46" r="5" fill="#1CB0F6" className="animate-pulse" />
          </>
        ) : mood === "alert" ? (
          <>
            {/* Surprised eyes */}
            <circle cx="39" cy="46" r="6" fill="#FF4B4B" />
            <circle cx="61" cy="46" r="6" fill="#FF4B4B" />
          </>
        ) : (
          <>
            {/* Friendly dot eyes */}
            <circle cx="39" cy="46" r="4.5" fill="#2D2327" />
            <circle cx="61" cy="46" r="4.5" fill="#2D2327" />
            <circle cx="41" cy="44" r="1.5" fill="#FFFFFF" />
            <circle cx="63" cy="44" r="1.5" fill="#FFFFFF" />
          </>
        )}

        {/* Rosy Pixel Blush */}
        <rect x="29" y="52" width="6" height="3" fill="#FFA5A5" rx="1.5" />
        <rect x="65" y="52" width="6" height="3" fill="#FFA5A5" rx="1.5" />

        {/* Mouth */}
        {mood === "celebrate" ? (
          <path d="M44 54 Q50 62 56 54" stroke="#2D2327" strokeWidth="3" strokeLinecap="round" fill="#FF7B7B" />
        ) : mood === "alert" ? (
          <circle cx="50" cy="56" r="3" fill="#2D2327" />
        ) : (
          <path d="M45 54 Q50 59 55 54" stroke="#2D2327" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Cute Broom Accessory for Cleaning */}
        {(mood === "cleaning" || mood === "happy") && (
          <g transform="translate(68, 48) rotate(15)">
            <rect x="2" y="-12" width="3" height="28" fill="#D4A373" rx="1" />
            <path d="M-4 12 L11 12 L14 24 L-7 24 Z" fill="#E9C46A" stroke="#C59B27" strokeWidth="1.5" />
            <line x1="-3" y1="16" x2="10" y2="16" stroke="#C59B27" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};
