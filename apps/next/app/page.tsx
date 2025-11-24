import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LandingNavbar from './landing-navbar';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  Gauge,
  Cloud,
} from 'lucide-react';

const highlights = [
  {
    title: 'Unified availability',
    description: 'Sync machines, instances, and overrides across web + mobile in real time.',
    icon: CalendarDays,
  },
  {
    title: 'Owner-grade analytics',
    description: 'Revenue, utilization, and booking pipelines without brittle spreadsheets.',
    icon: Gauge,
  },
  {
    title: 'Ready for automation',
    description: 'Connect secure sessions, TRPC, and TanStack Query for smooth workflows.',
    icon: ShieldCheck,
  },
];

const logos = ['Neon', 'Secure Sessions', 'TanStack', 'Gluestack', 'Solito'];

export default function MarketingHomePage() {
  return (
    <>
      <LandingNavbar />
      <main className="bg-white text-gray-900">
      <section className="relative overflow-hidden bg-blue-950 text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="h-full w-full bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center lg:flex-row lg:text-left lg:py-32">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm font-medium">
              <Sparkles className="mr-2 h-4 w-4" />
              Cross-platform equipment rentals in record time
            </div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Build a single source of truth for all rental operations
            </h1>
            <p className="text-lg text-blue-100 lg:text-xl">
              Booktractor stitches together Next.js, Expo, TRPC, and hardened session handling so your fleet,
              bookings, and clients stay in sync—from the yard to the job site.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/catalog">
                  Browse public catalog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/auth/login">Sign in to portals</Link>
              </Button>
            </div>
            <p className="text-sm uppercase tracking-wide text-blue-200">
              Powered by modern DX tools
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase text-blue-100">
              {logos.map((logo) => (
                <span key={logo} className="rounded-full bg-white/10 px-3 py-1">
                  {logo}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-16 flex-1 lg:mt-0">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              <div className="space-y-6">
                <div className="flex justify-between text-sm text-blue-100">
                  <span>Owner activity</span>
                  <span>Live sync</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-6 text-left">
                  <p className="text-sm text-blue-100">Upcoming bookings</p>
                  <p className="mt-2 text-3xl font-semibold">12 active rentals</p>
                  <div className="mt-6 space-y-4">
                    {['John Deere 333G', 'CAT 950 GC', 'Genie S-60'].map((machine, index) => (
                      <div key={machine} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold text-white">{machine}</p>
                          <p className="text-blue-200">#{index + 1042}</p>
                        </div>
                        <span className="rounded-full bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-100">
                          On hire
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-6">
                  <p className="text-sm text-blue-100">Revenue forecast</p>
                  <p className="mt-2 text-3xl font-semibold">$148k</p>
                  <p className="text-xs text-blue-200">Next 30 days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Why Booktractor</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">Built for modern rental teams</h2>
          <p className="mt-3 text-lg text-gray-600">
            Ship a full-stack equipment experience that shares code across web and mobile without
            sacrificing owner-grade features.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {highlights.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <feature.icon className="h-6 w-6 text-blue-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Everything in one owner workspace</h2>
            <p className="mt-4 text-gray-600">
              Availability, bookings, owner analytics, client messaging, and hardened session handling,
              and TRPC APIs come standard. Deploy to web and native apps without duplicating logic.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              <li>• Ready-to-use owner portal shell with Shadcn UI</li>
              <li>• Cross-platform auth screens and guardrails</li>
              <li>• SVAR Gantt for utilization and scheduling</li>
              <li>• Analytics card templates for executive views</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href="/owner">Owner portal</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/client">Client portal</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="rounded-2xl bg-gray-900 p-6 text-white">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>Portal preview</span>
                <Cloud className="h-4 w-4" />
              </div>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Machines synced</span>
                  <span className="font-semibold text-blue-300">22</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Instances online</span>
                  <span className="font-semibold text-blue-300">61</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average utilization</span>
                  <span className="font-semibold text-blue-300">84%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
