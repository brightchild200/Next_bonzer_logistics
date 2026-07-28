import { listInteractionTypes } from '@/lib/actions/customer-interactions/queries/list-interaction-types';
import { listInteractionOutcomes } from '@/lib/actions/customer-interactions/queries/list-interaction-outcomes';
import { listEmployeesForFilter } from '@/lib/actions/customer-interactions/queries/list-employees-for-filter';
import { CreateInteractionForm } from '@/components/create-interaction-form';

export default async function NewInteractionPage() {
  const [typesRes, outcomesRes, employeesRes] = await Promise.all([
    listInteractionTypes(),
    listInteractionOutcomes(),
    listEmployeesForFilter(),
  ]);

  const interactionTypes = typesRes.success ? typesRes.types : [];
  const interactionOutcomes = outcomesRes.success ? outcomesRes.outcomes : [];
  const employees = employeesRes.success ? employeesRes.employees : [];

  return (
    <CreateInteractionForm
      interactionTypes={interactionTypes}
      interactionOutcomes={interactionOutcomes}
      employees={employees}
    />
  );
}