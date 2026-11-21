import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/admin/not-working - List all offers that have "Not Working" reports
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportedOffers = await prisma.offer.findMany({
      where: {
        reports: {
          some: {},
        },
      },
      include: {
        _count: {
          select: { reports: true },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ipAddress: true,
            createdAt: true,
          },
        },
      },
    });

    // Sort by highest report count first, then by most recent report
    reportedOffers.sort((a, b) => {
      const countDiff = (b._count?.reports || 0) - (a._count?.reports || 0);
      if (countDiff !== 0) return countDiff;
      const aLatest = a.reports[0]?.createdAt ? new Date(a.reports[0].createdAt).getTime() : 0;
      const bLatest = b.reports[0]?.createdAt ? new Date(b.reports[0].createdAt).getTime() : 0;
      return bLatest - aLatest;
    });

    const totalReports = reportedOffers.reduce((sum, offer) => sum + (offer._count?.reports || 0), 0);

    return NextResponse.json({
      offers: reportedOffers,
      totalReportedOffers: reportedOffers.length,
      totalReports,
    });
  } catch (error) {
    console.error('Error fetching reported offers:', error);
    return NextResponse.json({ error: 'Failed to fetch reported offers' }, { status: 500 });
  }
}
