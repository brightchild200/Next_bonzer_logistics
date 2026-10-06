import { listInteractions } from '@/lib/actions/customer-interactions/queries/list-interactions';
import { listInteractionTypes } from '@/lib/actions/customer-interactions/queries/list-interaction-types';
import { listInteractionOutcomes } from '@/lib/actions/customer-interactions/queries/list-interaction-outcomes';
import { listEmployeesForFilter } from '@/lib/actions/customer-interactions/queries/list-employees-for-filter';
import { listCustomersForFilter } from '@/lib/actions/customer-interactions/queries/list-customers-for-filter';
import { CustomerInteractionsTable } from '@/components/customer-interactions-table';

const PAGE_SIZE = 10;

export default async function CustomerInteractionsPage() {
  const [interactionsRes, typesRes, outcomesRes, employeesRes, customersRes] = await Promise.all([
    listInteractions({ limit: PAGE_SIZE, offset: 0 }),
    listInteractionTypes(),
    listInteractionOutcomes(),
    listEmployeesForFilter(),
    listCustomersForFilter(),
  ]);

  const interactions = interactionsRes.success ? interactionsRes.interactions : [];
  const total = interactionsRes.success ? interactionsRes.total : 0;
  const interactionTypes = typesRes.success ? typesRes.types : [];
  const interactionOutcomes = outcomesRes.success ? outcomesRes.outcomes : [];
  const employees = employeesRes.success ? employeesRes.employees : [];
  const customers = customersRes.success ? customersRes.customers : [];

  return (
    <CustomerInteractionsTable
      initialInteractions={interactions}
      initialTotal={total}
      interactionTypes={interactionTypes}
      interactionOutcomes={interactionOutcomes}
      employees={employees}
      customers={customers}
    />
  );
}