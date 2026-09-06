import { Routes } from '@angular/router';

// Authentication
import { LoginComponent } from './features/auth/login/login';

// Layout
import { MainLayout } from './layouts/main-layout/main-layout';

// Guard
import { authGuard } from './core/guards/auth-guard';

// Dashboard
import { Dashboard } from './features/dashboard/dashboard/dashboard';

// Vendors
import { VendorList } from './features/vendors/vendor-list/vendor-list';
import { VendorForm } from './features/vendors/vendor-form/vendor-form';
import { PendingVendors } from './features/vendors/pending-vendors/pending-vendors';

// Purchase Orders
import { PurchaseOrderList } from './features/procurement/purchase-order-list/purchase-order-list';
import { PurchaseOrderForm } from './features/procurement/purchase-order-form/purchase-order-form';
import { PurchaseOrderDetails } from './features/procurement/purchase-order-details/purchase-order-details';

// Contracts
import { ContractList } from './features/contracts/contract-list/contract-list';
import { ContractForm } from './features/contracts/contract-form/contract-form';
import { ContractDetails } from './features/contracts/contract-details/contract-details';

// Procurement
import { ProcurementList } from './features/procurement/procurement-list/procurement-list';
import { ProcurementForm } from './features/procurement/procurement-form/procurement-form';
import { ProcurementDetails } from './features/procurement/procurement-details/procurement-details';

// Communications
import { CommunicationList } from './features/communication/communication-list/communication-list';
import { CommunicationForm } from './features/communication/communication-form/communication-form';
import { CommunicationDetails } from './features/communication/communication-details/communication-details';

// Risk
import { RiskDashboard } from './features/risk/risk-dashboard/risk-dashboard';
import { RiskList } from './features/risk/risk-list/risk-list';
import { RiskDetails } from './features/risk/risk-details/risk-details';
import { RiskForm } from './features/risk/risk-form/risk-form';

// Reports
import { ReportDashboard } from './features/reports/report-dashboard/report-dashboard';
import { ReportList } from './features/reports/report-list/report-list';
import { ReportDetails } from './features/reports/report-details/report-details';
import { ReportForm } from './features/reports/report-form/report-form';

// Vendor Performance
import { VendorPerformanceList } from './features/vendor-performance/vendor-performance-list/vendor-performance-list';
import { VendorPerformanceForm } from './features/vendor-performance/vendor-performance-form/vendor-performance-form';
import { VendorPerformanceDetails } from './features/vendor-performance/vendor-performance-details/vendor-performance-details';

// Notifications
import { NotificationList } from './features/notifications/notification-list/notification-list';
import { NotificationForm } from './features/notifications/notification-form/notification-form';


