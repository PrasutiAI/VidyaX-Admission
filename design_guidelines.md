# Student Admission Management Service - Design Guidelines

## Design Approach

**Selected System**: Material Design 3 with administrative dashboard adaptations
**Justification**: This educational management system requires clarity, information hierarchy, and efficient data processing. Material Design provides robust patterns for forms, tables, and data visualization while maintaining accessibility and scalability.

## Typography

**Font Family**: 
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for application numbers, IDs)

**Scale**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Labels/Metadata: text-sm font-medium
- Helper Text: text-xs text-gray-600

## Layout System

**Spacing Primitives**: Consistent use of Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: p-6 or p-8
- Section spacing: space-y-6 or space-y-8
- Form field gaps: gap-4 or gap-6
- Card spacing: p-6 internally, gap-6 between cards

**Container Structure**:
- Dashboard wrapper: max-w-7xl mx-auto px-6
- Content cards: bg-white rounded-lg shadow-sm border
- Form containers: max-w-4xl for multi-step forms
- Table containers: w-full with horizontal scroll on mobile

## Component Library

### Navigation
**Admin Sidebar** (persistent left navigation):
- Width: 256px fixed on desktop, collapsible to icon-only
- Items: icon + label, active state with background highlight
- Sections: Dashboard, Cycles, Applications, Reports, Settings
- User profile at bottom with avatar and role badge

**Top Bar**:
- Height: 64px
- Contains: breadcrumb navigation, notification bell, user menu
- Search bar for quick application lookup (application number/student name)

### Dashboard Components

**Stat Cards** (4-column grid on desktop, 2-column tablet, 1-column mobile):
- Displays: Total Applications, Pending Reviews, Seats Filled, Enrollment Rate
- Structure: Large number (text-3xl), label below, small trend indicator
- Spacing: p-6 internal, gap-6 between cards

**Cycle Overview Panel**:
- Card layout with cycle name, dates, status badge
- Progress bar showing application timeline
- Quick actions: View Applications, Configure Seats, Close Cycle

**Application Pipeline Visualization**:
- Horizontal stepper showing status distribution
- Clickable stages to filter applications
- Counts displayed for each status

### Forms

**Multi-Step Application Form**:
- Progress indicator at top (steps: Student Info → Guardian Info → Documents → Review)
- Form sections with clear headers and dividers
- Field groups: 2-column grid on desktop for related fields
- Single column for addresses, long text
- Consistent spacing: gap-6 between fields, gap-8 between sections
- Action buttons at bottom right: Previous (outlined), Next/Submit (filled)

**Document Upload Interface**:
- Drag-drop zone with dashed border
- File list below showing: filename, size, status badge, remove action
- Document type selector dropdown above upload zone
- Verification status indicators: pending (gray), verified (green), rejected (red)

### Data Display

**Application Table**:
- Columns: App Number, Student Name, Grade, Status, Applied Date, Actions
- Sortable headers with icons
- Status badges with color coding
- Row actions: View, Edit, Change Status (icon buttons)
- Pagination: 25/50/100 per page options
- Sticky header on scroll

**Filter Panel** (collapsible sidebar or drawer):
- Filters: Admission Cycle (dropdown), Grade (multi-select), Status (checkbox group), Date Range (date pickers)
- Applied filters shown as removable chips
- Clear All and Apply buttons at bottom

**Seat Availability Display**:
- Grade-wise cards in grid layout
- Each card shows: Grade name, Total Seats, Enrolled, Available (as progress bar)
- Reserved categories shown as stacked bar segments
- Color coding: available (blue), enrolled (gray), reserved categories (distinct colors)

### Status Management

**Status Timeline** (application detail view):
- Vertical stepper showing all status transitions
- Each step: status name, timestamp, updated by user, remarks
- Current status highlighted
- Future steps shown as inactive/grayed

**Status Change Modal**:
- Current status → New status dropdown
- Remarks textarea (required for rejection)
- Related actions based on status (e.g., schedule test, record scores)
- Confirm and Cancel buttons

### Screening Interface

**Score Entry Cards**:
- Entrance test: Score input (0-100), test date, conducted by
- Interview: Score input, interview panel, detailed notes textarea
- Save buttons per section (not global save)

## Icons

**Library**: Heroicons (via CDN)
- Navigation: Home, Document, Users, Chart, Settings
- Actions: Plus, Pencil, Trash, Eye, Download, Upload
- Status: Check, X, Clock, Alert

## Spacing & Layout Patterns

**Page Structure**:
```
[Top Bar - 64px height]
[Sidebar - 256px] | [Main Content - p-8]
                  | [Breadcrumb]
                  | [Page Title + Actions - mb-6]
                  | [Content Cards/Tables - space-y-6]
```

**Card Pattern**:
- Border: border border-gray-200
- Shadow: shadow-sm
- Radius: rounded-lg
- Padding: p-6 or p-8 for larger cards

**Form Field Pattern**:
- Label: font-medium mb-2 block
- Input: border rounded-md p-3 focus:ring-2
- Helper text: text-xs text-gray-600 mt-1
- Error state: border-red-500, text-red-600 helper

## Responsive Behavior

- **Desktop** (1024px+): Full sidebar, 2-4 column grids, side-by-side layouts
- **Tablet** (768-1023px): Collapsible sidebar, 2-column grids, stacked forms
- **Mobile** (<768px): Bottom nav or hamburger menu, single column, full-width cards, horizontal scroll tables

## Images

No hero images required. This is a functional admin interface focused on data entry and management.

**Profile/Document Images**:
- Student passport photo: displayed in application detail header (96x96 rounded-full)
- Document thumbnails: shown in document list (64x64 rounded with file type badge)

## Accessibility

- Form inputs with associated labels using `for` attribute
- Required field indicators: asterisk in label
- Error messages: `aria-describedby` linking to error text
- Status badges: include aria-label with full status name
- Interactive elements: minimum 44x44px touch targets
- Focus indicators: visible ring-2 on all interactive elements