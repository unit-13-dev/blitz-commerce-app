'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { PropsWithChildren } from 'react';

const navItems = [
  { href: '/', label: 'Chat' },
  { href: '/workflows', label: 'Workflows' },
  { href: '/profile', label: 'Profile' },
];

function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignedOutGate() {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/sign-in' || pathname === '/sign-up';

  if (isAuthRoute) {
    return null;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Access Restricted</h1>
        <p className="mt-3 text-sm text-slate-600">
          Sign in to manage your Blitz Protocol automations. Your workflows are secured per business account.
        </p>
        <div className="mt-6 flex justify-center">
          <SignInButton mode="modal">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-black">
              Sign in to continue
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isWorkflows = pathname?.startsWith('/workflows');
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SignedIn>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow">
                ⚡
              </span>
              <span className="text-lg font-semibold">Blitz Protocol</span>
            </Link>
            <div className="flex items-center gap-4">
              <Navigation />
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-9 w-9' } }} />
            </div>
          </div>
        </header>
      </SignedIn>

      <main className={`${isWorkflows || isHome ? 'w-full px-0 py-0' : 'mx-auto w-full max-w-6xl px-4 py-8'}`}>
        {children}
        <SignedOut>
          <SignedOutGate />
        </SignedOut>
      </main>
    </div>
  );
}
