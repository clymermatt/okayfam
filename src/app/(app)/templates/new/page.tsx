import { TemplateForm } from '@/components/checklist/template-form';

export default function NewTemplatePage() {
  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <h1 className="text-2xl font-bold mb-6">Create Template</h1>
      <TemplateForm />
    </div>
  );
}
