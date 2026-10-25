import type { ReactNode } from 'react'
import { COMPANY } from '../lib/config'

export type LegalSection = { id: string; title: string; body: ReactNode }

/** Shared layout for Privacy and Terms: draft notice, contents, sections. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <article className="px-4 pt-32 pb-24 sm:px-6 md:px-10 md:pt-40">
      <div className="mx-auto max-w-[1100px]">
        <p className="kicker text-accent">Legal</p>
        <h1 className="mt-4 text-5xl font-bold sm:text-6xl">{title}</h1>
        <p className="mt-4 text-fg-muted">Last updated {COMPANY.legalUpdated}</p>
        <div role="note" className="mt-8 rounded-2xl border border-gold/50 bg-gold/10 p-5 text-[0.95rem]">
          <strong>Draft — pending legal review.</strong> This page describes how KURA works today and will be
          finalised by our legal advisers. Questions? Write to{' '}
          <a href={`mailto:${COMPANY.email}`} className="font-semibold underline">{COMPANY.email}</a>.
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-[240px_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
            <p className="kicker text-fg-subtle">On this page</p>
            <ol className="mt-4 space-y-2 text-[0.95rem]">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-fg-muted hover:text-fg">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-[70ch]">
            <div className="text-lg text-fg-muted">{intro}</div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="mt-12 scroll-mt-28">
                <h2 className="text-2xl font-bold">
                  {i + 1}. {s.title}
                </h2>
                <div className="legal-body mt-4 space-y-4 text-fg-muted [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-fg [&_ul]:space-y-2">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
