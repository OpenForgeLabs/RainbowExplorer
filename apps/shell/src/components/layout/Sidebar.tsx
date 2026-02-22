type SidebarItem = {
  href: string;
  label: string;
  icon: string;
};

type SidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: () => void;
};

const NAV_ITEMS: SidebarItem[] = [
  { href: "/", label: "Dashboard", icon: "apps" },
  { href: "/connections", label: "Connections", icon: "hub" },
  { href: "/views", label: "Views", icon: "grid_view" },
  { href: "/themes", label: "Themes", icon: "palette" },
];

const MGMT_ITEMS: SidebarItem[] = [
  { href: "#activity", label: "Activity Logs", icon: "history" },
];

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onOpenSettings,
}: SidebarProps) {
  return (
    <aside
      className={`relative flex-col border-r border-border-dark bg-background ${
        collapsed ? "w-20" : "w-64"
      } hidden lg:flex`}
    >
      <div
        className={`flex items-center ${
          collapsed ? "justify-center px-0 py-6" : "gap-3 p-6"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded ${
            collapsed ? "bg-transparent text-action" : "bg-action text-white"
          }`}
        >
          <span className="material-symbols-outlined">hub</span>
        </div>
        <div className={collapsed ? "hidden" : ""}>
          <h1 className="text-lg font-bold leading-none text-slate-100">
            RainbowExplorer
          </h1>
        </div>
        {!collapsed && onToggleCollapse ? (
          <span className="ml-auto hidden w-8 lg:block" aria-hidden />
        ) : null}
      </div>
      {onToggleCollapse ? (
        <button
          className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border-dark/60 bg-surface-dark/70 text-slate-300 shadow-lg backdrop-blur hover:border-action lg:flex ${
            collapsed ? "-right-3 h-10 w-10" : "-right-2 h-8 w-8"
          }`}
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {collapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      ) : null}
      <nav
        className={`flex-1 space-y-1 overflow-y-auto ${
          collapsed ? "px-2" : "px-4"
        }`}
      >
        <div
          className={`px-3 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 ${
            collapsed ? "hidden" : ""
          }`}
        >
          Workspace
        </div>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-slate-400 transition-colors hover:bg-surface-dark ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
            href={item.href}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={collapsed ? "hidden" : ""}>{item.label}</span>
          </a>
        ))}
        <div
          className={`px-3 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 ${
            collapsed ? "hidden" : ""
          }`}
        >
          Management
        </div>
        {MGMT_ITEMS.map((item) => (
          <a
            key={item.href}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-slate-400 transition-colors hover:bg-surface-dark ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
            href={item.href}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={collapsed ? "hidden" : ""}>{item.label}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex w-full items-center rounded-lg py-2 text-sm text-slate-400 transition-colors hover:bg-surface-dark ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
          title="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className={collapsed ? "hidden" : ""}>Settings</span>
        </button>
      </nav>
    </aside>
  );
}
