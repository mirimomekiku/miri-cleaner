import React from "react";

interface MascotProps {
  mood?: "happy" | "scanning" | "cleaning" | "celebrate" | "alert";
  size?: "sm" | "md" | "lg";
}

/**
 * Miri, the stable-hand horse mascot. Same mood/size API as before so every
 * call site across the app is unchanged -- only the character underneath it
 * changed (robot -> horse), per the Duolingo-lesson-screen redesign.
 */
export const Mascot: React.FC<MascotProps> = ({ mood = "happy", size = "md" }) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
    lg: "w-36 h-36",
  };

  const idleAnimated = mood === "happy" || mood === "celebrate";

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} transition-transform duration-300 hover:scale-105 select-none`}>
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full drop-shadow-md overflow-visible ${idleAnimated ? "animate-mascot-breathe" : ""}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sparkles / Pixel Dust when happy or celebrate */}
        {(mood === "happy" || mood === "celebrate") && (
          <>
            <rect x="10" y="14" width="6" height="6" fill="#FFC800" className="animate-pulse" />
            <rect x="82" y="18" width="8" height="8" fill="#58CC02" className="animate-pulse" />
            <rect x="86" y="66" width="5" height="5" fill="#FF9D9D" />
          </>
        )}

        {/* Tail, swishing gently behind the body */}
        <path
          d="M83 62 Q94 58 92 72 Q90 84 78 82"
          stroke="#E05B5B"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          className={mood === "celebrate" ? "animate-mane-flutter" : ""}
        />

        {/* Ears -- perked for alert/scanning, relaxed otherwise */}
        <path
          d={mood === "alert" || mood === "scanning" ? "M31 24 L26 8 L40 20 Z" : "M32 25 L29 12 L41 22 Z"}
          fill="#F3C77A"
          stroke="#C98D3A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d={mood === "alert" || mood === "scanning" ? "M69 24 L74 8 L60 20 Z" : "M68 25 L71 12 L59 22 Z"}
          fill="#F3C77A"
          stroke="#C98D3A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M33 22 L31 13 L38 20 Z" fill="#FFD9A8" />
        <path d="M67 22 L69 13 L62 20 Z" fill="#FFD9A8" />

        {/* Mane -- flowing locks draped over the head, shift with mood */}
        <path
          d={
            mood === "celebrate"
              ? "M28 22 Q18 30 22 44 Q14 50 20 62 Q12 66 18 76 L30 70 Q24 58 30 50 Q22 40 32 30 Z"
              : "M30 22 Q22 32 25 46 Q19 56 24 68 L32 64 Q27 52 31 42 Q26 34 34 28 Z"
          }
          fill="#FF9D9D"
          stroke="#E05B5B"
          strokeWidth="3.5"
          strokeLinejoin="round"
          className={mood === "celebrate" ? "animate-mane-flutter" : ""}
        />
        <rect x="46" y="12" width="8" height="14" rx="4" fill="#FF9D9D" stroke="#E05B5B" strokeWidth="3" />

        {/* Head: rounded horse head/muzzle silhouette */}
        <path
          d="M50 20
             C66 20 76 30 76 46
             C76 58 71 66 64 71
             C67 76 66 82 60 85
             L40 85
             C34 82 33 76 36 71
             C29 66 24 58 24 46
             C24 30 34 20 50 20 Z"
          fill="#F3C77A"
          stroke="#C98D3A"
          strokeWidth="4"
        />

        {/* Muzzle / blaze patch */}
        <path
          d="M50 58 C58 58 63 63 63 71 C63 79 57 84 50 84 C43 84 37 79 37 71 C37 63 42 58 50 58 Z"
          fill="#FFF3E1"
          stroke="#E3B97A"
          strokeWidth="2.5"
        />

        {/* Eyes based on mood */}
        {mood === "happy" || mood === "celebrate" ? (
          <>
            <path d="M35 45 Q40 39 45 45" stroke="#2D2327" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M55 45 Q60 39 65 45" stroke="#2D2327" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        ) : mood === "scanning" ? (
          <>
            <circle cx="40" cy="45" r="5" fill="#1CB0F6" className="animate-pulse" />
            <circle cx="60" cy="45" r="5" fill="#1CB0F6" className="animate-pulse" />
          </>
        ) : mood === "alert" ? (
          <>
            <circle cx="40" cy="45" r="6" fill="#FF4B4B" />
            <circle cx="60" cy="45" r="6" fill="#FF4B4B" />
          </>
        ) : (
          <>
            <circle cx="40" cy="45" r="4.5" fill="#2D2327" />
            <circle cx="60" cy="45" r="4.5" fill="#2D2327" />
            <circle cx="41.5" cy="43" r="1.5" fill="#FFFFFF" />
            <circle cx="61.5" cy="43" r="1.5" fill="#FFFFFF" />
          </>
        )}

        {/* Rosy cheeks */}
        <rect x="29" y="53" width="6" height="3" fill="#FFA5A5" rx="1.5" />
        <rect x="65" y="53" width="6" height="3" fill="#FFA5A5" rx="1.5" />

        {/* Nostrils */}
        <ellipse cx="45" cy="68" rx="1.6" ry="2.2" fill="#C98D3A" opacity="0.6" />
        <ellipse cx="55" cy="68" rx="1.6" ry="2.2" fill="#C98D3A" opacity="0.6" />

        {/* Mouth */}
        {mood === "celebrate" ? (
          <path d="M43 74 Q50 82 57 74" stroke="#2D2327" strokeWidth="3" strokeLinecap="round" fill="#FF7B7B" />
        ) : mood === "alert" ? (
          <circle cx="50" cy="76" r="3" fill="#2D2327" />
        ) : (
          <path d="M44 74 Q50 79 56 74" stroke="#2D2327" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* Broom held in the mouth while actively cleaning */}
        {mood === "cleaning" && (
          <g transform="translate(66, 62) rotate(20)">
            <rect x="2" y="-14" width="3" height="30" fill="#D4A373" rx="1" />
            <path d="M-4 14 L11 14 L14 26 L-7 26 Z" fill="#E9C46A" stroke="#C59B27" strokeWidth="1.5" />
            <line x1="-3" y1="18" x2="10" y2="18" stroke="#C59B27" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};
