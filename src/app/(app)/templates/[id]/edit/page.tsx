import { notFound } from 'next/navigation';
import { getChecklistTemplate } from '@/lib/queries';
import { TemplateForm } from '@/components/checklist/template-form';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getChecklistTemplate(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <h1 className="text-2xl font-bold mb-6">Edit Template</h1>
      <TemplateForm template={template} />
    </div>
  );
}
