import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureBusinessForUser, updateBusinessName } from '@/app/lib/db/business';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const { business } = await ensureBusinessForUser(user);

  return NextResponse.json({ business });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
  }

  const sanitizedName = body.name.trim();

  if (!sanitizedName) {
    return NextResponse.json({ error: 'Business name cannot be empty' }, { status: 400 });
  }

  try {
    const business = await updateBusinessName(userId, sanitizedName);
    return NextResponse.json({ business });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update business name' },
      { status: 500 }
    );
  }
}
