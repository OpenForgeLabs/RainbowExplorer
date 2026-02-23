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
      className={`relative flex-col border-r border-border bg-surface ${
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
            collapsed ? "bg-transparent text-primary" : "bg-primary text-primary-foreground"
          }`}
        >
          <span className="material-symbols-outlined">hub</span>
        </div>
        <div className={collapsed ? "hidden" : ""}>
          <h1 className="text-lg font-bold leading-none text-foreground">
            RainbowExplorer
          </h1>
        </div>
        {!collapsed && onToggleCollapse ? (
          <span className="ml-auto hidden w-8 lg:block" aria-hidden />
        ) : null}
      </div>
      {onToggleCollapse ? (
        <button
          className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-2 text-muted-foreground shadow-[var(--rx-shadow-sm)] backdrop-blur hover:border-primary lg:flex ${
            collapsed ? "-right-3 h-10 w-10" : "-right-2 h-8 w-8"
          }`}
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
          className={`px-3 py-4 text-[10px] font-bold uppercase tracking-widest text-subtle ${
            collapsed ? "hidden" : ""
          }`}
        >
          Workspace
        </div>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
            href={item.href}
            aria-label={item.label}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={collapsed ? "hidden" : ""}>{item.label}</span>
          </a>
        ))}
        <div
          className={`px-3 py-4 text-[10px] font-bold uppercase tracking-widest text-subtle ${
            collapsed ? "hidden" : ""
          }`}
        >
          Management
        </div>
        {MGMT_ITEMS.map((item) => (
          <a
            key={item.href}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
            href={item.href}
            aria-label={item.label}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={collapsed ? "hidden" : ""}>{item.label}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className={collapsed ? "hidden" : ""}>Settings</span>
        </button>
      </nav>
    </aside>
  );
}
