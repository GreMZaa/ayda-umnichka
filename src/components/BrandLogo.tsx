import React from "react";
import Link from "next/link";

export interface BrandLogoProps {
  variant?: "full" | "compact" | "icon";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark";
  showSubtitle?: boolean;
  subtitle?: string;
  href?: string | null;
  className?: string;
  iconClassName?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

export function BrandLogoIcon({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
      aria-label="Логотип АйДаУмничка"
    >
      <defs>
        {/* Background Gradient */}
        <linearGradient id="blBgGrad" x1="40" y1="20" x2="472" y2="492" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="25%" stopColor="#2563eb" />
          <stop offset="70%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>

        {/* Top Ambient Gloss */}
        <linearGradient id="blTopGloss" x1="256" y1="16" x2="256" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Gold Gradients */}
        <linearGradient id="blGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        <linearGradient id="blGoldStar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Cap Shading Gradients */}
        <linearGradient id="blCapTop" x1="96" y1="130" x2="416" y2="246" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>

        <linearGradient id="blCapFrontFacet" x1="256" y1="204" x2="256" y2="254" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        <linearGradient id="blCapBand" x1="174" y1="230" x2="338" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>

        {/* Book Pages Gradients */}
        <linearGradient id="blBookPageL" x1="88" y1="288" x2="256" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        <linearGradient id="blBookPageR" x1="424" y1="288" x2="256" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        <linearGradient id="blUnderPage" x1="256" y1="330" x2="256" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* 1. Background Squircle */}
      <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#blBgGrad)" />
      <path d="M16 128C16 66.1401 66.1401 16 128 16H384C445.86 16 496 66.1401 496 128V240C496 240 380 280 256 280C132 280 16 240 16 240V128Z" fill="url(#blTopGloss)" />
      <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="#ffffff" strokeWidth="4" strokeOpacity="0.25" />

      {/* 2. Center Ambient Glow */}
      <circle cx="256" cy="250" r="140" fill="#ffffff" opacity="0.07" />

      {/* 3. OPEN BOOK WINGS OF KNOWLEDGE */}
      <g id="bl-open-book">
        <path d="M256 392C204 402 140 382 104 362C104 354 116 338 116 338C152 356 210 370 256 374C302 370 360 356 396 338C396 338 408 354 408 362C372 382 308 402 256 392Z" fill="url(#blUnderPage)" />
        
        {/* Left Page */}
        <path d="M256 374C198 382 130 358 96 334L114 290C152 312 212 334 256 336V374Z" fill="url(#blBookPageL)" />
        <path d="M136 312C168 326 208 338 242 342" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        <path d="M148 328C176 340 210 350 242 354" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.45" />

        {/* Right Page */}
        <path d="M256 374C314 382 382 358 416 334L398 290C360 312 300 334 256 336V374Z" fill="url(#blBookPageR)" />
        <path d="M376 312C344 326 304 338 270 342" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        <path d="M364 328C336 340 302 350 270 354" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.45" />

        {/* Book Spine Bookmark Ribbon */}
        <path d="M252 336H260V410L256 404L252 410V336Z" fill="url(#blGoldGrad)" />
      </g>

      {/* 4. ACADEMIC GRADUATION CAP */}
      <g id="bl-graduation-cap">
        {/* Skullcap Band */}
        <path d="M172 238C172 292 340 292 340 238C314 260 198 260 172 238Z" fill="url(#blCapBand)" />
        <path d="M190 250C214 274 298 274 322 250" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" opacity="0.4" />

        {/* Top Facet */}
        <polygon points="256,128 416,202 256,238 96,202" fill="url(#blCapTop)" />
        {/* Front Edge Bevel */}
        <polygon points="96,202 256,238 416,202 256,252" fill="url(#blCapFrontFacet)" />
        <polygon points="256,238 416,202 416,206 256,252" fill="#94a3b8" />

        {/* Center Button */}
        <ellipse cx="256" cy="202" rx="10" ry="6.5" fill="url(#blGoldGrad)" stroke="#ffffff" strokeWidth="2" />

        {/* Golden Tassel */}
        <path d="M256 202C312 202 384 218 396 248" fill="none" stroke="url(#blGoldGrad)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="396" cy="254" r="6" fill="url(#blGoldGrad)" />
        <path d="M391 258H401L405 304H387L391 258Z" fill="url(#blGoldGrad)" />
        <line x1="390" y1="304" x2="390" y2="310" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <line x1="394" y1="304" x2="394" y2="313" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="398" y1="304" x2="398" y2="313" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <line x1="402" y1="304" x2="402" y2="310" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 5. RADIANT 4-POINTED STAR OF EXCELLENCE */}
      <g transform="translate(406, 110)">
        <circle cx="0" cy="0" r="32" fill="#fde047" opacity="0.3" />
        <path d="M0 -36 Q0 0 36 0 Q0 0 0 36 Q0 0 -36 0 Q0 0 0 -36Z" fill="url(#blGoldStar)" stroke="#ffffff" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="5.5" fill="#ffffff" />
      </g>

      {/* Tiny Sparkle Accent Top Left */}
      <g transform="translate(106, 126)">
        <circle cx="0" cy="0" r="16" fill="#ffffff" opacity="0.2" />
        <path d="M0 -16 Q0 0 16 0 Q0 0 0 16 Q0 0 -16 0 Q0 0 0 -16Z" fill="#ffffff" opacity="0.9" />
      </g>
    </svg>
  );
}

export default function BrandLogo({
  variant = "full",
  size = "md",
  theme = "light",
  showSubtitle = true,
  subtitle = "Онлайн-уроки и репетиторы",
  href = "/",
  className = "",
  iconClassName = "",
  onClick,
}: BrandLogoProps) {
  // Dimensions mapping
  const sizeMap = {
    xs: { icon: 24, text: "text-xs", sub: "text-[9px]" },
    sm: { icon: 30, text: "text-sm sm:text-base", sub: "text-[10px]" },
    md: { icon: 38, text: "text-base sm:text-xl", sub: "text-[11px]" },
    lg: { icon: 46, text: "text-xl sm:text-2xl", sub: "text-xs" },
    xl: { icon: 58, text: "text-2xl sm:text-3xl", sub: "text-xs sm:text-sm" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 sm:gap-3 group shrink-0 select-none ${
        href ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="relative shrink-0">
        <BrandLogoIcon
          size={currentSize.icon}
          className={`shadow-md shadow-blue-500/20 group-hover:scale-105 group-hover:shadow-blue-500/35 transition-all duration-300 rounded-[22%] ${iconClassName}`}
        />
      </div>

      {variant !== "icon" && (
        <div className="min-w-0 leading-tight">
          <div className="flex items-center tracking-tight">
            <span
              className={`font-black ${currentSize.text} ${
                theme === "dark" ? "text-white" : "text-slate-900"
              } transition-colors`}
            >
              АйДа
            </span>
            <span
              className={`font-black ${currentSize.text} bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-indigo-500 transition-all`}
            >
              Умничка
            </span>
          </div>

          {variant === "full" && showSubtitle && (
            <span
              className={`block font-semibold ${currentSize.sub} leading-none mt-0.5 ${
                theme === "dark" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    if (href.startsWith("http://") || href.startsWith("https://")) {
      return (
        <a href={href} className="inline-flex items-center focus:outline-hidden" onClick={onClick}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className="inline-flex items-center focus:outline-hidden" onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="inline-flex items-center focus:outline-hidden text-left">
        {content}
      </button>
    );
  }

  return content;
}
