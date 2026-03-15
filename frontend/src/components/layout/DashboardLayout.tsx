'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Home, ListTodo, LogOut, Loader2, ChevronDown, Bot } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);
      setSignOutError(null);
      setProfileMenuOpen(false);

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sign out');
      }

      router.replace('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      setSignOutError('Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const navItems = [
    { href: '/courses', label: 'Courses', icon: Home },
    { href: '/tasks', label: 'Tasks', icon: ListTodo },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/chat', label: 'AI Assistant', icon: Bot },
  ];

  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split('@')[0] : 'Student');
  const displayEmail = user?.email || 'Signed in';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6">
        {/* Left: Logo and App Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">Syllabus to Calendar</span>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-9 px-4 rounded-md',
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Right: Profile */}
        <div className="flex items-center">
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 border border-gray-200 bg-white shadow-sm",
                "hover:shadow-md transition-all min-w-[180px] focus:outline-none focus:ring-2 focus:ring-purple-400"
              )}
            >
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold flex items-center justify-center border border-gray-200">
                {initials}
              </div>
              <div className="text-left">
                <div className="text-[13px] font-semibold text-gray-900 truncate max-w-[120px]">
                  {displayName}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-gray-500 transition-transform",
                  profileMenuOpen && "rotate-180"
                )}
              />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl py-3 z-50">
                <div className="px-4 pb-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
                      "disabled:opacity-60 disabled:cursor-not-allowed text-left"
                    )}
                  >
                    {signingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        Signing out…
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 text-purple-500" />
                        Sign out
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex w-full pt-16">
        {/* Render sidebar unless on calendar tab */}
        {pathname.startsWith('/calendar') ? null : <DashboardSidebar />}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
          {signOutError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
              {signOutError}
            </div>
          )}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
