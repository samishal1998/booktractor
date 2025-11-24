'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const statusVariant: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }> = {
  active: { label: 'Active', variant: 'success' },
  maintenance: { label: 'Maintenance', variant: 'warning' },
  retired: { label: 'Retired', variant: 'secondary' },
};

export default function MachineInstancesPage() {
  const params = useParams();
  const machineId = params?.id as string;
  const { data: session, isPending: isSessionLoading } = useSession();
  const ownerId = session?.user?.id || '';
  const trpc = useTRPC();

  const detailQuery = useQuery({
    ...trpc.owner.machines.detail.queryOptions({
      ownerId,
      machineId,
    }),
    enabled: !!ownerId && !!machineId,
  });

  const instancesQuery = useQuery({
    ...trpc.machines.instances.listByTemplate.queryOptions({
      templateId: machineId,
    }),
    enabled: !!ownerId && !!machineId,
  });

  if (isSessionLoading || detailQuery.isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        Loading machine instances…
      </div>
    );
  }

  if (!ownerId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-gray-600">
        <p className="text-lg font-semibold text-gray-900">Owner access required</p>
        <p className="text-sm text-gray-500">
          Sign in with an owner account to manage machine instances.
        </p>
      </div>
    );
  }

  const machine = detailQuery.data as any;
  if (!machine) {
    return (
      <div className="max-w-3xl space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        <p className="text-lg font-semibold">Machine not found</p>
        <Link href="/owner/machines" className="text-blue-600 hover:underline">
          Back to machines
        </Link>
      </div>
    );
  }

  const instances = (instancesQuery.data ?? []) as Array<{
    id: string;
    instanceCode: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  }>;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Owner Portal · Machine · Instances</p>
          <h1 className="text-3xl font-semibold text-gray-900">{machine.name}</h1>
          <p className="text-sm text-gray-500">{machine.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/owner/machines/${machineId}`}>Back to details</Link>
          </Button>
          <Button variant="outline" disabled>
            Bulk actions coming soon
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <p className="text-sm text-gray-600">
            {instances.length} instance{instances.length === 1 ? '' : 's'} connected to this template.
          </p>
        </div>
        {instances.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <p className="font-medium text-gray-700">No instances yet</p>
            <p className="text-sm text-gray-500">
              Instances will be generated when you add availability or import equipment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-gray-500">
                    Instance
                  </th>
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-gray-500">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {instances.map((instance) => {
                  const status = statusVariant[instance.status] ?? {
                    label: instance.status,
                    variant: 'outline' as const,
                  };
                  return (
                    <tr key={instance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {instance.instanceCode}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {instance.createdAt
                          ? new Date(instance.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {instance.updatedAt
                          ? new Date(instance.updatedAt).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

