/**
 * Navigation Component
 * Professional sidebar navigation with responsive design
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardIcon,
  GroupIcon,
  ClassIcon,
  PersonIcon,
  ReceiptIcon,
  MenuIcon,
  CloseIcon,
  ExpandMoreIcon,
  ExpandLessIcon,
  LogoutIcon,
  SettingsIcon,
  HelpIcon,
  DatabaseIcon
} from '../Icons/Icons';
import QuoteOptionsModal from '../quote/QuoteOptionsModal';
import GroupSelector from '../GroupSelector/GroupSelector';
import useQuoteOptions from '../../hooks/useQuoteOptions';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const { showOptionsModal, openQuoteOptions, closeQuoteOptions } = useQuoteOptions();

  const navItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      exact: true
    },
    {
      id: 'workflow',
      title: 'New Quote Workflow',
      icon: <ReceiptIcon />,
      path: '/workflow',
      highlight: true
    },
    {
      id: 'groups',
      title: 'Groups',
      icon: <GroupIcon />,
      path: '/groups'
    },
    {
      id: 'classes',
      title: 'Classes',
      icon: <ClassIcon />,
      path: '/classes'
    },
    {
      id: 'members',
      title: 'Members',
      icon: <PersonIcon />,
      path: '/members'
    },
    {
      id: 'quotes',
      title: 'Quotes',
      icon: <ReceiptIcon />,
      path: '/quotes'
    },
    {
      id: 'data',
      title: 'Data Management',
      icon: <DatabaseIcon />,
      path: '/data-management'
    }
  ];

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isActiveRoute = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    if (item.path) {
      return location.pathname.startsWith(item.path);
    }
    if (item.subItems) {
      return item.subItems.some(sub => location.pathname.startsWith(sub.path));
    }
    return false;
  };

  const handleNavClick = (item) => {
    if (item.action) {
      item.action();
      setIsMobileMenuOpen(false);
    } else if (item.path) {
      navigate(item.path);
      setIsMobileMenuOpen(false);
    } else if (item.subItems) {
      toggleMenu(item.id);
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Navigation Sidebar */}
      <nav className={`navigation-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="nav-header">
          <div className="nav-logo">
            <h2>Insurance Masters</h2>
            <p className="nav-tagline">ICHRA Management Platform</p>
          </div>
        </div>

        <div className="nav-content">
          <ul className="nav-list">
            {navItems.map(item => (
              <li key={item.id} className="nav-item">
                <div
                  className={`nav-link ${isActiveRoute(item) ? 'active' : ''}`}
                  onClick={() => handleNavClick(item)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-title">{item.title}</span>
                  {item.subItems && (
                    <span className="nav-expand">
                      {expandedMenus[item.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </span>
                  )}
                </div>

                {/* Sub-menu items */}
                {item.subItems && expandedMenus[item.id] && (
                  <ul className="nav-submenu">
                    {item.subItems.map((subItem, index) => (
                      <li key={index}>
                        <Link
                          to={subItem.path}
                          className={`nav-sublink ${location.pathname === subItem.path ? 'active' : ''}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* Bottom Navigation Items */}
          <div className="nav-bottom">
            <ul className="nav-list">
              <li className="nav-item">
                <div className="nav-link">
                  <span className="nav-icon"><SettingsIcon /></span>
                  <span className="nav-title">Settings</span>
                </div>
              </li>
              <li className="nav-item">
                <div className="nav-link">
                  <span className="nav-icon"><HelpIcon /></span>
                  <span className="nav-title">Help & Support</span>
                </div>
              </li>
              <li className="nav-item">
                <div className="nav-link nav-logout">
                  <span className="nav-icon"><LogoutIcon /></span>
                  <span className="nav-title">Sign Out</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="nav-user">
          <div className="user-avatar">JD</div>
          <div className="user-info">
            <div className="user-name">John Doe</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Quote Options Modal */}
      <QuoteOptionsModal 
        isOpen={showOptionsModal} 
        onClose={closeQuoteOptions} 
      />
    </>
  );
};

export default Navigation;