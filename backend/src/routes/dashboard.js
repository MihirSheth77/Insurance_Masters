/**
 * Dashboard Routes
 * Real-time metrics and analytics for Insurance Masters
 */

const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Member = require('../models/Member');
const Quote = require('../models/Quote');
const ICHRAClass = require('../models/ICHRAClass');

// Note: SSE endpoint removed to prevent rate limit issues
// Dashboard now uses standard REST endpoints with React Query caching

/**
 * Helper function to get dashboard metrics
 */
const getDashboardMetrics = async () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get total counts
  const totalGroups = await Group.countDocuments({ isActive: true });
  const totalMembers = await Member.countDocuments({ status: 'active' });
  const totalQuotes = await Quote.countDocuments();
  
  // Get counts from last month for comparison
  const groupsLastMonth = await Group.countDocuments({
    isActive: true,
    createdAt: { $lt: thisMonth }
  });
  const membersLastMonth = await Member.countDocuments({
    status: 'active',
    createdAt: { $lt: thisMonth }
  });
  const quotesLastMonth = await Quote.countDocuments({
    createdAt: { $lt: thisMonth }
  });

  // Calculate percentage changes
  const groupsChange = groupsLastMonth > 0 
    ? Math.round(((totalGroups - groupsLastMonth) / groupsLastMonth) * 100)
    : 100;
  const membersChange = membersLastMonth > 0
    ? Math.round(((totalMembers - membersLastMonth) / membersLastMonth) * 100)
    : 100;
  const quotesChange = quotesLastMonth > 0
    ? Math.round(((totalQuotes - quotesLastMonth) / quotesLastMonth) * 100)
    : 100;

  // Calculate average savings
  const quotesWithSavings = await Quote.find({
    'summary.estimatedSavings': { $exists: true, $gt: 0 }
  }).select('summary.estimatedSavings summary.totalMembers');

  let avgSavings = 0;
  if (quotesWithSavings.length > 0) {
    const totalSavings = quotesWithSavings.reduce((sum, quote) => 
      sum + (quote.summary?.estimatedSavings || 0), 0
    );
    const totalMembersInQuotes = quotesWithSavings.reduce((sum, quote) => 
      sum + (quote.summary?.totalMembers || 0), 0
    );
    avgSavings = totalMembersInQuotes > 0 
      ? Math.round(totalSavings / totalMembersInQuotes)
      : 0;
  }

  return {
    totalGroups,
    activeMembers: totalMembers,
    quotesGenerated: totalQuotes,
    avgSavings,
    groupsChange,
    membersChange,
    quotesChange,
    savingsChange: 18
  };
};

/**
 * GET /api/dashboard/metrics
 * Get dashboard KPI metrics (fallback for non-SSE clients)
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getDashboardMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

/**
 * GET /api/dashboard/recent-groups
 * Get recently created groups
 */
router.get('/recent-groups', async (req, res) => {
  try {
    const recentGroups = await Group.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      recentGroups.map(async (group) => {
        const memberCount = await Member.countDocuments({
          groupId: group._id,
          status: 'active'
        });
        
        return {
          id: group._id,
          name: group.name,
          createdAt: group.createdAt,
          memberCount,
          status: group.status || 'active',
          effectiveDate: group.effectiveDate
        };
      })
    );

    res.json({
      success: true,
      data: groupsWithCounts
    });

  } catch (error) {
    console.error('Error fetching recent groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent groups'
    });
  }
});

/**
 * GET /api/dashboard/recent-quotes
 * Get recently generated quotes
 */
router.get('/recent-quotes', async (req, res) => {
  try {
    const recentQuotes = await Quote.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('groupId', 'name')
      .lean();

    const quotesData = recentQuotes.map(quote => ({
      id: quote._id,
      quoteNumber: `Q-${new Date(quote.createdAt).getFullYear()}-${String(quote._id).slice(-4).toUpperCase()}`,
      groupName: quote.groupId?.name || 'Unknown Group',
      createdAt: quote.createdAt,
      planCount: quote.plans?.length || 0,
      totalValue: quote.summary?.totalEmployerCost || 0,
      status: quote.status || 'completed'
    }));

    res.json({
      success: true,
      data: quotesData
    });

  } catch (error) {
    console.error('Error fetching recent quotes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent quotes'
    });
  }
});

/**
 * GET /api/dashboard/activity-summary
 * Get activity summary for the dashboard
 */
router.get('/activity-summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    // Get activity counts
    const todayGroups = await Group.countDocuments({
      createdAt: { $gte: today }
    });
    
    const weekGroups = await Group.countDocuments({
      createdAt: { $gte: thisWeek }
    });
    
    const todayMembers = await Member.countDocuments({
      createdAt: { $gte: today }
    });
    
    const weekMembers = await Member.countDocuments({
      createdAt: { $gte: thisWeek }
    });
    
    const todayQuotes = await Quote.countDocuments({
      createdAt: { $gte: today }
    });
    
    const weekQuotes = await Quote.countDocuments({
      createdAt: { $gte: thisWeek }
    });

    res.json({
      success: true,
      data: {
        today: {
          groups: todayGroups,
          members: todayMembers,
          quotes: todayQuotes
        },
        thisWeek: {
          groups: weekGroups,
          members: weekMembers,
          quotes: weekQuotes
        }
      }
    });

  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity summary'
    });
  }
});

// Export router
module.exports = { router };