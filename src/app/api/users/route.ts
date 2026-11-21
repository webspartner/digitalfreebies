import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, isFullAdmin, hashPassword, verifyPassword } from '@/lib/auth';

// GET /api/users - List all admin and moderator accounts (Admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new admin or moderator account (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Only Admins can create staff accounts' }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, role, adminPassword } = body;

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to confirm creating a staff account' },
        { status: 400 }
      );
    }

    const actingAdmin = await prisma.admin.findUnique({ where: { id: admin.id } });
    if (!actingAdmin || !verifyPassword(adminPassword, actingAdmin.passwordHash)) {
      return NextResponse.json(
        { error: 'Incorrect admin password confirmation' },
        { status: 401 }
      );
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
    const cleanRole = role === 'moderator' ? 'moderator' : 'admin';

    // Check if username already exists
    const existing = await prisma.admin.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const newUser = await prisma.admin.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: cleanRole,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: cleanRole === 'moderator' ? 'MODERATOR_CREATED' : 'ADMIN_USER_CREATED',
      category: 'users',
      summary: `Admin "${admin.username}" created ${cleanRole} account "${newUser.username}"`,
      request,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
