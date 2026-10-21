import React from 'react'
import {
  Menu01Icon,
  Search01Icon,
  Sun01Icon,
  MoonIcon,
  Notification03Icon,
  Logout01Icon,
} from 'hugeicons-react'

interface AdminTopNavProps {
  title: string
  crumb?: string
  onToggleSidebar: () => void
  onToggleNotifications?: () => void
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
  unreadNotifications?: number
  onSignOut?: () => void
}

export const AdminTopNav: React.FC<AdminTopNavProps> = ({
  title,
  crumb = 'Dashboard',
  onToggleSidebar,
  onToggleNotifications,
  theme = 'light',
  onToggleTheme,
  unreadNotifications = 0,
  onSignOut,
}) => {
  return (
    <header className="h-16 flex-shrink-0 border-b border-[var(--bd)] bg-[var(--sf)] px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
          className="w-[34px] h-[34px] rounded-[8px] border border-[var(--bd)] flex items-center justify-center text-[var(--tx)] bg-[var(--sf)] cursor-pointer hover:bg-[var(--hv)] transition-colors flex-shrink-0"
        >
          <Menu01Icon size={18} />
        </button>

        <div
          className="min-w-0 truncate text-[21px] font-bold tracking-tight text-[var(--tx)]"
          title={title}
        >
          {title}
        </div>

        <div className="hidden min-w-0 truncate text-[12.5px] text-[var(--su)] xl:block">
          {crumb}
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--in)] text-[12.5px] text-[var(--su)] w-[clamp(180px,24vw,280px)]">
          <Search01Icon size={14} className="flex-shrink-0 opacity-70" />
          <input
            type="text"
            placeholder="Search by name, phone, KURA ID, plate…"
            className="bg-transparent border-0 outline-none text-[var(--tx)] text-[12.5px] w-full placeholder:text-[var(--su)]"
          />
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="h-9 px-3 border border-[var(--bd)] rounded-[8px] bg-[var(--in)] text-[var(--tx)] text-[12px] font-bold cursor-pointer flex items-center gap-2 font-sans hover:bg-[var(--hv)] transition-colors"
        >
          {theme === 'dark' ? (
            <>
              <MoonIcon size={15} />
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun01Icon size={15} />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleNotifications}
          aria-label="Notifications"
          className="w-9 h-9 rounded-[8px] border border-[var(--bd)] bg-[var(--in)] text-[var(--tx)] cursor-pointer relative flex items-center justify-center hover:bg-[var(--hv)] transition-colors"
        >
          <Notification03Icon size={17} />
          {unreadNotifications > 0 ? (
            <span className="absolute top-[6px] right-[8px] w-[7px] h-[7px] rounded-full bg-[#E74C3C] border-[1.5px] border-[var(--in)]" />
          ) : null}
        </button>

        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={onSignOut}
          className="w-9 h-9 rounded-[8px] border border-[var(--bd)] bg-[var(--in)] flex items-center justify-center text-[var(--tx)] cursor-pointer hover:bg-[var(--hv)] transition-colors"
        >
          <Logout01Icon size={17} />
        </button>
      </div>
    </header>
  )
}
