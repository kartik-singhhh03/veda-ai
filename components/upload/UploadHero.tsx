import { ClipboardList, Clock3, Home, Settings2 } from "lucide-react";

const orbitIcons = [
  { Icon: Clock3, className: "right-[12%] top-[6%]" },
  { Icon: Home, className: "bottom-[14%] right-[4%]" },
  { Icon: Settings2, className: "bottom-[12%] left-[6%]" },
  { Icon: ClipboardList, className: "left-[10%] top-[10%]" },
] as const;

export function UploadHero() {
  return (
    <div
      className="relative mx-auto my-3 flex h-32 w-32 items-center justify-center sm:my-4 sm:h-36 sm:w-36 lg:my-2 lg:h-28 lg:w-28"
      role="img"
      aria-label="VedaAI teacher illustration"
    >
      <div
        className="absolute inset-0 rounded-full bg-accent-soft/50"
        aria-hidden
      />
      <div
        className="absolute inset-[8%] rounded-full bg-accent-soft"
        aria-hidden
      />
      <div
        className="absolute inset-[16%] overflow-hidden rounded-full bg-white shadow-inner"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-teacher.png"
          alt=""
          className="h-full w-full object-cover object-[center_12%] scale-110"
          draggable={false}
        />
      </div>

      {orbitIcons.map(({ Icon, className }) => (
        <span
          key={className}
          className={`absolute flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-md sm:h-7 sm:w-7 lg:h-6 lg:w-6 ${className}`}
          aria-hidden
        >
          <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
        </span>
      ))}
    </div>
  );
}
