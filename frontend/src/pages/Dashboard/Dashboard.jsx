/**
 * Insurance Masters Dashboard
 * Professional insurance broker platform dashboard with smart data updates
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  GroupIcon, 
  PersonIcon, 
  ReceiptIcon,
  AssessmentIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  ErrorIcon
} from '../../components/Icons/Icons';
import { apiService } from '../../services/api';
import dashboardService from '../../services/dashboardService';
import Loading from '../../components/Loading/Loading';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [healthStatus, setHealthStatus] = useState(null);

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await apiService.checkHealth();
        setHealthStatus(health);
      } catch (error) {
        console.error('Failed to check backend health:', error);
        setHealthStatus({ error: error.message });
      }
    };
    checkHealth();
  }, []);

  // Fetch dashboard metrics with React Query
  const { 
    data: metricsData, 
    isLoading: loadingMetrics,
    error: metricsError
  } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardService.getMetrics(),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: true, // Refetch when connection restored
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch recent groups
  const { 
    data: recentGroups, 
    isLoading: loadingGroups
  } = useQuery({
    queryKey: ['recent-groups'],
    queryFn: () => dashboardService.getRecentGroups(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch recent quotes
  const { 
    data: recentQuotes, 
    isLoading: loadingQuotes
  } = useQuery({
    queryKey: ['recent-quotes'],
    queryFn: () => dashboardService.getRecentQuotes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });


  // Optimistic update example for when user navigates after creating something
  useEffect(() => {
    // Listen for custom events from other components
    const handleGroupCreated = (event) => {
      // Optimistically update the metrics
      queryClient.setQueryData(['dashboard-metrics'], (old) => ({
        ...old,
        data: {
          ...old?.data,
          totalGroups: (old?.data?.totalGroups || 0) + 1,
          groupsChange: Math.max(0, (old?.data?.groupsChange || 0) + 1)
        }
      }));
      
      // Invalidate to refetch in background
      queryClient.invalidateQueries(['dashboard-metrics']);
      queryClient.invalidateQueries(['recent-groups']);
    };

    const handleMemberAdded = (event) => {
      const count = event.detail?.count || 1;
      queryClient.setQueryData(['dashboard-metrics'], (old) => ({
        ...old,
        data: {
          ...old?.data,
          activeMembers: (old?.data?.activeMembers || 0) + count,
          membersChange: Math.max(0, (old?.data?.membersChange || 0) + 1)
        }
      }));
      
      queryClient.invalidateQueries(['dashboard-metrics']);
    };

    const handleQuoteGenerated = (event) => {
      queryClient.setQueryData(['dashboard-metrics'], (old) => ({
        ...old,
        data: {
          ...old?.data,
          quotesGenerated: (old?.data?.quotesGenerated || 0) + 1,
          quotesChange: Math.max(0, (old?.data?.quotesChange || 0) + 1)
        }
      }));
      
      queryClient.invalidateQueries(['dashboard-metrics']);
      queryClient.invalidateQueries(['recent-quotes']);
    };

    // Add event listeners
    window.addEventListener('group-created', handleGroupCreated);
    window.addEventListener('member-added', handleMemberAdded);
    window.addEventListener('quote-generated', handleQuoteGenerated);

    // Cleanup
    return () => {
      window.removeEventListener('group-created', handleGroupCreated);
      window.removeEventListener('member-added', handleMemberAdded);
      window.removeEventListener('quote-generated', handleQuoteGenerated);
    };
  }, [queryClient]);

  const kpiCards = [
    {
      title: 'Total Groups',
      value: metricsData?.data?.totalGroups || 0,
      change: metricsData?.data?.groupsChange || 0,
      icon: <GroupIcon />,
      color: 'primary'
    },
    {
      title: 'Active Members',
      value: (metricsData?.data?.activeMembers || 0).toLocaleString(),
      change: metricsData?.data?.membersChange || 0,
      icon: <PersonIcon />,
      color: 'success'
    },
    {
      title: 'Quotes Generated',
      value: metricsData?.data?.quotesGenerated || 0,
      change: metricsData?.data?.quotesChange || 0,
      icon: <ReceiptIcon />,
      color: 'warning'
    },
    {
      title: 'Avg. Savings/Member',
      value: `$${(metricsData?.data?.avgSavings || 0).toLocaleString()}`,
      change: metricsData?.data?.savingsChange || 0,
      icon: <TrendingUpIcon />,
      color: 'info'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Group',
      description: 'Set up a new employer group with ICHRA classes',
      icon: <GroupIcon />,
      path: '/group-setup',
      color: 'primary'
    },
    {
      title: 'Add Members',
      description: 'Import employee data via CSV or manual entry',
      icon: <PersonIcon />,
      path: '/members',
      color: 'success'
    },
    {
      title: 'Generate Quote',
      description: 'Create ICHRA quotes with plan comparisons',
      icon: <AssessmentIcon />,
      path: '/quotes',
      color: 'info'
    }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome to Insurance Masters ICHRA Management Platform
        </p>
      </div>

      {/* System Status Alert */}
      {healthStatus?.error && (
        <div className="error-container">
          <div className="error-title">
            <ErrorIcon /> Backend Connection Failed
          </div>
          <div className="error-message">
            {healthStatus.error}. Please ensure the backend server is running on port 3001.
          </div>
        </div>
      )}

      {/* Metrics Error */}
      {metricsError && (
        <div className="warning-container">
          <div className="warning-title">
            Unable to load metrics
          </div>
          <div className="warning-message">
            {metricsError.message}. Displaying cached data if available.
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="dashboard-section">
        {loadingMetrics && !metricsData ? (
          <div className="grid grid-cols-1 grid-md-cols-2 grid-lg-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 grid-md-cols-2 grid-lg-cols-4">
            {kpiCards.map((kpi, index) => (
              <div key={index} className="kpi-card">
                <div className="kpi-label">{kpi.title}</div>
                <div className="flex items-center justify-between">
                  <div className="kpi-value">{kpi.value}</div>
                  <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
                </div>
                <div className={`kpi-change ${kpi.change >= 0 ? 'positive' : 'negative'}`}>
                  {kpi.change >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  {Math.abs(kpi.change)}% from last month
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-1 grid-md-cols-3">
          {quickActions.map((action, index) => (
            <div 
              key={index} 
              className="action-card"
              onClick={() => navigate(action.path)}
            >
              <div className={`action-icon ${action.color}`}>
                {action.icon}
              </div>
              <h3 className="action-title">{action.title}</h3>
              <p className="action-description">{action.description}</p>
              <button className="btn btn-primary btn-sm">
                Get Started →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 grid-lg-cols-2">
        {/* Recent Groups */}
        <div className="content-section">
          <h2 className="section-title">Recent Groups</h2>
          {loadingGroups && !recentGroups ? (
            <Loading type="pulse" lines={3} />
          ) : recentGroups?.data?.length > 0 ? (
            <div className="activity-list">
              {recentGroups.data.slice(0, 3).map((group) => (
                <div key={group.id} className="activity-item">
                  <div className="activity-icon success">
                    <CheckCircleIcon />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{group.name}</div>
                    <div className="activity-meta">
                      Created {formatDate(group.createdAt)} • {group.memberCount} employees
                    </div>
                  </div>
                  <span className={`status ${group.status === 'active' ? 'active' : 'pending'}`}>
                    {group.status === 'active' ? 'Active' : 'Setup'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-description">No groups created yet</p>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/group-setup')}
              >
                Create First Group
              </button>
            </div>
          )}
        </div>

        {/* Recent Quotes */}
        <div className="content-section">
          <h2 className="section-title">Recent Quotes</h2>
          {loadingQuotes && !recentQuotes ? (
            <Loading type="pulse" lines={3} />
          ) : recentQuotes?.data?.length > 0 ? (
            <div className="activity-list">
              {recentQuotes.data.slice(0, 3).map((quote) => (
                <div key={quote.id} className="activity-item">
                  <div className="activity-icon success">
                    <ReceiptIcon />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">Quote #{quote.quoteNumber}</div>
                    <div className="activity-meta">
                      {quote.groupName} • Generated {formatDate(quote.createdAt)} • {quote.planCount} plans
                    </div>
                  </div>
                  <div className="activity-value">
                    {formatCurrency(quote.totalValue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-description">No quotes generated yet</p>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/quotes')}
              >
                Generate Quote
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Platform Features */}
      <div className="dashboard-section">
        <h2 className="section-title">Platform Features</h2>
        <div className="grid grid-cols-1 grid-md-cols-2 grid-lg-cols-4">
          <div className="feature-item">
            <div className="feature-icon">
              <GroupIcon />
            </div>
            <h4 className="feature-title">Group Management</h4>
            <p className="feature-description">
              Create and manage employer groups with comprehensive settings
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <PersonIcon />
            </div>
            <h4 className="feature-title">Member Import</h4>
            <p className="feature-description">
              Bulk upload members via CSV with validation and mapping
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <AssessmentIcon />
            </div>
            <h4 className="feature-title">ICHRA Analysis</h4>
            <p className="feature-description">
              Calculate affordability and contribution strategies
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <ReceiptIcon />
            </div>
            <h4 className="feature-title">Quote Generation</h4>
            <p className="feature-description">
              Generate comprehensive quotes with plan comparisons
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;