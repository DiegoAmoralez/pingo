import { MonitorDetail } from '@/components/monitor-detail';

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MonitorDetail id={id} />;
}
