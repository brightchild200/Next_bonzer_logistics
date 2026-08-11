import { listFollowups } from '@/lib/actions/customer-interactions/queries/list-followups';
import { listEmployeesForFilter } from '@/lib/actions/customer-interactions/queries/list-employees-for-filter';
import { listCustomersForFilter } from '@/lib/actions/customer-interactions/queries/list-customers-for-filter';
import { FollowupsTable } from '@/components/followups-table';

const PAGE_SIZE = 20;

export default async function FollowupsPage() {
  const [followupsRes, employeesRes, customersRes] = await Promise.all([
    listFollowups({ limit: PAGE_SIZE, offset: 0 }),
    listEmployeesForFilter(),
    listCustomersForFilter(),
  ]);

  const followups = followupsRes.success ? followupsRes.followups : [];
  const total = followupsRes.success ? followupsRes.total : 0;
  const employees = employeesRes.success ? employeesRes.employees : [];
  const customers = customersRes.success ? customersRes.customers : [];

  return (
    <FollowupsTable
      initialFollowups={followups}
      initialTotal={total}
      employees={employees}
      customers={customers}
    />
  );
}