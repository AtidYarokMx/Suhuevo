interface Permission {
  role: string;
  whitelist: string[] | '*';
  blacklist: string[] | '*';
}
  
const permissionsArray: Permission[] = [
  {
    role: 'root',
    whitelist: '*',
    blacklist: []
  },
  {
    role: 'employee',
    whitelist: [
      '/api/employee/search'
    ],
    blacklist: '*'
  },
  {
    role: 'employee.hr',
    whitelist: '*',
    blacklist: []
  },
];

export function hasPermission(role: string, requestedRoute: string): boolean {
  const permission = permissionsArray.find(p => p.role === role);

  if (!permission) return false

  const { whitelist = [], blacklist = [] } = permission;

  // Si blacklist es '*', se niega el acceso a todas las rutas excepto las que están en whitelist
  if (blacklist === '*' && !whitelist.includes(requestedRoute)) {
    return false;
  }

  // Si whitelist es '*', se permite el acceso a todas las rutas excepto las que están en blacklist
  if (whitelist === '*' && blacklist.includes(requestedRoute)) {
    return false;
  }

  // Si whitelist no es '*', se niega el acceso si la ruta no está incluida
  if (whitelist !== '*' && whitelist.length > 0 && !whitelist.includes(requestedRoute)) {
    return false;
  }

  // Si blacklist no es '*', se niega el acceso si la ruta está incluida
  if (blacklist !== '*' && blacklist.includes(requestedRoute)) {
    return false;
  }

  return true
}