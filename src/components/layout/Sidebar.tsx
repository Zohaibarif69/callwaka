import {
  LayoutDashboard,
  Briefcase,
  Phone,
  Target,
  Activity,
  Settings,
} from "lucide-react";
import type { NavigateFn, Route } from "../../types";
import KeptLogo from "../ui/KeptLogo";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  route: Route;
}

const PRIMARY_NAV: NavItem[] = [
  {
    label: "Overview",
    icon: <LayoutDashboard className="size-4" />,
    route: { page: "overview" },
  },
  {
    label: "Cases",
    icon: <Briefcase className="size-4" />,
    route: { page: "cases" },
  },
  {
    label: "Calls",
    icon: <Phone className="size-4" />,
    route: { page: "calls" },
  },
  {
    label: "Commitments",
    icon: <Target className="size-4" />,
    route: { page: "commitments" },
  },
  {
    label: "Activity",
    icon: <Activity className="size-4" />,
    route: { page: "activity" },
  },
];

interface Props {
  currentPage: string;
  navigate: NavigateFn;
}

export default function Sidebar({ currentPage, navigate }: Props) {
  return (
    <aside className="w-60 shrink-0 flex flex-col h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="px-5 pt-6 pb-2">
        <button
          onClick={() => navigate({ page: "overview" })}
          className="hover:opacity-80 transition-opacity focus:outline-none"
          aria-label="kept — go to overview"
        >
          <KeptLogo />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {PRIMARY_NAV.map((item) => {
          const active = currentPage === item.route.page;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                active
                  ? "bg-slate-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-normal"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className={active ? "text-gray-700" : "text-gray-400"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-5 border-t border-gray-100 pt-3">
        <button
          onClick={() => navigate({ page: "settings" })}
          className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            currentPage === "settings"
              ? "bg-slate-100 text-gray-900 font-semibold"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-normal"
          }`}
          aria-current={currentPage === "settings" ? "page" : undefined}
        >
          <Settings
            className={`size-4 ${currentPage === "settings" ? "text-gray-700" : "text-gray-400"}`}
          />
          Settings
        </button>
      </div>
    </aside>
  );
}
