import Link from 'next/link';
import { Plus, ListTodo, Pencil, Trash2 } from 'lucide-react';
import { getChecklistTemplates } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteTemplateButton } from '@/components/checklist/delete-template-button';

export default async function TemplatesPage() {
  const templates = await getChecklistTemplates();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Checklist Templates</h1>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium mb-2">No templates yet</h2>
          <p className="mb-4">Create reusable checklists for common events</p>
          <Button asChild>
            <Link href="/templates/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon">
                    <Link href={`/templates/${template.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteTemplateButton templateId={template.id} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {template.items.length} items
                </p>
                <ul className="text-sm space-y-1">
                  {template.items.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border-2 border-muted-foreground/30" />
                      {item.title}
                    </li>
                  ))}
                  {template.items.length > 3 && (
                    <li className="text-muted-foreground">
                      +{template.items.length - 3} more...
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
