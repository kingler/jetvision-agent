import { N8NWorkflowTester } from '@repo/common/components/n8n-workflow-tester';

export default function N8NTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <N8NWorkflowTester />
    </div>
  );
}