# ICHRA Quote Dashboard

A modern, clean dashboard for Individual Coverage Health Reimbursement Arrangement (ICHRA) quote analysis and comparison.

## 🏥 Overview

This React-based dashboard provides insurance brokers and employers with an intuitive interface to analyze ICHRA implementation costs, employee impact, and savings projections. The application features a simplified, data-focused design that prioritizes clarity and actionability.

## ✨ Features

### 📊 **Quote Summary Dashboard**
- **4 Key Metrics Display**: Total annual savings, average monthly savings, employees saving, and ICHRA compliance rate
- **Clean Data Visualization**: Focus on essential information without overwhelming complexity
- **Real-time Calculations**: Dynamic updates based on quote data

### 👔 **Employer Cost Analysis**
- **Cost Comparison**: Current plan vs. ICHRA implementation costs
- **Visual Cost Breakdown**: Simple bar charts showing monthly cost differences
- **Savings Projections**: Monthly and annual savings calculations
- **Budget Impact Analysis**: Percentage cost reduction metrics

### 👥 **Employee Impact Analysis**
- **Individual Savings**: Per-employee monthly and annual savings
- **Top Performer Highlight**: Employee with highest savings
- **Compliance Tracking**: ICHRA affordability compliance rates
- **Employee Preview**: Sample list of employee impacts

### 🎯 **Design Principles**
- **Simple & Clean**: No glassmorphism, complex animations, or visual clutter
- **Data-Focused**: Shows results, not processes
- **Mobile-First**: Responsive design for all screen sizes
- **Consistent UI**: Unified design language across all views

## 🛠️ Technology Stack

- **Frontend Framework**: React 18
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Charts**: Recharts for data visualization
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Routing**: React Router
- **Testing**: Cypress for E2E testing
- **Build Tool**: Create React App

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MihirSheth77/ichra-quote-dashboard.git
   cd ichra-quote-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Modal, etc.)
│   ├── forms/           # Form components
│   └── charts/          # Chart components
├── pages/               # Main page components
│   └── QuoteResults/    # Quote analysis pages
│       ├── QuoteSummary.jsx
│       ├── EmployerComparison.jsx
│       └── EmployeeComparisons.jsx
├── hooks/               # Custom React hooks
├── services/            # API and data services
├── utils/               # Utility functions
└── styles/              # Global styles and design system
```

## 🎨 Design System

### Color Palette
- **Primary**: #1976d2 (Blue)
- **Success**: #4caf50 (Green) 
- **Warning**: #ff9800 (Orange)
- **Text**: #333 (Dark Gray)
- **Background**: #ffffff (White)
- **Surface**: #f8f9fa (Light Gray)

### Typography
- **Headers**: 600-700 font weight
- **Body**: 400-500 font weight
- **Scale**: 0.75rem - 2.5rem

### Layout
- **Max Width**: 1200px
- **Grid**: CSS Grid with auto-fit columns
- **Spacing**: 0.5rem - 3rem scale
- **Border Radius**: 8px - 12px

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

## 🧪 Testing

### End-to-End Testing
```bash
npm run cypress:open
```

### Test Coverage
- Complete workflow testing
- Dashboard rendering
- Data visualization
- Mobile responsiveness

## 🔧 API Integration

The dashboard expects data in the following structure:

```javascript
{
  success: true,
  employerComparison: {
    totalEmployees: number,
    monthlySavings: number,
    annualSavings: number,
    savingsPercentage: number
  },
  employeeSummary: {
    savings: {
      totalMonthlySavings: number,
      totalAnnualSavings: number
    }
  },
  overallAnalysis: {
    complianceRate: number,
    complianceCount: number,
    employeesWithSavings: number
  },
  planAnalysis: {
    totalPlans: number,
    averagePremium: number
  }
}
```

## 🎯 Key Features Implemented

### Dashboard Best Practices
- **5-Second Rule**: Users understand everything within 5 seconds
- **Essential Metrics Only**: Focus on 4 most important KPIs
- **No Chart Overload**: Simple, clean visualizations
- **Action-Oriented**: Clear status indicators
- **Consistent Spacing**: Professional layout and typography

### User Experience
- **Loading States**: Proper loading spinners and messages
- **Error Handling**: Graceful handling of missing data
- **Progressive Enhancement**: Works without JavaScript fallbacks
- **Accessibility**: Semantic HTML and ARIA labels

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deploy to Netlify/Vercel
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Deploy automatically on push to main

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: [your-email@domain.com]

## 🙏 Acknowledgments

- Dashboard design principles from leading UX research
- Clean UI inspiration from modern SaaS applications
- Healthcare industry best practices for data visualization

---

**Built with ❤️ for better healthcare decision-making** 