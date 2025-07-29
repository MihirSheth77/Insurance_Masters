import React, { useState } from 'react';
import { InfoIcon } from '../Icons/Icons';
import './Tooltip.css';

const Tooltip = ({ 
  content, 
  position = 'top', 
  trigger = 'hover',
  maxWidth = 300,
  children 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  return (
    <div className="tooltip-wrapper">
      <div
        className="tooltip-trigger"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        {children || <InfoIcon className="tooltip-icon" />}
      </div>
      
      {isVisible && (
        <div
          id="tooltip-content"
          className={`tooltip-content tooltip-${position}`}
          style={{ maxWidth }}
          role="tooltip"
        >
          <div className="tooltip-arrow" />
          <div className="tooltip-body">{content}</div>
        </div>
      )}
    </div>
  );
};

// Help text component for form fields
export const HelpText = ({ text, className = '' }) => (
  <div className={`help-text ${className}`}>
    <InfoIcon className="help-icon" />
    <span>{text}</span>
  </div>
);

// ICHRA-specific tooltips
export const ICHRATooltips = {
  employeeContribution: "The monthly amount the employer will contribute towards the employee's health insurance premium. This amount is tax-free for both employer and employee.",
  
  dependentContribution: "The monthly amount the employer will contribute towards each dependent's health insurance premium. Can be different from the employee contribution.",
  
  ageBasedContribution: "Set different contribution amounts based on employee age bands. This helps optimize costs while maintaining compliance.",
  
  ichraClass: "Employee classes allow you to offer different contribution amounts to different groups (e.g., full-time vs part-time, executives vs staff).",
  
  affordability: "ICHRA contributions must be 'affordable' based on the employee's household income and the lowest-cost silver plan available.",
  
  previousContribution: "The amount the employee's previous employer contributed to their health insurance. Used for comparison and savings calculations.",
  
  fpl: "Federal Poverty Level - Used to determine subsidy eligibility and ICHRA affordability requirements.",
  
  onMarket: "Plans available through the ACA marketplace that may qualify for premium tax credits.",
  
  offMarket: "Plans sold directly by insurance companies, not eligible for subsidies but may offer different benefits.",
  
  metalLevel: "Bronze (60% actuarial value), Silver (70%), Gold (80%), or Platinum (90%). Higher metal levels have higher premiums but lower out-of-pocket costs."
};

export default Tooltip;