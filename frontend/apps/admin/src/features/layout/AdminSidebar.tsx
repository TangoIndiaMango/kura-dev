import React, { useState } from 'react'
import { Collapse } from '@mantine/core'
import { NavLink, useLocation } from 'react-router-dom'
import { ArrowDown01Icon } from 'hugeicons-react'
import { useNotificationStats } from '@features/notifications'
import { useConfigVersions } from '@features/platform-config'
import { useAlertStats } from '../alerts/hooks/use-alerts'
import { useAuth } from '../auth/AuthProvider'
import { useCapabilities } from '../auth/useCapabilities'
import { KuraLogo } from '../../shared/components/KuraLogo'
import { moduleFromPath, pathForModule } from './modulePaths'
import {
  NAV_CAPABILITY,
  SECTIONS,
  childIsActive,
  type NavItem,
} from './navConfig'
import {
  staffDisplayName,
  staffInitials,
  staffRoleLabel,
} from './staffDisplay'

export type { AdminModuleId } from './navConfig'
export { SECTIONS }

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-[11px] rounded-[8px] border-0 p-[10px_12px] font-sans text-[13.5px] no-underline transition-colors hover:bg-white/10'

const CHILD_CLASS =
  'flex w-full cursor-pointer items-center rounded-[8px] border-0 py-2 pl-[40px] pr-3 font-sans text-[12.5px] no-underline transition-colors hover:bg-white/10'

function itemStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#F5A623' : 'transparent',
    color: active ? 'var(--sb)' : 'var(--sbt)',
    fontWeight: active ? 700 : 400,
  }
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const location = useLocation()
  const activeModule = moduleFromPath(location.pathname)
  const { me } = useAuth()
  const { can } = useCapabilities()
  const { data: notifStats } = useNotificationStats()
  const unreadNotifications = notifStats?.totals.unread ?? 0
  const { data: alertStats } = useAlertStats({ poll: false })
  const openAlerts = alertStats?.queue.open ?? 0
  const canSeeApprovals =
    can('finance:read') || can('credit:approve') || can('offers:manage')
  const pendingApprovals = useConfigVersions(
    { status: 'PENDING', page: 1, page_size: 1 },
    { enabled: canSeeApprovals },
  )
  const pendingApprovalCount = pendingApprovals.count
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const user = me?.user
  const displayName = user ? staffDisplayName(user) : '…'
  const roleLabel = staffRoleLabel(user?.role)
  const initials = user ? staffInitials(user) : '—'
  const photoUrl = me?.photo_url || null

  const badgeFor = (item: NavItem): number | undefined => {
    if (item.id === 'notifications') {
      return unreadNotifications > 0 ? unreadNotifications : undefined
    }
    if (item.id === 'alerts') {
      return openAlerts > 0 ? openAlerts : undefined
    }
    if (item.id === 'approvals') {
      return pendingApprovalCount > 0 ? pendingApprovalCount : undefined
    }
    return item.count
  }

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.id === 'approvals') {
        return (
          can('finance:read') ||
          can('credit:approve') ||
          can('offers:manage')
        )
      }
      const need = NAV_CAPABILITY[item.id]
      return need ? can(need) : true
    }),
  })).filter((section) => section.items.length > 0)

  const groupOpen = (item: NavItem, isActive: boolean) => {
    if (!item.children?.length) return false
    if (openGroups[item.id] !== undefined) return openGroups[item.id]
    return isActive
  }

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-shrink-0 select-none flex-col justify-between gap-[22px] overflow-hidden bg-[var(--sb)] p-[22px_14px_16px] text-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-2">
          <KuraLogo size="md" subtitle="Admin" />
        </div>

        <div className="flex flex-1 flex-col gap-[2px] overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-[2px]">
              <div className="p-[16px_10px_6px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--sbt)] opacity-70">
                {section.label}
              </div>

              {section.items.map((item) => {
                const isActive = activeModule === item.id
                const Icon = item.icon
                const count = badgeFor(item)
                const hasChildren = Boolean(item.children?.length)
                const expanded = groupOpen(item, isActive)

                if (!hasChildren) {
                  return (
                    <NavLink
                      key={item.id}
                      to={pathForModule(item.id)}
                      end={item.id === 'dashboard'}
                      onClick={onClose}
                      style={itemStyle(isActive)}
                      className={ITEM_CLASS}
                    >
                      <Icon size={17} className="flex-shrink-0 opacity-90" />
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.label}
                      </span>
                      {count !== undefined ? (
                        <span className="rounded-[10px] bg-[#E74C3C] p-[2px_7px] text-[10.5px] font-bold leading-none text-white">
                          {count}
                        </span>
                      ) : null}
                    </NavLink>
                  )
                }

                const children = item.children!

                return (
                  <div key={item.id} className="flex flex-col gap-[2px]">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [item.id]: !expanded,
                        }))
                      }
                      style={itemStyle(isActive && !expanded)}
                      className={`${ITEM_CLASS} text-left`}
                    >
                      <Icon size={17} className="flex-shrink-0 opacity-90" />
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.label}
                      </span>
                      <ArrowDown01Icon
                        size={14}
                        className={`opacity-80 transition-transform duration-200 ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <Collapse in={expanded} transitionDuration={200}>
                      <div className="flex flex-col gap-[2px]">
                        {children.map((child) => {
                          const childOn = childIsActive(
                            location.pathname,
                            child,
                            children,
                          )
                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={onClose}
                              style={itemStyle(childOn)}
                              className={CHILD_CLASS}
                            >
                              {child.label}
                            </NavLink>
                          )
                        })}
                      </div>
                    </Collapse>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <NavLink
          to="/profile"
          onClick={onClose}
          className="flex flex-shrink-0 items-center gap-[10px] rounded-[9px] bg-white/5 p-[10px] no-underline transition-colors hover:bg-white/10"
        >
          <div className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F5A623] text-[13px] font-bold text-[var(--sb)]">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-white">
              {displayName}
            </div>
            <div className="whitespace-nowrap text-[11px] text-[var(--sbt)]">
              {roleLabel}
            </div>
          </div>
        </NavLink>
      </aside>
    </>
  )
}
