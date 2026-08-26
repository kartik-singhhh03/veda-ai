import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  History,
  Home,
  LayoutGrid,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Home", icon: Home },
  { label: "My Classroom", icon: Users },
  { label: "Assignments", icon: FileText },
  { label: "Exams", icon: ClipboardList, active: true },
  { label: "My Library", icon: History },
] as const;

type SidebarProps = {
  collapsed?: boolean;
};

export function Sidebar({ collapsed = false }: SidebarProps) {
  if (collapsed) {
    return (
      <aside
        className="hidden h-screen w-[72px] shrink-0 flex-col items-center border-r border-border bg-sidebar py-4 lg:flex"
        aria-label="Main navigation"
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-bold text-white"
          aria-hidden
        >
          V
        </div>

        <button
          type="button"
          className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_0_3px_rgba(255,106,61,0.25)]"
          aria-label="AI Teacher's Toolkit"
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <nav className="mt-6 flex flex-1 flex-col items-center gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  "active" in item && item.active
                    ? "bg-surface text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
                aria-label={item.label}
                aria-current={"active" in item && item.active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3 pb-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success"
            aria-hidden
          >
            <BookOpen className="h-4 w-4" />
          </div>
          <button
            type="button"
            className="text-muted"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="hidden h-screen w-[260px] shrink-0 flex-col border-r border-border bg-sidebar px-4 py-5 lg:flex"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-bold text-white"
            aria-hidden
          >
            V
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            VedaAI
          </span>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted hover:bg-surface"
          aria-label="Collapse sidebar"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-accent-glow bg-[#2a2a2a] px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_0_2px_rgba(255,106,61,0.35)]"
      >
        <Sparkles className="h-4 w-4 text-accent" />
        AI Teacher&apos;s Toolkit
      </button>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = "active" in item && item.active;
          return (
            <button
              key={item.label}
              type="button"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-surface font-medium text-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface hover:text-foreground"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Settings
        </button>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b3d2e] text-[10px] font-semibold text-white"
              aria-hidden
            >
              DPS
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold leading-snug text-foreground">
                Delhi Public School,
              </p>
              <p className="truncate text-xs text-muted">Bokaro Steel City</p>
            </div>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted" />
          </div>
        </div>
      </div>
    </aside>
  );
}

type TopHeaderProps = {
  title?: string;
};

export function TopHeader({ title = "Exams" }: TopHeaderProps) {
  return (
    <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5 lg:flex">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <button
          type="button"
          className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
          aria-label="Go back"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <ClipboardList className="h-4 w-4 text-muted" strokeWidth={1.75} />
        <span>{title}</span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="Help">
          <HelpCircle className="h-4 w-4" />
        </IconButton>
        <button
          type="button"
          className="relative rounded-md p-2 text-muted hover:bg-surface hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <IconButton label="AI assistant">
          <Sparkles className="h-4 w-4" />
        </IconButton>

        <button
          type="button"
          className="ml-2 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface"
          aria-label="User menu"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-xs font-semibold text-white"
            aria-hidden
          >
            MR
          </span>
          <span className="text-sm font-medium text-foreground">
            Madhur Rastogi
          </span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
      </div>
    </header>
  );
}

export function MobileHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md p-1 text-foreground"
          aria-label="Go back"
        >
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>
        <span className="text-base font-semibold tracking-tight">VedaAI</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-md p-1.5 text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-[11px] font-semibold text-white"
          aria-hidden
        >
          MR
        </span>
        <button
          type="button"
          className="rounded-md p-1.5 text-foreground"
          aria-label="Open menu"
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1" aria-hidden>
            <span className="block h-0.5 w-4 bg-foreground" />
            <span className="block h-0.5 w-4 bg-foreground" />
            <span className="block h-0.5 w-4 bg-foreground" />
          </span>
        </button>
      </div>
    </header>
  );
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="rounded-md p-2 text-muted hover:bg-surface hover:text-foreground"
      aria-label={label}
    >
      {children}
    </button>
  );
}

type AppShellProps = {
  children: ReactNode;
  collapsedSidebar?: boolean;
};

export function AppShell({
  children,
  collapsedSidebar = false,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsedSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <TopHeader />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
