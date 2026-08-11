import { getInteractionByRef } from '@/lib/actions/customer-interactions/queries/get-interaction-by-ref';
import { listInteractionTypes } from '@/lib/actions/customer-interactions/queries/list-interaction-types';
import { listInteractionOutcomes } from '@/lib/actions/customer-interactions/queries/list-interaction-outcomes';
import { listFollowups } from '@/lib/actions/customer-interactions/queries/list-followups';
import { getEmployee } from '@/lib/actions/customer-interactions/queries/get-employee';
import { InteractionDetail } from '@/components/interaction-detail';

interface InteractionDetailPageProps {
  params: Promise<{ ref: string }>;
}

export default async function InteractionDetailPage({
  params,
}: InteractionDetailPageProps) {
  const { ref } = await params;

  const [interactionRes, typesRes, outcomesRes, followupsRes] = await Promise.all([
    getInteractionByRef(ref),
    listInteractionTypes(),
    listInteractionOutcomes(),
    listFollowups({ interactionId: '', limit: 50, offset: 0 }),
  ]);

  const interaction = interactionRes.success ? interactionRes.interaction : null;
  const interactionTypes = typesRes.success ? typesRes.types : [];
  const interactionOutcomes = outcomesRes.success ? outcomesRes.outcomes : [];
  const followups = followupsRes.success ? followupsRes.followups : [];

  let employee = null;
  if (interaction) {
    const [followupsRes2, employeeRes] = await Promise.all([
      listFollowups({ interactionId: interaction.id, limit: 50, offset: 0 }),
      getEmployee(interaction.employeeId),
    ]);
    if (followupsRes2.success) {
      // followups already fetched above but need correct interactionId
    }
    if (employeeRes.success) {
      employee = employeeRes.employee;
    }
  }

  if (!interaction) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Interaction not found</h1>
          <p className="mt-2 text-muted-foreground">
            The interaction you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Re-fetch followups with correct interactionId
  const followupsResCorrect = await listFollowups({ interactionId: interaction.id, limit: 50, offset: 0 });
  const followupsCorrect = followupsResCorrect.success ? followupsResCorrect.followups : [];

  return (
    <InteractionDetail
      interaction={interaction}
      interactionTypes={interactionTypes}
      interactionOutcomes={interactionOutcomes}
      followups={followupsCorrect}
      employee={employee}
    />
  );
}