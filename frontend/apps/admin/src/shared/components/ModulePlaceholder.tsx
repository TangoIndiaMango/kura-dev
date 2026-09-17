import React from 'react'

interface ModulePlaceholderProps {
  title: string
  description?: string
}

/** Wave 0 stub for modules without converted feature panels yet. */
export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description = 'This module will be converted from hifi in a later wave.',
}) => {
  return (
    <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-8 sm:p-10">
      <h2 className="text-[20px] font-bold tracking-tight text-[var(--tx)] m-0">
        {title}
      </h2>
      <p className="mt-2 mb-0 text-[13.5px] text-[var(--su)] leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
  )
}
