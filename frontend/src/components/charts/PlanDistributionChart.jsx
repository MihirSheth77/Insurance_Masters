import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap
} from 'recharts';

const PlanDistributionChart = ({ data, type = 'pie', height = 400 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [viewType, setViewType] = useState(type);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 700);
    return () => clearTimeout(timer);
  }, []);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'white'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '18px', fontWeight: '600' }}>
            Plan Distribution
          </h4>
          <p style={{ margin: 0, fontSize: '14px' }}>No plan data available</p>
        </div>
      </div>
    );
  }

  // Enhanced data preparation
  const chartData = Object.entries(data).map(([key, value], index) => {
    const planValue = typeof value === 'object' ? value.count || value.planCount || 0 : value;
    return {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: planValue,
      percentage: 0, // Will be calculated below
      id: `plan-${index}`,
      metalLevel: key.toLowerCase()
    };
  });

  // Calculate percentages and totals
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  chartData.forEach(item => {
    item.percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
  });

  // Enhanced color mapping with gradients
  const colorMap = {
    'Bronze': { 
      primary: '#cd7f32', 
      secondary: '#e49b3d',
      gradient: 'linear-gradient(135deg, #cd7f32 0%, #e49b3d 100%)'
    },
    'Silver': { 
      primary: '#c0c0c0', 
      secondary: '#d4d4d4',
      gradient: 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)'
    },
    'Gold': { 
      primary: '#ffd700', 
      secondary: '#ffed4e',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
    },
    'Platinum': { 
      primary: '#e5e4e2', 
      secondary: '#f7f7f7',
      gradient: 'linear-gradient(135deg, #a8a8a8 0%, #e5e4e2 100%)'
    },
    'Catastrophic': { 
      primary: '#8b5a2b', 
      secondary: '#a0661f',
      gradient: 'linear-gradient(135deg, #8b5a2b 0%, #a0661f 100%)'
    }
  };

  const defaultColors = [
    { primary: '#3b82f6', secondary: '#60a5fa', gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' },
    { primary: '#10b981', secondary: '#34d399', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
    { primary: '#f59e0b', secondary: '#fbbf24', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
    { primary: '#ef4444', secondary: '#f87171', gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' },
    { primary: '#8b5cf6', secondary: '#a78bfa', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' },
    { primary: '#06b6d4', secondary: '#22d3ee', gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' }
  ];

  const getColors = (name, index) => {
    const colorKey = name.toLowerCase();
    if (colorMap[colorKey]) return colorMap[colorKey];
    return defaultColors[index % defaultColors.length];
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const colors = getColors(data.name, 0);
      
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          minWidth: '200px',
          transform: 'translateY(-10px)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontWeight: '700', 
            color: '#1e293b',
            fontSize: '16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: colors.gradient,
              boxShadow: `0 0 8px ${colors.primary}40`
            }} />
            {data.name} Level
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Available Plans:</span>
            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '16px' }}>
              {data.value}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Percentage:</span>
            <span style={{ fontWeight: '600', color: colors.primary, fontSize: '16px' }}>
              {data.payload?.percentage}%
            </span>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: `${colors.primary}10`,
            borderRadius: '8px',
            fontSize: '12px',
            textAlign: 'center',
            color: colors.primary,
            fontWeight: '500'
          }}>
            {data.value} of {total} total plans
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

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.1) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const ViewTypeSelector = () => (
    <div style={{
      display: 'flex',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '4px',
      gap: '4px'
    }}>
      {[
        { key: 'pie', label: '🥧 Pie', desc: 'Proportional view' },
        { key: 'bar', label: '📊 Bar', desc: 'Comparative view' },
        { key: 'treemap', label: '🗃️ Tree', desc: 'Hierarchical view' }
      ].map(mode => (
        <button
          key={mode.key}
          onClick={() => setViewType(mode.key)}
          style={{
            padding: '8px 12px',
            background: viewType === mode.key 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: viewType === mode.key ? '#1e293b' : '#64748b',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: viewType === mode.key ? 'blur(10px)' : 'none'
          }}
          title={mode.desc}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  const renderPieChart = () => (
    <div style={{ height: height - 160, display: 'flex', alignItems: 'center', gap: '32px' }}>
      <div style={{ flex: 1, height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={Math.min(140, (height - 160) / 3)}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={1200}
              animationBegin={400}
            >
              {chartData.map((entry, index) => {
                const colors = getColors(entry.name, index);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors.primary}
                    stroke={activeIndex === index ? '#ffffff' : colors.secondary}
                    strokeWidth={activeIndex === index ? 4 : 1}
                    style={{
                      filter: activeIndex === index 
                        ? 'brightness(1.1) drop-shadow(0 0 15px rgba(255,255,255,0.4))' 
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Legend with metrics */}
      <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {chartData.map((entry, index) => {
          const colors = getColors(entry.name, index);
          return (
            <div 
              key={entry.id}
              style={{
                padding: '16px',
                background: activeIndex === index 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                border: `1px solid ${activeIndex === index ? colors.primary : 'rgba(255, 255, 255, 0.1)'}`,
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: activeIndex === index ? 'translateX(4px)' : 'translateX(0)'
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    background: colors.gradient,
                    boxShadow: `0 0 8px ${colors.primary}40`
                  }} />
                  <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                    {entry.name}
                  </span>
                </div>
                <span style={{ 
                  fontWeight: '700', 
                  color: colors.primary,
                  fontSize: '16px'
                }}>
                  {entry.value}
                </span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#64748b',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{entry.percentage}% of total</span>
                <span>plans available</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBarChart = () => (
    <div style={{ height: height - 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            {chartData.map((entry, index) => {
              const colors = getColors(entry.name, index);
              return (
                <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={1} />
                  <stop offset="100%" stopColor={colors.secondary} stopOpacity={0.8} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(226, 232, 240, 0.5)' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(226, 232, 240, 0.5)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#gradient-${index})`}
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

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
          Plan Distribution by Metal Level
        </h4>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderPieChart()}
      </div>


    </div>
  );
};

export default PlanDistributionChart; 