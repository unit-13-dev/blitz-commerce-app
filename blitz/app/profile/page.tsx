import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ensureBusinessForUser } from '@/app/lib/db/business';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { business } = await ensureBusinessForUser(user);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Business Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Profile & Branding</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage the name of your business as it appears across workflows, analytics, and automation logs.
        </p>
      </div>

      <ProfileForm
        initialBusinessName={business.name}
        clerkEmail={user.emailAddresses[0]?.emailAddress ?? ''}
        clerkName={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
      />
    </div>
  );
}
