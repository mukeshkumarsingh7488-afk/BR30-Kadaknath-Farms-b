const PERMISSIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/admin",
    section: "main",
  },
  {
    key: "orders",
    label: "Orders",
    path: "/admin/orders",
    section: "main",
  },
  {
    key: "refunds",
    label: "Refunds",
    path: "/admin/refunds",
    section: "main",
  },
  {
    key: "products",
    label: "Products",
    path: "/admin/products",
    section: "main",
  },
  {
    key: "customers-staff",
    label: "Customers & Staff",
    path: "/admin/customers",
    section: "main",
  },

  {
    key: "farm-dashboard",
    label: "Farm Dashboard",
    path: "/admin/farm-dashboard",
    section: "farm",
  },
  {
    key: "farms",
    label: "Create Farm",
    path: "/admin/farm/create-farm",
    section: "farm",
  },
  {
    key: "sheds",
    label: "Shed Management",
    path: "/admin/farm/sheds",
    section: "farm",
  },
  {
    key: "shed-maintenance",
    label: "Shed Maintenance",
    path: "/admin/farm/shed-maintenance",
    section: "farm",
  },
  {
    key: "batches",
    label: "Batches",
    path: "/admin/farm/batches",
    section: "farm",
  },
  {
    key: "chicks-inward",
    label: "Chicks Inward",
    path: "/admin/farm/chicks-inward",
    section: "farm",
  },
  {
    key: "bird-stock",
    label: "Bird Stock",
    path: "/admin/farm/bird-stock",
    section: "farm",
  },
  {
    key: "mortality",
    label: "Farm Mortality",
    path: "/admin/farm/mortality",
    section: "farm",
  },
  {
    key: "weight-growth",
    label: "Weight & Growth",
    path: "/admin/farm/weight-growth",
    section: "farm",
  },
  {
    key: "egg-collection",
    label: "Egg Collection",
    path: "/admin/farm/egg-collection",
    section: "farm",
  },
  {
    key: "feed-inventory",
    label: "Feed Inventory",
    path: "/admin/farm/feed-inventory",
    section: "farm",
  },
  {
    key: "feed-consumption",
    label: "Feed Consumption",
    path: "/admin/farm/feed-consumption",
    section: "farm",
  },
  {
    key: "medicine-vaccine",
    label: "Medicine & Vaccine",
    path: "/admin/farm/medicine-vaccine",
    section: "farm",
  },
  {
    key: "vaccination-schedule",
    label: "Vaccination Schedule",
    path: "/admin/farm/vaccination-schedule",
    section: "farm",
  },
  {
    key: "veterinary-logs",
    label: "Veterinary Logs",
    path: "/admin/farm/veterinary-logs",
    section: "farm",
  },
  {
    key: "water-quality",
    label: "Water Quality",
    path: "/admin/farm/water-quality",
    section: "farm",
  },
  {
    key: "staff-attendance",
    label: "Staff Attendance",
    path: "/admin/farm/staff-attendance",
    section: "farm",
  },
  {
    key: "tasks",
    label: "Farm Tasks",
    path: "/admin/farm/tasks",
    section: "farm",
  },
  {
    key: "payroll",
    label: "Payroll",
    path: "/admin/farm/payroll",
    section: "farm",
  },
  {
    key: "biosecurity",
    label: "Biosecurity",
    path: "/admin/farm/biosecurity",
    section: "farm",
  },
  {
    key: "sales",
    label: "Sales & Billing",
    path: "/admin/farm/sales",
    section: "farm",
  },
  {
    key: "farm-reports",
    label: "Farm Reports",
    path: "/admin/farm/reports",
    section: "farm",
  },
  {
    key: "farm-expenses",
    label: "Farm Expenses",
    path: "/admin/farm/expenses",
    section: "farm",
  },

  {
    key: "staff-control",
    label: "Staff Control",
    path: "/admin/staff",
    section: "management",
  },
  {
    key: "settings",
    label: "Settings",
    path: "/admin/settings",
    section: "management",
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

export const getPermissionByKey = (key) => {
  return PERMISSIONS.find((permission) => permission.key === key) || null;
};

export const isValidPermission = (key) => {
  return PERMISSION_KEYS.includes(key);
};

export default PERMISSIONS;
