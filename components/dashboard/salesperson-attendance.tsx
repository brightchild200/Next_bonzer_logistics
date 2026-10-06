'use client';

import { AttendanceWidget } from '@/components/dashboard/attendance-widget';
import { useAuth } from '@/components/auth-provider';
import { ROLES } from '@/lib/auth/permissions';

export function SalespersonAttendance() {
  const { hasRole } = useAuth();

  if (!hasRole(ROLES.SALESPERSON)) return null;

  return <AttendanceWidget />;
}
