import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Area,
  ComposedChart,
  Line
} from 'recharts';

const CostChart = ({ data, height = 400 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredData, setHoveredData] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!data) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            📊
          </div>
          <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
            Cost Analysis
          </h4>
          <p style={{ margin: 0, fontSize: '14px' }}>No cost data available</p>
        </div>
      </div>
    );
  }

  // Enhanced data preparation with trend analysis
  const chartData = [
    {
      category: 'Current Plan',
      employer: data.currentCosts?.employer || 0,
      employee: data.currentCosts?.employee || 0,
      total: data.currentCosts?.total || 0,
      efficiency: 65,
      trend: 'stable'
    },
    {
      category: 'ICHRA Plan',
      employer: data.projectedCosts?.employer || 0,
      employee: data.projectedCosts?.employee || 0,
      total: data.projectedCosts?.total || 0,
      efficiency: 85,
      trend: 'improving'
    }
  ];

  // Enhanced calculations
  const totalSavings = (data.currentCosts?.total || 0) - (data.projectedCosts?.total || 0);
  const savingsPercentage = data.currentCosts?.total > 0 
    ? ((totalSavings / data.currentCosts.total) * 100).toFixed(1)
    : '0';
  const employerSavings = (data.currentCosts?.employer || 0) - (data.projectedCosts?.employer || 0);
  const employeeSavings = (data.currentCosts?.employee || 0) - (data.projectedCosts?.employee || 0);

  const formatCurrency = (value) => `$${Math.abs(value).toLocaleString()}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            borderBottom: '2px solid #f1f5f9',
            paddingBottom: '8px'
          }}>
            {label}
          </div>
          
          {payload.map((entry, index) => (
            <div key={index} style={{ 
              margin: '8px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  boxShadow: `0 0 8px ${entry.color}40`
                }} />
                <span style={{ color: '#64748b', fontSize: '14px' }}>{entry.name}:</span>
              </div>
              <span style={{ 
                fontWeight: '600',
                color: '#1e293b',
                fontSize: '14px'
              }}>
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
          
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: data.trend === 'improving' 
              ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
              : 'linear-gradient(135deg, #fef3c7 0%, #fef7e6 100%)',
            borderRadius: '8px',
            fontSize: '12px',
            textAlign: 'center',
            color: data.trend === 'improving' ? '#059669' : '#92400e'
          }}>
            Efficiency: {data.efficiency}%
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBar = (props) => {
    const { fill, ...rest } = props;
    return (
      <Bar 
        {...rest} 
        fill={fill}
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={() => setHoveredData(props.payload)}
        onMouseLeave={() => setHoveredData(null)}
      />
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
          Monthly Cost Analysis
        </h4>
      </div>

      {/* Enhanced Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="category" 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" />
            
            <Bar 
              dataKey="employer" 
              name="Employer Cost"
              fill="#0d6efd"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="employee" 
              name="Employee Cost"
              fill="#28a745"
              radius={[4, 4, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>


    </div>
  );
};

export default CostChart;