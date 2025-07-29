import React, { useState } from 'react';
import { 
  GroupIcon, 
  PersonIcon, 
  ReceiptIcon,
  TrendingUpIcon,
  ArrowRightIcon
} from '../../components/Icons/Icons';
import Button from '../../components/common/Button';
import './WelcomeStep.css';

const WelcomeStep = ({ onComplete, workflowData }) => {
  const [selectedType, setSelectedType] = useState(workflowData?.quoteType || '');

  const quoteTypes = [
    {
      id: 'new-group',
      title: 'New Group Quote',
      description: 'Set up a new employer group with ICHRA classes',
      icon: <GroupIcon />,
      estimatedTime: '10-15 minutes',
      savings: 'Average savings: $2,400/year per employer'
    },
    {
      id: 'existing-group',
      title: 'Quote for Existing Group',
      description: 'Generate quotes for a group already in the system',
      icon: <ReceiptIcon />,
      estimatedTime: '5-10 minutes',
      savings: 'Typical savings: 15-25% on premiums'
    }
  ];

  const benefits = [
    'Automated ICHRA affordability calculations',
    'Real-time plan comparisons across all carriers',
    'Instant savings calculations for employers and employees',
    'Export-ready quotes and reports'
  ];

  const handleContinue = () => {
    if (selectedType) {
      onComplete({ quoteType: selectedType });
    }
  };

  return (
    <div className="welcome-step">
      <div className="welcome-header">
        <h1 className="welcome-title">Welcome to Insurance Masters Quote Builder</h1>
        <p className="welcome-subtitle">
          Let's create a comprehensive ICHRA quote in just a few minutes
        </p>
      </div>

      <div className="quote-type-selection">
        <h2 className="section-title">What would you like to do today?</h2>
        
        <div className="quote-type-cards">
          {quoteTypes.map(type => (
            <div
              key={type.id}
              className={`quote-type-card ${selectedType === type.id ? 'selected' : ''}`}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="card-icon">{type.icon}</div>
              <h3 className="card-title">{type.title}</h3>
              <p className="card-description">{type.description}</p>
              
              <div className="card-meta">
                <span className="time-estimate">⏱ {type.estimatedTime}</span>
                <span className="savings-estimate">💰 {type.savings}</span>
              </div>
              
              <div className="selection-indicator">
                {selectedType === type.id ? '✓ Selected' : 'Select'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="benefits-section">
        <h3 className="benefits-title">
          <TrendingUpIcon /> What you'll get with this quote:
        </h3>
        <ul className="benefits-list">
          {benefits.map((benefit, index) => (
            <li key={index} className="benefit-item">
              <span className="benefit-check">✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="welcome-footer">
        <div className="progress-info">
          <p className="progress-text">
            This workflow saves brokers an average of <strong>3 hours</strong> per quote
          </p>
        </div>
        
        <Button
          variant="primary"
          size="large"
          onClick={handleContinue}
          disabled={!selectedType}
          icon={<ArrowRightIcon />}
          iconPosition="right"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default WelcomeStep;