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
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <div className="relative mb-7 h-14 w-16" aria-hidden>
            <Sparkle
              className="absolute left-0 top-3 h-6 w-6 animate-sparkle"
              style={{
                background:
                  "linear-gradient(180deg, #ff8a5b 0%, #ff4d2e 100%)",
              }}
            />
            <Sparkle
              className="absolute right-1 top-0 h-9 w-9 animate-sparkle-delayed"
              style={{
                background:
                  "linear-gradient(180deg, #ff9a6b 0%, #ff5a35 100%)",
              }}
            />
            <span className="absolute bottom-1 left-8 h-2 w-2 rounded-full bg-accent animate-sparkle-delayed-more" />
          </div>

          <h2
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            aria-live="polite"
          >
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
