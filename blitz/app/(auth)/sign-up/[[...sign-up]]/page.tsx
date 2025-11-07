'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16">
      <SignUp
        appearance={{
          elements: {
            card: 'bg-white border border-gray-200 text-slate-900 shadow-md',
            headerTitle: 'text-slate-900',
            headerSubtitle: 'text-slate-500',
            formButtonPrimary: 'bg-slate-900 hover:bg-black text-white',
            socialButtonsBlockButton: 'border border-gray-300 text-slate-900',
            dividerLine: 'bg-gray-200',
            footerAction__signIn: 'text-slate-600',
          },
          variables: {
            colorPrimary: '#0f172a',
            colorText: '#0f172a',
            colorInputText: '#0f172a',
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/profile"
      />
    </div>
  );
}
