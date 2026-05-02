/* styles.css */
:root {
    --primary-color: #2c3e50;
    --secondary-color: #34495e;
    --accent-color: #3498db;
    --success-color: #27ae60;
    --warning-color: #f39c12;
    --danger-color: #e74c3c;
    --light-color: #ecf0f1;
    --dark-color: #2c3e50;
}

* {
    font-family: 'Sarabun', sans-serif;
}

body {
    background-color: #f8f9fa;
    padding-top: 0;
}

/* Navigation Bar */
.navbar {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.navbar-brand {
    font-weight: 600;
    font-size: 1.1rem;
}

/* Sidebar */
.sidebar {
    background: linear-gradient(180deg, var(--secondary-color), var(--primary-color));
    min-height: calc(100vh - 56px);
    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
}

.sidebar .nav-link {
    color: var(--light-color) !important;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    transition: all 0.3s ease;
    font-weight: 500;
}

.sidebar .nav-link:hover {
    background-color: rgba(255,255,255,0.1);
    padding-left: 25px;
}

.sidebar .nav-link.active {
    background-color: var(--accent-color);
    border-left: 4px solid var(--warning-color);
}

.sidebar .nav-link i {
    width: 20px;
    text-align: center;
}

/* ซ่อนเมนูข้อมูลระบบในโหมดผู้ใช้ทั่วไป */
.system-info-item {
    display: block;
}

.system-info-item.hidden {
    display: none !important;
}

/* Main Content */
.view-content {
    animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Schedule Tables */
.schedule-table {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.schedule-table th {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    font-weight: 600;
    text-align: center;
    vertical-align: middle;
    border: none;
    padding: 12px 8px;
}

.schedule-table th.time-header {
    background: var(--dark-color);
    width: 120px;
}

.schedule-table th.break-cell {
    background: linear-gradient(135deg, var(--warning-color), #e67e22);
    writing-mode: vertical-lr;
    text-orientation: mixed;
    width: 40px;
}

.schedule-table td {
    vertical-align: middle;
    text-align: center;
    padding: 15px 8px;
    border: 1px solid #dee2e6;
    height: 80px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.schedule-table td:hover {
    background-color: #f8f9fa;
    transform: scale(1.02);
    z-index: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.schedule-table td.empty-slot {
    background-color: #f8f9fa;
    color: #6c757d;
}

.schedule-table td.filled-slot {
    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
    border: 2px solid var(--accent-color);
    font-weight: 500;
}

.schedule-table .schedule-item {
    font-size: 0.85rem;
    line-height: 1.3;
}

.schedule-table .subject-name {
    font-weight: 600;
    color: var(--dark-color);
    margin-bottom: 2px;
}

.schedule-table .teacher-name {
    color: var(--secondary-color);
    font-size: 0.8rem;
    margin-bottom: 2px;
}

.schedule-table .room-name {
    color: var(--success-color);
    font-size: 0.75rem;
    font-weight: 600;
}

/* Cards and Stats */
.stat-card {
    transition: transform 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-5px);
}

.card {
    border: none;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.card-header {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    border-radius: 10px 10px 0 0 !important;
    font-weight: 600;
}

/* Summary Views */
.summary-card {
    border: none;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    margin-bottom: 20px;
    transition: all 0.3s ease;
}

.summary-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.summary-card .card-header {
    background: linear-gradient(135deg, var(--accent-color), #2980b9);
    color: white;
    font-weight: 600;
}

/* Buttons */
.btn {
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.btn-primary {
    background: linear-gradient(135deg, var(--accent-color), #2980b9);
    border: none;
}

.btn-success {
    background: linear-gradient(135deg, var(--success-color), #229954);
    border: none;
}

.btn-warning {
    background: linear-gradient(135deg, var(--warning-color), #e67e22);
    border: none;
}

.btn-danger {
    background: linear-gradient(135deg, var(--danger-color), #c0392b);
    border: none;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* Forms */
.form-control, .form-select {
    border-radius: 6px;
    border: 1px solid #ddd;
    padding: 8px 12px;
    transition: all 0.3s ease;
}

.form-control:focus, .form-select:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

/* Modals */
.modal-content {
    border: none;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.modal-header {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    border-radius: 10px 10px 0 0;
}

.modal-footer {
    border-top: 1px solid #dee2e6;
    border-radius: 0 0 10px 10px;
}

/* Schedule Form Modal */
.schedule-form-modal .modal-header {
    background: linear-gradient(135deg, var(--accent-color), #2980b9);
}

/* Tables */
.table-striped tbody tr:nth-of-type(odd) {
    background-color: rgba(52, 152, 219, 0.05);
}

.table-hover tbody tr:hover {
    background-color: rgba(52, 152, 219, 0.1);
}

/* Connection Status */
#connectionStatus .fa-circle {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.connection-online {
    color: var(--success-color);
}

.connection-offline {
    color: var(--danger-color);
}

/* Print Styles */
@media print {
    .navbar, .sidebar, .btn, .modal, .toast-container {
        display: none !important;
    }
    
    .col-md-2 {
        display: none;
    }
    
    .col-md-10 {
        flex: 0 0 100%;
        max-width: 100%;
    }
    
    .schedule-table {
        box-shadow: none;
        border: 2px solid #000;
    }
    
    .schedule-table th {
        background: #000 !important;
        color: #fff !important;
        -webkit-print-color-adjust: exact;
    }
    
    body {
        background: white !important;
    }
    
    .container-fluid {
        padding: 0 !important;
    }

    /* Header styles for print */
    .header {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
    }
    
    .school-name {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .schedule-title {
        font-size: 20px;
        margin-bottom: 10px;
        color: #2c3e50;
    }
    
    .class-info {
        font-size: 18px;
        margin-bottom: 10px;
        color: #3498db;
    }
    
    .print-date {
        font-size: 14px;
        color: #666;
    }
    
    .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 12px;
        color: #666;
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    .sidebar {
        min-height: auto;
        margin-bottom: 20px;
    }
    
    .schedule-table td {
        padding: 8px 4px;
        height: 60px;
        font-size: 0.8rem;
    }
    
    .schedule-table .schedule-item {
        font-size: 0.75rem;
    }
    
    .schedule-table th {
        padding: 8px 4px;
        font-size: 0.8rem;
    }
    
    .navbar-brand {
        font-size: 0.9rem;
    }
    
    .stat-card h4 {
        font-size: 1.2rem;
    }
    
    .stat-card p {
        font-size: 0.8rem;
    }

    /* Hide system info item on mobile for non-admin users */
    .system-info-item.hidden {
        display: none !important;
    }
}

/* Loading Spinner */
.loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Toast Notifications */
.notification {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    max-width: 500px;
    animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.toast {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast-header {
    border-radius: 8px 8px 0 0;
}

/* Badges */
.badge {
    font-size: 0.7em;
    padding: 4px 8px;
    border-radius: 10px;
}

/* Dropdown Menus */
.dropdown-menu {
    border: none;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.dropdown-item {
    padding: 8px 16px;
    transition: all 0.3s ease;
}

.dropdown-item:hover {
    background-color: rgba(52, 152, 219, 0.1);
}

/* Form Switches */
.form-check-input:checked {
    background-color: var(--success-color);
    border-color: var(--success-color);
}

/* Alert Styles */
.alert {
    border: none;
    border-radius: 8px;
    border-left: 4px solid;
}

.alert-info {
    border-left-color: var(--accent-color);
}

.alert-warning {
    border-left-color: var(--warning-color);
}

.alert-success {
    border-left-color: var(--success-color);
}

.alert-danger {
    border-left-color: var(--danger-color);
}

/* Utility Classes */
.text-gradient {
    background: linear-gradient(135deg, var(--accent-color), var(--success-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.bg-gradient-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)) !important;
}

.bg-gradient-accent {
    background: linear-gradient(135deg, var(--accent-color), #2980b9) !important;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: var(--accent-color);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #2980b9;
}

/* Animation for schedule updates */
.schedule-update {
    animation: highlight 2s ease;
}

@keyframes highlight {
    0% { background-color: #fff3cd; }
    100% { background-color: transparent; }
}

/* Teacher summary cards */
.teacher-summary-card {
    border-left: 4px solid var(--accent-color);
}

.class-summary-card {
    border-left: 4px solid var(--success-color);
}

.room-summary-card {
    border-left: 4px solid var(--warning-color);
}

/* Status indicators */
.status-indicator {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
}

.status-online {
    background-color: var(--success-color);
}

.status-offline {
    background-color: var(--danger-color);
}

.status-syncing {
    background-color: var(--warning-color);
    animation: pulse 1.5s infinite;
}

/* Edit mode styles */
.edit-mode {
    position: relative;
}

.edit-mode::after {
    content: "✏️";
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 10px;
    opacity: 0.7;
}

/* Room type styles */
.multiple-rooms {
    color: #e74c3c;
    font-weight: bold;
}

.workshop-room {
    color: #9b59b6;
    font-weight: bold;
}

.class-room {
    color: #27ae60;
}

.lab-room {
    color: #3498db;
}

/* Progress bar for batch upload */
#uploadProgress {
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
}

/* Troubleshooting tips */
.troubleshooting-tips {
    margin-top: 15px;
}

.troubleshooting-tips h6 {
    color: var(--warning-color);
}

.troubleshooting-tips ol {
    margin-bottom: 10px;
}

.troubleshooting-tips ul {
    margin-left: 20px;
    margin-bottom: 10px;
}

/* Connection status styles */
.connection-good {
    color: var(--success-color);
    font-weight: bold;
}

.connection-warning {
    color: var(--warning-color);
    font-weight: bold;
}

.url-valid {
    color: var(--success-color);
}

.url-warning {
    color: var(--warning-color);
}

/* Admin mode alert */
#editModeAlert {
    margin-bottom: 20px;
}

/* Print-specific improvements */
@media print {
    .schedule-table {
        page-break-inside: avoid;
    }
    
    .schedule-table td {
        page-break-inside: avoid;
        break-inside: avoid;
    }
    
    .header {
        page-break-after: avoid;
    }
    
    .footer {
        page-break-before: avoid;
    }
}

/* Mobile-specific improvements */
@media (max-width: 576px) {
    .sidebar .nav-link {
        padding: 12px 15px;
        font-size: 0.9rem;
    }
    
    .schedule-table th,
    .schedule-table td {
        padding: 6px 3px;
        font-size: 0.75rem;
    }
    
    .stat-card {
        margin-bottom: 10px;
    }
    
    .notification {
        min-width: 250px;
        right: 10px;
        left: 10px;
    }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    .sidebar .nav-link {
        border-bottom: 2px solid rgba(255,255,255,0.3);
    }
    
    .schedule-table td {
        border: 2px solid #dee2e6;
    }
    
    .btn {
        border: 1px solid currentColor;
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    .schedule-table td:hover {
        transform: none;
    }
    
    .stat-card:hover {
        transform: none;
    }
    
    .btn:hover {
        transform: none;
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    body {
        background-color: #1a1a1a;
        color: #e0e0e0;
    }
    
    .card {
        background-color: #2d2d2d;
        color: #e0e0e0;
    }
    
    .schedule-table {
        background: #2d2d2d;
        color: #e0e0e0;
    }
    
    .schedule-table th {
        background: linear-gradient(135deg, #1e3a5f, #2c5282);
    }
    
    .form-control, .form-select {
        background-color: #2d2d2d;
        border-color: #555;
        color: #e0e0e0;
    }
    
    .form-control:focus, .form-select:focus {
        background-color: #2d2d2d;
        color: #e0e0e0;
    }
}

/* Accessibility improvements */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* Focus styles for better accessibility */
.btn:focus,
.form-control:focus,
.form-select:focus,
.form-check-input:focus {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
}

/* Hover states for interactive elements */
.schedule-table td.edit-mode:hover {
    background-color: #e3f2fd;
    border-color: var(--accent-color);
}

.navbar-brand:hover {
    opacity: 0.8;
}

/* Custom scrollbar for sidebar */
.sidebar::-webkit-scrollbar {
    width: 6px;
}

.sidebar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.3);
    border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.5);
}
