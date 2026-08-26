export function UploadHero() {
  return (
    <div className="relative mx-auto my-5 flex h-28 w-28 items-center justify-center sm:my-6 sm:h-32 sm:w-32">
      <div
        className="absolute inset-0 rounded-full bg-accent-soft/80"
        aria-hidden
      />
      <div
        className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-accent/70"
        aria-hidden
      />
      <div
        className="absolute -left-2 bottom-8 h-2.5 w-2.5 rounded-full bg-accent/50"
        aria-hidden
      />
      <div
        className="absolute bottom-2 right-0 h-2 w-2 rounded-full bg-accent/40"
        aria-hidden
      />
      <div
        className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#ffd8c8] to-[#ffb59a] shadow-inner sm:h-24 sm:w-24"
        role="img"
        aria-label="Teacher illustration placeholder"
      >
        <svg
          viewBox="0 0 80 80"
          className="h-16 w-16 sm:h-20 sm:w-20"
          aria-hidden
        >
          <circle cx="40" cy="28" r="14" fill="#f6c7a8" />
          <ellipse cx="40" cy="62" rx="22" ry="18" fill="#3d4f7a" />
          <rect x="28" y="24" width="24" height="6" rx="3" fill="#2b2b2b" />
          <circle cx="34" cy="28" r="2.5" fill="#2b2b2b" />
          <circle cx="46" cy="28" r="2.5" fill="#2b2b2b" />
          <path
            d="M33 34c2.2 2 11.8 2 14 0"
            stroke="#c47a5a"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="48" y="42" width="14" height="10" rx="2" fill="#ff6a3d" />
        </svg>
      </div>
    </div>
  );
}
