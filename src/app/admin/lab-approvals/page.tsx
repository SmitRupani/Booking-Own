import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';

export default function LabApprovalsPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <h2 className="text-2xl font-semibold">Approvals</h2>
      <p className="text-sm text-muted-foreground mt-2">Approve or reject lab/resource booking requests.</p>

      <div className="mt-6">
        <Card>
          <Table>
            <tbody>
              <tr>
                <td>Pending approval placeholders</td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
