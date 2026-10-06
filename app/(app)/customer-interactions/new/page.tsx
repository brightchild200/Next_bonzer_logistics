import { listInteractionTypes } from '@/lib/actions/customer-interactions/queries/list-interaction-types';
import { listInteractionOutcomes } from '@/lib/actions/customer-interactions/queries/list-interaction-outcomes';
import { CreateInteractionForm } from '@/components/create-interaction-form';

export default async function NewInteractionPage() {
  const [typesRes, outcomesRes] = await Promise.all([
    listInteractionTypes(),
    listInteractionOutcomes(),
  ]);

  const interactionTypes = typesRes.success ? typesRes.types : [];
  const interactionOutcomes = outcomesRes.success ? outcomesRes.outcomes : [];

  return (
    <CreateInteractionForm
      interactionTypes={interactionTypes}
      interactionOutcomes={interactionOutcomes}
    />
  );
}