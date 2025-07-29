import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import './ClassTemplates.css';

const CLASS_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Full/Part Time',
    description: 'Basic setup for full-time and part-time employees',
    icon: '👥',
    classes: [
      {
        name: 'Full-time Employees',
        type: 'full-time',
        employeeContribution: 500,
        dependentContribution: 300
      },
      {
        name: 'Part-time Employees',
        type: 'part-time',
        employeeContribution: 250,
        dependentContribution: 150
      }
    ]
  },
  {
    id: 'tiered',
    name: 'Tiered by Role',
    description: 'Different contributions based on employee level',
    icon: '📊',
    classes: [
      {
        name: 'Executive',
        type: 'salaried',
        employeeContribution: 1000,
        dependentContribution: 600
      },
      {
        name: 'Manager',
        type: 'salaried',
        employeeContribution: 700,
        dependentContribution: 400
      },
      {
        name: 'Staff',
        type: 'full-time',
        employeeContribution: 500,
        dependentContribution: 300
      }
    ]
  },
  {
    id: 'location',
    name: 'Location-Based',
    description: 'Different contributions for different office locations',
    icon: '📍',
    classes: [
      {
        name: 'Headquarters',
        type: 'full-time',
        employeeContribution: 600,
        dependentContribution: 350
      },
      {
        name: 'Remote',
        type: 'full-time',
        employeeContribution: 500,
        dependentContribution: 300
      },
      {
        name: 'Satellite Office',
        type: 'full-time',
        employeeContribution: 550,
        dependentContribution: 325
      }
    ]
  },
  {
    id: 'comprehensive',
    name: 'Comprehensive',
    description: 'Full range of employee types with age-based tiers',
    icon: '🎯',
    classes: [
      {
        name: 'Executive',
        type: 'salaried',
        employeeContribution: 800,
        dependentContribution: 500,
        ageBasedContributions: [
          { minAge: 0, maxAge: 29, employeeContribution: 600, dependentContribution: 400 },
          { minAge: 30, maxAge: 49, employeeContribution: 800, dependentContribution: 500 },
          { minAge: 50, maxAge: 120, employeeContribution: 1000, dependentContribution: 600 }
        ]
      },
      {
        name: 'Full-time',
        type: 'full-time',
        employeeContribution: 500,
        dependentContribution: 300
      },
      {
        name: 'Part-time',
        type: 'part-time',
        employeeContribution: 250,
        dependentContribution: 150
      },
      {
        name: 'Seasonal',
        type: 'seasonal',
        employeeContribution: 200,
        dependentContribution: 100
      }
    ]
  }
];

const ClassTemplates = ({ onSelectTemplate, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleConfirmTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.classes);
      onClose();
    }
  };

  return (
    <>
      <div className="class-templates">
        <div className="templates-header">
          <h3>Choose a Template</h3>
          <p>Start with a pre-configured template and customize as needed</p>
        </div>

        <div className="templates-grid">
          {CLASS_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="template-icon">{template.icon}</div>
              <h4 className="template-name">{template.name}</h4>
              <p className="template-description">{template.description}</p>
              <div className="template-classes-count">
                {template.classes.length} classes
              </div>
            </div>
          ))}
        </div>

        <div className="templates-footer">
          <Button variant="ghost" onClick={onClose}>
            Skip Templates
          </Button>
        </div>
      </div>

      {/* Template Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Preview: ${selectedTemplate?.name}`}
        size="medium"
      >
        {selectedTemplate && (
          <div className="template-preview">
            <p className="preview-description">{selectedTemplate.description}</p>
            
            <div className="preview-classes">
              <h4>Classes in this template:</h4>
              {selectedTemplate.classes.map((cls, index) => (
                <div key={index} className="preview-class">
                  <div className="class-header">
                    <span className="class-name">{cls.name}</span>
                    <span className="class-type">{cls.type}</span>
                  </div>
                  <div className="class-contributions">
                    <div className="contribution">
                      <span className="contribution-label">Employee:</span>
                      <span className="contribution-amount">${cls.employeeContribution}/mo</span>
                    </div>
                    <div className="contribution">
                      <span className="contribution-label">Dependent:</span>
                      <span className="contribution-amount">${cls.dependentContribution}/mo</span>
                    </div>
                  </div>
                  {cls.ageBasedContributions && (
                    <div className="age-tiers">
                      <span className="tiers-label">Age-based tiers included</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="preview-actions">
              <Button
                variant="secondary"
                onClick={() => setShowPreview(false)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmTemplate}
              >
                Use This Template
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export const useClassTemplates = () => {
  const [showTemplates, setShowTemplates] = useState(false);
  
  const openTemplates = () => setShowTemplates(true);
  const closeTemplates = () => setShowTemplates(false);
  
  return {
    showTemplates,
    openTemplates,
    closeTemplates,
    ClassTemplatesModal: ({ onSelectTemplate }) => (
      showTemplates && (
        <Modal
          isOpen={showTemplates}
          onClose={closeTemplates}
          title="Class Templates"
          size="large"
        >
          <ClassTemplates
            onSelectTemplate={onSelectTemplate}
            onClose={closeTemplates}
          />
        </Modal>
      )
    )
  };
};

export default ClassTemplates;