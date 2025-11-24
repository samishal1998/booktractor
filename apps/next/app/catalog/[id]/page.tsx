import MachineDetailClient from './machine-detail-client';
import { useParams } from 'solito/navigation';

export default function CatalogMachineDetailPage() {
  const params = useParams();
  const machineId = params?.id as string | undefined;
  return <MachineDetailClient machineId={machineId ?? ''} />;
}


