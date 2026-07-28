import { getInteraction } from '@/lib/actions/customer-interactions/queries/get-interaction';
import { listInteractionTypes } from '@/lib/actions/customer-interactions/queries/list-interaction-types';
import { listInteractionOutcomes } from '@/lib/actions/customer-interactions/queries/list-interaction-outcomes';
import { listFollowups } from '@/lib/actions/customer-interactions/queries/list-followups';
import { getEmployee } from '@/lib/actions/customer-interactions/queries/get-employee';
import { InteractionDetail } from '@/components/interaction-detail';

interface InteractionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InteractionDetailPage({
  params,
}: InteractionDetailPageProps) {
  const { id } = await params;

  const [interactionRes, typesRes, outcomesRes, followupsRes] = await Promise.all([
    getInteraction(id),
    listInteractionTypes(),
    listInteractionOutcomes(),
    listFollowups({ interactionId: id, limit: 50, offset: 0 }),
  ]);

  const interaction = interactionRes.success ? interactionRes.interaction : null;
  const interactionTypes = typesRes.success ? typesRes.types : [];
  const interactionOutcomes = outcomesRes.success ? outcomesRes.outcomes : [];
  const followups = followupsRes.success ? followupsRes.followups : [];

  let employee = null;
  if (interaction) {
    const employeeRes = await getEmployee(interaction.employeeId);
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
            The interaction you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InteractionDetail
      interaction={interaction}
      interactionTypes={interactionTypes}
      interactionOutcomes={interactionOutcomes}
      followups={followups}
      employee={employee}
    />
  );
}