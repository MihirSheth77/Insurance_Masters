import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

const SavingsChart = ({ data, height = 400 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [viewMode, setViewMode] = useState('breakdown'); // 'breakdown', 'timeline', 'comparison'

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!data) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'white'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
            Savings Analysis
          </h4>
          <p style={{ margin: 0, fontSize: '14px' }}>No savings data available</p>
        </div>
      </div>
    );
  }

  // Enhanced data preparation
  const totalSavings = data.estimatedSavings || 0;
  const avgMonthlyPerEmployee = data.averageSavingsPerMember || 0;
  
  // Pie chart data for savings distribution
  const pieData = [
    { 
      name: 'Employer Benefits', 
      value: Math.abs(totalSavings * 0.65), 
      color: '#3b82f6',
      description: 'Reduced premium costs and administrative expenses'
    },
    { 
      name: 'Employee Benefits', 
      value: Math.abs(totalSavings * 0.35), 
      color: '#10b981',
      description: 'Lower out-of-pocket costs and increased choice'
    }
  ];

  // Timeline data for projected savings
  const timelineData = [
    { month: 'Month 1', cumulative: avgMonthlyPerEmployee * 1, monthly: avgMonthlyPerEmployee },
    { month: 'Month 3', cumulative: avgMonthlyPerEmployee * 3, monthly: avgMonthlyPerEmployee },
    { month: 'Month 6', cumulative: avgMonthlyPerEmployee * 6, monthly: avgMonthlyPerEmployee },
    { month: 'Month 12', cumulative: avgMonthlyPerEmployee * 12, monthly: avgMonthlyPerEmployee },
    { month: 'Year 2', cumulative: avgMonthlyPerEmployee * 24, monthly: avgMonthlyPerEmployee },
    { month: 'Year 3', cumulative: avgMonthlyPerEmployee * 36, monthly: avgMonthlyPerEmployee },
    { month: 'Year 5', cumulative: avgMonthlyPerEmployee * 60, monthly: avgMonthlyPerEmployee }
  ];

  const formatCurrency = (value) => `$${Math.abs(value).toLocaleString()}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          minWidth: '220px',
          transform: 'translateY(-10px)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontWeight: '700', 
            color: '#1e293b',
            fontSize: '16px',
            marginBottom: '12px',
            borderBottom: '2px solid #f1f5f9',
            paddingBottom: '8px'
          }}>
            {data.name || label}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Annual Value
            </div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: data.color || '#10b981'
            }}>
              {formatCurrency(data.value)}
            </div>
          </div>

          {data.payload?.description && (
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              lineHeight: '1.4',
              marginTop: '8px',
              padding: '8px',
              background: '#f8fafc',
              borderRadius: '6px'
            }}>
              {data.payload.description}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{
          background: 'white',
          padding: '1rem',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          minWidth: '180px'
        }}>
          <div style={{ 
            fontWeight: '600', 
            color: '#333',
            fontSize: '0.9rem',
            marginBottom: '0.5rem'
          }}>
            {data.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
            Amount: {formatCurrency(data.value)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            Percentage: {Math.round((data.value / totalSavings) * 100)}%
          </div>
        </div>
      );
    }
    return null;
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const ViewModeSelector = () => (
    <div style={{
      display: 'flex',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '4px',
      gap: '4px'
    }}>
      {[
        { key: 'breakdown', label: '📊 Breakdown', desc: 'Distribution view' },
        { key: 'timeline', label: '📈 Timeline', desc: 'Growth projection' },
        { key: 'comparison', label: '⚖️ Compare', desc: 'Cost comparison' }
      ].map(mode => (
        <button
          key={mode.key}
          onClick={() => setViewMode(mode.key)}
          style={{
            padding: '8px 12px',
            background: viewMode === mode.key 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: viewMode === mode.key ? '#1e293b' : '#64748b',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: viewMode === mode.key ? 'blur(10px)' : 'none'
          }}
          title={mode.desc}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  const renderBreakdownView = () => (
    <div style={{ 
      display: 'flex', 
      flex: 1,
      gap: '1rem',
      alignItems: 'stretch',
      minHeight: 0
    }}>
      {/* Pie Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{
          padding: '1rem',
          background: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#0d6efd', marginBottom: '0.5rem', fontWeight: '500' }}>
            Per Employee Annual Savings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d6efd', marginBottom: '0.25rem' }}>
            {formatCurrency(avgMonthlyPerEmployee * 12)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            ≈ ${avgMonthlyPerEmployee.toFixed(0)}/month per employee
          </div>
        </div>

        <div style={{
          padding: '1rem',
          background: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#0d6efd', marginBottom: '0.5rem', fontWeight: '500' }}>
            Total Annual Savings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d6efd', marginBottom: '0.25rem' }}>
            {formatCurrency(totalSavings)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            Employer + Employee combined
          </div>
        </div>

        <div style={{
          padding: '1rem',
          background: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#b45309', marginBottom: '0.5rem', fontWeight: '500' }}>
            5-Year Projection
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#b45309', marginBottom: '0.25rem' }}>
            {formatCurrency(totalSavings * 5)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            Cumulative savings over 5 years
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimelineView = () => (
    <div style={{ height: height - 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(226, 232, 240, 0.5)' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(226, 232, 240, 0.5)' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                      {label}
                    </div>
                    <div style={{ color: '#10b981', fontSize: '14px' }}>
                      Cumulative: {formatCurrency(payload[0].value)}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#10b981" 
            strokeWidth={3}
            fill="url(#cumulativeGradient)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderComparisonView = () => {
    const comparisonData = [
      { category: 'Monthly Cost Per Employee', current: 450, ichra: 290 },
      { category: 'Annual Admin Costs', current: 5000, ichra: 2000 },
      { category: 'Employee Out-of-Pocket', current: 2400, ichra: 1800 }
    ];

    return (
      <div style={{ height: height - 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis 
              dataKey="category" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: 'rgba(226, 232, 240, 0.5)' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: 'rgba(226, 232, 240, 0.5)' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="current" 
              stackId="1"
              stroke="#f59e0b" 
              fill="rgba(245, 158, 11, 0.3)"
              name="Current Plan"
            />
            <Area 
              type="monotone" 
              dataKey="ichra" 
              stackId="2"
              stroke="#10b981" 
              fill="rgba(16, 185, 129, 0.3)"
              name="ICHRA Plan"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div style={{ 
      height, 
      padding: '1rem',
      background: 'white',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>


      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ 
          margin: '0 0 0.5rem 0', 
          color: '#333', 
          fontSize: '1.1rem',
          fontWeight: '600'
        }}>
          ICHRA Savings Analysis
        </h4>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderBreakdownView()}
      </div>


    </div>
  );
};

export default SavingsChart;