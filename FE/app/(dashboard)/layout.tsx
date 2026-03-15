import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

// Use dynamic rendering but cache for a short time to prevent excessive re-renders
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already handles authentication checks and redirects
  // This is a secondary check - if we reach here without a session, something went wrong
  try {
    const sessionResult = await getSession();

    if (!sessionResult.session) {
      // Middleware should have already redirected, but if we're here, redirect to login
      // Don't set redirect parameter here to avoid loops - let middleware handle it
      redirect('/login');
    }

    return (
      <DashboardLayout
        user={{
          name: null,
          email: sessionResult.session.email,
        }}
      >
        {children}
      </DashboardLayout>
    );
  } catch (error) {
    // If there's an error getting session, redirect to login to prevent infinite loops
    console.error('Error in dashboard layout:', error);
    redirect('/login');
  }
}
