import { CATEGORIES, type CategoryId } from '../utils/categories'

export function CategoryTabs({
  selected,
  counts,
  unreadByCategory,
  onSelect,
  variant,
}: {
  selected: CategoryId
  counts: Record<CategoryId, number>
  unreadByCategory: Record<CategoryId, number>
  onSelect: (id: CategoryId) => void
  variant: 'rail' | 'scroll'
}) {
  if (variant === 'scroll') {
    return (
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((cat) => {
            const active = selected === cat.id
            const unread = unreadByCategory[cat.id] ?? 0
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition ${
                  active
                    ? 'border-[var(--pr)] bg-[var(--pr)] text-white'
                    : 'border-[var(--bd)] bg-[var(--sf)] text-[var(--mu)] hover:border-[var(--pr)] hover:text-[var(--tx)]'
                }`}
              >
                {cat.short}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : unread > 0
                        ? 'bg-[var(--ta)] text-[#C47D0E]'
                        : 'bg-[var(--tn)] text-[var(--mu)]'
                  }`}
                >
                  {counts[cat.id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <nav className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-[var(--bd)] pr-3 lg:w-[220px]">
      {CATEGORIES.map((cat) => {
        const active = selected === cat.id
        const unread = unreadByCategory[cat.id] ?? 0
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition ${
              active
                ? 'bg-[var(--in)] text-[var(--pr)]'
                : 'text-[var(--mu)] hover:bg-[var(--tn)] hover:text-[var(--tx)]'
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                active ? 'bg-[var(--pr)]' : unread > 0 ? 'bg-[#C47D0E]' : 'bg-[var(--bd)]'
              }`}
            />
            <span
              className={`min-w-0 flex-1 truncate text-[13px] ${
                active ? 'font-bold' : 'font-medium'
              }`}
            >
              {cat.label}
            </span>
            <span className="text-[12px] tabular-nums text-[var(--mu)]">
              {counts[cat.id]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
