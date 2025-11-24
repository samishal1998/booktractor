import MachineDetailClient from './machine-detail-client';

export default async function CatalogMachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MachineDetailClient machineId={id} />;
}


