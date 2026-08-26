import type { CSSProperties } from "react";

type ProcessingStateProps = {
  stageLabel?: string;
};

export function ProcessingState({
  stageLabel = "Extracting...",
}: ProcessingStateProps) {
  return (
    <div className="flex flex-1 p-3 sm:p-4 lg:p-5">
      <div className="flex flex-1 items-center justify-center rounded-[28px] bg-card shadow-sm">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="relative mb-6 h-16 w-20" aria-hidden>
            <Sparkle
              className="absolute left-1 top-2 h-7 w-7 animate-sparkle"
              style={{
                background:
                  "linear-gradient(180deg, #ff8a5b 0%, #ff4d2e 100%)",
              }}
            />
            <Sparkle
              className="absolute right-0 top-0 h-10 w-10 animate-sparkle-delayed"
              style={{
                background:
                  "linear-gradient(180deg, #ff9a6b 0%, #ff5a35 100%)",
              }}
            />
            <Sparkle
              className="absolute bottom-0 left-7 h-5 w-5 animate-sparkle-delayed-more"
              style={{
                background:
                  "linear-gradient(180deg, #ffb08a 0%, #ff6a3d 100%)",
              }}
            />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {stageLabel}
          </h2>
          <p className="mt-2 text-sm text-muted">This may take a while</p>
        </div>
      </div>
    </div>
  );
}

function Sparkle({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{
        ...style,
        clipPath:
          "polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)",
      }}
    />
  );
}
