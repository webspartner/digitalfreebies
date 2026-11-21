import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) {
      return firstIp === '::1' || firstIp === '::ffff:127.0.0.1'
        ? '127.0.0.1'
        : firstIp.replace(/^::ffff:/, '');
    }
  }

  const realIp = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
  if (realIp) {
    const cleaned = realIp.trim();
    return cleaned === '::1' || cleaned === '::ffff:127.0.0.1'
      ? '127.0.0.1'
      : cleaned.replace(/^::ffff:/, '');
  }

  return '127.0.0.1';
}

// POST /api/offers/[id]/report - Record a "Not Working" click per unique IP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const offerId = parseInt(id, 10);

    if (isNaN(offerId)) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, title: true },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const ipAddress = getClientIp(request);

    const existingReport = await prisma.offerReport.findUnique({
      where: {
        offerId_ipAddress: {
          offerId,
          ipAddress,
        },
      },
    });

    await prisma.offerReport.upsert({
      where: {
        offerId_ipAddress: {
          offerId,
          ipAddress,
        },
      },
      update: {},
      create: {
        offerId,
        ipAddress,
      },
    });

    if (!existingReport) {
      await logActivity({
        actor: 'Visitor',
        actorRole: 'visitor',
        action: 'OFFER_REPORTED',
        category: 'offers',
        summary: `Visitor reported offer "${offer.title}" as Not Working`,
        ipAddress,
      });
    }

    const reportCount = await prisma.offerReport.count({
      where: { offerId },
    });

    return NextResponse.json({
      success: true,
      reportCount,
    });
  } catch (error) {
    console.error('Error reporting offer:', error);
    return NextResponse.json({ error: 'Failed to report offer' }, { status: 500 });
  }
}

// DELETE /api/offers/[id]/report - Clear all "Not Working" reports for an offer (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const offerId = parseInt(id, 10);

    if (isNaN(offerId)) {
      return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { title: true },
    });

    await prisma.offerReport.deleteMany({
      where: { offerId },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'OFFER_REPORTS_CLEARED',
      category: 'offers',
      summary: `Admin "${admin.username}" cleared Not Working reports for offer "${offer?.title || `#${offerId}`}"`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing offer reports:', error);
    return NextResponse.json({ error: 'Failed to clear reports' }, { status: 500 });
  }
}
