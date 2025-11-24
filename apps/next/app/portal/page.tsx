import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tractor, Workflow, Users, ClipboardCheck } from 'lucide-react';

const steps = [
  {
    title: 'Connect your fleet',
    description: 'Import machines, generate instances, and copy availability presets.',
  },
  {
    title: 'Automate bookings',
    description: 'Prefill contracts, approvals, and deposits with a single approval stream.',
  },
  {
    title: 'Share client portals',
    description: 'Give renters the visibility they expect without building a custom backend.',
  },
];

export default function OwnerPortalLanding() {
  return (
    <main className="bg-slate-950 text-slate-50">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-24 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
            Booktractor Owner Portal
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            A modern command center for equipment rental businesses
          </h1>
          <p className="text-lg text-blue-100">
            Everything you need to publish availability, approve bookings, manage machines, and
            deliver analytics—deployed on web and native apps from one codebase.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/auth/register">Start as owner</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/login">View live portal</Link>
            </Button>
          </div>
          <div className="grid gap-4 text-sm text-blue-100 md:grid-cols-3">
            <div className="rounded-xl border border-blue-500/50 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-300">Utilization</p>
              <p className="text-2xl font-semibold text-white">82%</p>
              <p className="text-xs text-blue-200">Real-time across instances</p>
            </div>
            <div className="rounded-xl border border-blue-500/50 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-300">Active bookings</p>
              <p className="text-2xl font-semibold text-white">37</p>
              <p className="text-xs text-blue-200">Auto-synced with SVAR Gantt</p>
            </div>
            <div className="rounded-xl border border-blue-500/50 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-300">Fleet size</p>
              <p className="text-2xl font-semibold text-white">124</p>
              <p className="text-xs text-blue-200">Machines across locations</p>
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-900 to-indigo-900 p-8 shadow-xl">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Tractor className="h-6 w-6 text-blue-200" />
              <p className="text-sm text-blue-100">Owner dashboard preview</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-sm text-blue-200">This week&apos;s highlights</p>
              <p className="mt-2 text-3xl font-semibold text-white">+$42,350 invoices</p>
              <p className="text-xs text-blue-200">12 waiting approvals</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-sm text-blue-100">Your machines</p>
              <div className="mt-4 space-y-3 text-sm">
                {['JD 332G', 'CAT 315', 'Skyjack SJ66T'].map((machine) => (
                  <div key={machine} className="flex items-center justify-between text-blue-100">
                    <span>{machine}</span>
                    <span className="rounded-full bg-blue-900/40 px-3 py-1 text-xs">On hire</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white text-gray-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Operating model
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Replace static spreadsheets with live machine data
            </h2>
          <p className="mt-3 text-gray-600">
            Booktractor integrates secure sessions, TRPC, TanStack Query, and SVAR Gantt so you can
              publish accurate availability and get approvals back faster. Owners get a polished
              portal, renters get clear status, and you keep one source of truth.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              <li>• Multi-instance availability editor with overrides</li>
              <li>• Booking workflows with owner and renter status history</li>
              <li>• Cross-platform UI components powered by Shadcn</li>
              <li>• Analytics widgets for revenue, utilization, and pipeline</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-8 shadow-inner">
            <h3 className="text-lg font-semibold text-gray-900">Go live in three steps</h3>
            <ol className="mt-6 space-y-4 text-sm text-gray-700">
              {steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{step.title}</p>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Built-in platform
          </p>
          <h2 className="text-3xl font-bold text-gray-900">Owner portal highlights</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 p-6 text-left">
              <Workflow className="h-5 w-5 text-blue-600" />
              <p className="mt-3 text-lg font-semibold text-gray-900">Workflow-ready</p>
              <p className="mt-2 text-sm text-gray-600">
                Gantt calendar, bookings table, and machine management views are wired up to TRPC out
                of the box.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 text-left">
              <Users className="h-5 w-5 text-blue-600" />
              <p className="mt-3 text-lg font-semibold text-gray-900">Client friendly</p>
              <p className="mt-2 text-sm text-gray-600">
                Share availability, approvals, and conversation history without granting access to
                back-office tools.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 text-left">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <p className="mt-3 text-lg font-semibold text-gray-900">Audit ready</p>
              <p className="mt-2 text-sm text-gray-600">
                Every state change flows through authenticated sessions and typed router procedures.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
