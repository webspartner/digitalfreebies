import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/faq
export async function GET() {
  try {
    const items = await prisma.faqItem.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 });
  }
}

// POST /api/faq
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question, answer, sortOrder } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    const item = await prisma.faqItem.create({
      data: { question, answer, sortOrder: sortOrder || 0 },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating FAQ item:', error);
    return NextResponse.json({ error: 'Failed to create FAQ item' }, { status: 500 });
  }
}