export const routes: Routes = [

  /*
   * AUTHENTICATION
   */
  {
    path: 'login',
    component: LoginComponent
  },

  /*
   * PROTECTED APPLICATION
   */
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [

      /*
       * DASHBOARD
       */
      {
        path: 'dashboard',
        component: Dashboard
      },

      /*
       * VENDORS
       */
      {
        path: 'vendors',
        component: VendorList
      },
      {
        path: 'vendors/add',
        component: VendorForm
      },
      {
        path: 'vendors/edit/:id',
        component: VendorForm
      },
      {
        path: 'vendors/pending',
        component: PendingVendors
      },

      /*
       * PURCHASE ORDERS
       */
      {
        path: 'purchase-orders',
        component: PurchaseOrderList
      },
      {
        path: 'purchase-orders/add',
        component: PurchaseOrderForm
      },
      {
        path: 'purchase-orders/edit/:id',
        component: PurchaseOrderForm
      },
      {
        path: 'purchase-orders/details/:id',
        component: PurchaseOrderDetails
      },
      {
        path: 'purchase-orders/:id',
        component: PurchaseOrderDetails
      },

      /*
       * CONTRACTS
       */
      {
        path: 'contracts',
        component: ContractList
      },
      {
        path: 'contracts/add',
        component: ContractForm
      },
      {
        path: 'contracts/edit/:id',
        component: ContractForm
      },
      {
        path: 'contracts/details/:id',
        component: ContractDetails
      },
      {
        path: 'contracts/:id',
        component: ContractDetails
      },

      /*
       * PROCUREMENT
       */
      {
        path: 'procurement',
        component: ProcurementList
      },
      {
        path: 'procurement/add',
        component: ProcurementForm
      },
      {
        path: 'procurement/edit/:id',
        component: ProcurementForm
      },
      {
        path: 'procurement/details/:id',
        component: ProcurementDetails
      },
      {
        path: 'procurement/:id',
        component: ProcurementDetails
      },

      /*
       * COMMUNICATIONS
       */
      {
        path: 'communications',
        component: CommunicationList
      },
      {
        path: 'communications/add',
        component: CommunicationForm
      },
      {
        path: 'communications/edit/:id',
        component: CommunicationForm
      },
      {
        path: 'communications/details/:id',
        component: CommunicationDetails
      },
      {
        path: 'communications/:id',
        component: CommunicationDetails
      },

      /*
       * RISK MANAGEMENT & RELIABILITY INTELLIGENCE
       */
      {
        path: 'risk',
        component: RiskDashboard
      },
      {
        path: 'risk/list',
        component: RiskList
      },
      {
        path: 'risk/add',
        component: RiskForm
      },
      {
        path: 'risk/add/:vendorId',
        component: RiskForm
      },
      {
        path: 'risk/edit/:id',
        component: RiskForm
      },
      {
        path: 'risk/details/:id',
        component: RiskDetails
      },
      {
        path: 'risk/:id',
        component: RiskDetails
      },
      {
        path: 'risk-intelligence',
        component: RiskDashboard
      },
      {
        path: 'risk-intelligence/list',
        component: RiskList
      },
      {
        path: 'risk-intelligence/vendor/:id',
        component: RiskDetails
      },
      {
        path: 'risk-intelligence/add',
        component: RiskForm
      },
      {
        path: 'risk-intelligence/add/:vendorId',
        component: RiskForm
      },
      {
        path: 'risk-intelligence/edit/:id',
        component: RiskForm
      },
      {
        path: 'risk-intelligence/details/:id',
        component: RiskDetails
      },
      {
        path: 'risk-intelligence/:id',
        component: RiskDetails
      },

      /*
       * REPORTS & ANALYTICS
       */
      {
        path: 'reports',
        component: ReportDashboard
      },
      {
        path: 'reports/analytics',
        component: ReportDashboard
      },
      {
        path: 'reports/list',
        component: ReportList
      },
      {
        path: 'reports/add',
        component: ReportForm
      },
      {
        path: 'reports/details/:id',
        component: ReportDetails
      },
      {
        path: 'reports/:id',
        component: ReportDetails
      },

      /*
       * VENDOR PERFORMANCE
       */
      {
        path: 'vendor-performance',
        component: VendorPerformanceList
      },
      {
        path: 'vendor-performance/add',
        component: VendorPerformanceForm
      },
      {
        path: 'vendor-performance/add/:vendorId',
        component: VendorPerformanceForm
      },
      {
        path: 'vendor-performance/edit/:id',
        component: VendorPerformanceForm
      },
      {
        path: 'vendor-performance/details/:id',
        component: VendorPerformanceDetails
      },
      {
        path: 'vendor-performance/vendor/:id',
        component: VendorPerformanceDetails
      },
      {
        path: 'vendor-performance/:id',
        component: VendorPerformanceDetails
      },
      {
        path: 'performance',
        component: VendorPerformanceList
      },
      {
        path: 'performance/vendors',
        component: VendorPerformanceList
      },
      {
        path: 'performance/add',
        component: VendorPerformanceForm
      },
      {
        path: 'performance/add/:vendorId',
        component: VendorPerformanceForm
      },
      {
        path: 'performance/edit/:id',
        component: VendorPerformanceForm
      },
      {
        path: 'performance/details/:id',
        component: VendorPerformanceDetails
      },
      {
        path: 'performance/vendor/:id',
        component: VendorPerformanceDetails
      },
      {
        path: 'performance/:id',
        component: VendorPerformanceDetails
      },

      /*
       * NOTIFICATIONS
       */
      {
        path: 'notifications',
        component: NotificationList
      },
      {
        path: 'notifications/list',
        component: NotificationList
      },
      {
        path: 'notifications/add',
        component: NotificationForm
      },
      {
        path: 'notifications/details/:id',
        component: NotificationList
      },
      {
        path: 'notifications/:id',
        component: NotificationList
      },


      /*
       * DEFAULT INSIDE APPLICATION
       */
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      /*
       * UNKNOWN PROTECTED ROUTE
       *
       * Never send an authenticated user to login
       * just because a route does not exist.
       */
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  },

  /*
   * APPLICATION ROOT
   */
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  /*
   * UNKNOWN ROOT ROUTE
   */
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];