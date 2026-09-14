import { useState, type ReactNode } from "react";
import { Menu, X, Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import CallwakaLogo from "../ui/CallwakaLogo";
import type { NavigateFn } from "../../types";

interface Props {
  currentPage: string;
  navigate: NavigateFn;
  children: ReactNode;
  demoBanner?: ReactNode;
  notificationCount?: number;
}

export default function AppShell({
  currentPage,
  navigate,
  children,
  demoBanner,
  notificationCount = 0,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate: NavigateFn = (route) => {
    navigate(route);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {demoBanner}

      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => { setMobileOpen(false); navigate({ page: "overview" }); }}
          className="hover:opacity-80 transition-opacity focus:outline-none"
          aria-label="callwaka — go to overview"
        >
          <CallwakaLogo />
        </button>
        <div className="flex items-center gap-2">
          <button
            className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 bg-blue-500 rounded-full" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 bg-white shadow-xl h-full">
            <Sidebar currentPage={currentPage} navigate={handleNavigate} />
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex h-full">
          <Sidebar currentPage={currentPage} navigate={navigate} />
        </div>

        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          tabIndex={-1}
        >
          <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
