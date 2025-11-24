import MachineDetailClient from './machine-detail-client';

export default function CatalogMachineDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <MachineDetailClient machineId={params.id} />;
}


