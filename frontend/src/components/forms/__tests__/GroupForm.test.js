// Component Tests for GroupForm
// Tests form validation, ZIP code resolution, and user interactions

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../../../setupTests';
import { rest } from 'msw';
import GroupForm from '../GroupForm';

// Mock the useGeographic hook
const mockUseGeographic = {
  zipCode: '',
  resolvedCounty: null,
  multiCountyOptions: [],
  isLoading: false,
  error: null,
  showMultiCountyModal: false,
  resolveZipCode: jest.fn(),
  selectCounty: jest.fn(),
  clearSelection: jest.fn()
};

jest.mock('../../../hooks/useGeographic', () => ({
  __esModule: true,
  default: () => mockUseGeographic
}));

describe('GroupForm Component', () => {
  let user;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });
  
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
    initialData: null
  };
  
  const renderGroupForm = (props = {}) => {
    return testUtils.renderWithProviders(
      <GroupForm {...defaultProps} {...props} />
    );
  };
  
  describe('Basic Rendering', () => {
    test('should render all required form fields', () => {
      renderGroupForm();
      
      expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
    
    test('should render with initial data when provided', () => {
      const initialData = {
        groupName: 'Test Company',
        address: {
          street: '123 Main St',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701'
        },
        effectiveDate: '2024-01-01'
      };
      
      renderGroupForm({ initialData });
      
      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Austin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('TX')).toBeInTheDocument();
      expect(screen.getByDisplayValue('78701')).toBeInTheDocument();
    });
    
    test('should show loading state correctly', () => {
      renderGroupForm({ isLoading: true });
      
      const submitButton = screen.getByRole('button', { name: /creating.../i });
      expect(submitButton).toBeDisabled();
    });
  });
  
  describe('Form Validation', () => {
    test('should show validation errors for required fields', async () => {
      renderGroupForm();
      
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/group name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/street address is required/i)).toBeInTheDocument();
        expect(screen.getByText(/city is required/i)).toBeInTheDocument();
        expect(screen.getByText(/zip code is required/i)).toBeInTheDocument();
        expect(screen.getByText(/effective date is required/i)).toBeInTheDocument();
      });
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
    
    test('should validate group name length', async () => {
      renderGroupForm();
      
      const groupNameInput = screen.getByLabelText(/group name/i);
      
      // Test minimum length
      await user.type(groupNameInput, 'A');
      await user.tab(); // Trigger blur validation
      
      await waitFor(() => {
        expect(screen.getByText(/group name must be at least 2 characters/i)).toBeInTheDocument();
      });
      
      // Test maximum length
      await user.clear(groupNameInput);
      await user.type(groupNameInput, 'A'.repeat(101));
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/group name must be less than 100 characters/i)).toBeInTheDocument();
      });
    });
    
    test('should validate effective date is not in the past', async () => {
      renderGroupForm();
      
      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      const pastDateString = pastDate.toISOString().split('T')[0];
      
      await user.type(effectiveDateInput, pastDateString);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/effective date cannot be in the past/i)).toBeInTheDocument();
      });
    });
    
    test('should validate effective date is not too far in future', async () => {
      renderGroupForm();
      
      const effectiveDateInput = screen.getByLabelText(/effective date/i);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      await user.type(effectiveDateInput, futureDateString);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/effective date cannot be more than 1 year in the future/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('ZIP Code Resolution', () => {
    test('should trigger ZIP resolution on valid ZIP input', async () => {
      mockUseGeographic.resolveZipCode.mockClear();
      
      renderGroupForm();
      
      const zipInput = screen.getByLabelText(/zip code/i);
      await user.type(zipInput, '78701');
      
      // Should trigger resolution after debounce
      await waitFor(() => {
        expect(mockUseGeographic.resolveZipCode).toHaveBeenCalledWith('78701');
      }, { timeout: 2000 });
    });
    
    test('should not trigger resolution for invalid ZIP format', async () => {
      mockUseGeographic.resolveZipCode.mockClear();
      
      renderGroupForm();
      
      const zipInput = screen.getByLabelText(/zip code/i);
      await user.type(zipInput, 'INVALID');
      
      await testUtils.waitFor(1000);
      
      expect(mockUseGeographic.resolveZipCode).not.toHaveBeenCalled();
    });
    
    test('should show loading state during ZIP resolution', () => {
      mockUseGeographic.isLoading = true;
      
      renderGroupForm();
      
      expect(screen.getByText(/resolving zip code.../i)).toBeInTheDocument();
    });
    
    test('should display resolved county information', () => {
      mockUseGeographic.resolvedCounty = {
        countyId: 'TRAVIS_TX',
        countyName: 'Travis',
        stateAbbreviation: 'TX',
        stateName: 'Texas'
      };
      
      renderGroupForm();
      
      expect(screen.getByText(/county: travis, tx/i)).toBeInTheDocument();
    });
    
    test('should show error message for invalid ZIP', () => {
      mockUseGeographic.error = 'ZIP code not found in our service area';
      
      renderGroupForm();
      
      expect(screen.getByText(/zip code not found in our service area/i)).toBeInTheDocument();
    });
  });
  
  describe('Multi-County ZIP Handling', () => {
    test('should show multi-county modal when ZIP has multiple counties', () => {
      mockUseGeographic.showMultiCountyModal = true;
      mockUseGeographic.multiCountyOptions = [
        { countyId: 'COUNTY_A', countyName: 'County A', stateAbbreviation: 'TX' },
        { countyId: 'COUNTY_B', countyName: 'County B', stateAbbreviation: 'TX' },
        { countyId: 'COUNTY_C', countyName: 'County C', stateAbbreviation: 'TX' }
      ];
      
      renderGroupForm();
      
      expect(screen.getByText(/multiple counties found/i)).toBeInTheDocument();
      expect(screen.getByText(/county a, tx/i)).toBeInTheDocument();
      expect(screen.getByText(/county b, tx/i)).toBeInTheDocument();
      expect(screen.getByText(/county c, tx/i)).toBeInTheDocument();
    });
    
    test('should handle county selection from modal', async () => {
      mockUseGeographic.showMultiCountyModal = true;
      mockUseGeographic.multiCountyOptions = [
        { countyId: 'COUNTY_A', countyName: 'County A', stateAbbreviation: 'TX' },
        { countyId: 'COUNTY_B', countyName: 'County B', stateAbbreviation: 'TX' }
      ];
      
      renderGroupForm();
      
      const countyAOption = screen.getByText(/county a, tx/i);
      await user.click(countyAOption);
      
      expect(mockUseGeographic.selectCounty).toHaveBeenCalledWith({
        countyId: 'COUNTY_A',
        countyName: 'County A',
        stateAbbreviation: 'TX'
      });
    });
  });
  
  describe('Form Submission', () => {
    test('should submit valid form data', async () => {
      mockUseGeographic.resolvedCounty = {
        countyId: 'TRAVIS_TX',
        countyName: 'Travis',
        stateAbbreviation: 'TX'
      };
      
      renderGroupForm();
      
      // Fill out the form
      await user.type(screen.getByLabelText(/group name/i), 'Test Company');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Austin');
      await user.selectOptions(screen.getByLabelText(/state/i), 'TX');
      await user.type(screen.getByLabelText(/zip code/i), '78701');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      await user.type(screen.getByLabelText(/effective date/i), tomorrowString);
      
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          groupName: 'Test Company',
          address: {
            street: '123 Main St',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            county: 'TRAVIS_TX'
          },
          effectiveDate: tomorrowString
        });
      });
    });
    
    test('should not submit form without resolved county', async () => {
      mockUseGeographic.resolvedCounty = null;
      
      renderGroupForm();
      
      // Fill out the form without resolving ZIP
      await user.type(screen.getByLabelText(/group name/i), 'Test Company');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Austin');
      await user.selectOptions(screen.getByLabelText(/state/i), 'TX');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      await user.type(screen.getByLabelText(/effective date/i), tomorrowString);
      
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please resolve zip code first/i)).toBeInTheDocument();
      });
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
    
    test('should handle submission errors', async () => {
      // Mock API error
      server.use(
        rest.post('/api/groups', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'Group name already exists' }
            })
          );
        })
      );
      
      mockUseGeographic.resolvedCounty = {
        countyId: 'TRAVIS_TX',
        countyName: 'Travis',
        stateAbbreviation: 'TX'
      };
      
      renderGroupForm();
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/group name/i), 'Duplicate Company');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Austin');
      await user.selectOptions(screen.getByLabelText(/state/i), 'TX');
      await user.type(screen.getByLabelText(/zip code/i), '78701');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(screen.getByLabelText(/effective date/i), tomorrow.toISOString().split('T')[0]);
      
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/group name already exists/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Cancel Functionality', () => {
    test('should call onCancel when cancel button is clicked', async () => {
      renderGroupForm();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
    
    test('should show confirmation dialog when form has unsaved changes', async () => {
      renderGroupForm();
      
      // Make some changes
      await user.type(screen.getByLabelText(/group name/i), 'Some changes');
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to leave/i)).toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      renderGroupForm();
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/group name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/zip code/i)).toHaveAttribute('aria-describedby');
    });
    
    test('should announce validation errors to screen readers', async () => {
      renderGroupForm();
      
      const submitButton = screen.getByRole('button', { name: /create group/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/group name is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
    
    test('should support keyboard navigation', async () => {
      renderGroupForm();
      
      const groupNameInput = screen.getByLabelText(/group name/i);
      groupNameInput.focus();
      
      expect(groupNameInput).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/street address/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/city/i)).toHaveFocus();
    });
  });
}); 