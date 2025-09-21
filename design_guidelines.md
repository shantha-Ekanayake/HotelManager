# Hotel Management System Design Guidelines

## Design Approach
**System-Based Approach**: Using Material Design principles with custom adaptations for the hospitality industry. This ensures consistency, accessibility, and professional appearance suitable for enterprise hotel operations.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Light Mode: Primary blue (220 85% 35%), Secondary gray (220 15% 20%)
- Dark Mode: Primary blue (220 75% 65%), Secondary gray (220 10% 85%)

**Supporting Colors:**
- Success green (142 70% 45%) for confirmed bookings and available rooms
- Warning amber (38 95% 50%) for pending actions and maintenance alerts
- Error red (0 85% 60%) for cancellations and out-of-service rooms
- Neutral grays (220 10% 95% to 220 15% 15%) for backgrounds and borders

### B. Typography
**Font System:**
- Primary: Inter (Google Fonts) for UI elements and data
- Secondary: Open Sans for longer text content
- Sizes: Text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px)
- Weights: Regular (400), Medium (500), Semibold (600)

### C. Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (p-2, h-8, m-4, gap-6)
- Consistent 4-unit grid system for component spacing
- 8-unit spacing for section separation
- 2-unit spacing for tight elements like form fields

### D. Component Library

**Navigation:**
- Collapsible sidebar with module icons and labels
- Top navigation bar with user profile, notifications, and quick actions
- Breadcrumb navigation for deep module navigation

**Data Displays:**
- Clean table designs with alternating row colors
- Card-based layouts for guest profiles and room status
- Calendar grid with color-coded availability states
- Status badges with rounded corners and appropriate colors

**Forms:**
- Consistent input styling with subtle borders and focus states
- Grouped form sections with clear labels
- Date/time pickers with hotel-appropriate styling
- Dropdown menus with search functionality

**Dashboard Elements:**
- KPI cards with large numbers and trend indicators
- Chart containers with subtle shadows
- Quick action buttons prominently placed
- Real-time status indicators

### E. Module-Specific Design Considerations

**Reservations:**
- Timeline view with drag-and-drop capabilities
- Guest information panels with expandable details
- Booking status indicators using color coding

**Housekeeping:**
- Visual room grid with status colors (Clean: green, Dirty: amber, OOS: red)
- Task lists with checkboxes and priority indicators
- Mobile-optimized interface for staff tablets/phones

**Guest Management:**
- Profile cards with guest photos and key information
- Stay history timelines
- Preference tags and notes sections

**Reporting:**
- Clean chart designs with minimal decorative elements
- Export buttons prominently displayed
- Filter panels with intuitive controls

## Professional Standards
- Maintain 4.5:1 color contrast ratios for accessibility
- Consistent 8px border radius for modern appearance
- Subtle drop shadows (0 1px 3px rgba(0,0,0,0.1)) for depth
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## Visual Hierarchy
- Use size, weight, and color to establish clear information hierarchy
- Group related functions with consistent spacing and visual containers
- Implement progressive disclosure for complex workflows
- Maintain consistent icon usage throughout modules

This design system prioritizes functionality and efficiency while maintaining a professional, modern appearance appropriate for hotel operations staff.