'use client';

import { useState } from 'react';
import { MerchantCategoryWithEvent, Event, CategoryType } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMerchantCategory, updateMerchantCategory, deleteMerchantCategory } from '@/lib/actions/bank';
import { Trash2, Plus, Pencil, X, Check, Tag, DollarSign, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { formatMoney, parseMoney } from '@/lib/utils';

interface MerchantCategoriesProps {
  categories: MerchantCategoryWithEvent[];
  events: Event[];
}

export function MerchantCategories({ categories, events }: MerchantCategoriesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType>('budget');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [eventId, setEventId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function resetForm() {
    setName('');
    setKeywordsInput('');
    setCategoryType('budget');
    setMonthlyBudget('');
    setEventId('');
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function startEdit(category: MerchantCategoryWithEvent) {
    setEditingId(category.id);
    setName(category.name);
    setKeywordsInput(category.keywords.join(', '));
    setCategoryType(category.category_type);
    setMonthlyBudget(category.monthly_budget ? (category.monthly_budget / 100).toString() : '');
    setEventId(category.event_id || '');
    setShowForm(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !keywordsInput.trim()) return;

    setSaving(true);
    setError(null);

    // Parse keywords from comma-separated input
    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      setError('At least one keyword is required');
      setSaving(false);
      return;
    }

    // Parse budget amount
    const budgetCents = categoryType === 'budget' ? parseMoney(monthlyBudget) : null;

    let result;
    if (editingId) {
      result = await updateMerchantCategory(
        editingId,
        name,
        keywords,
        categoryType,
        budgetCents,
        categoryType === 'event' ? eventId : null
      );
    } else {
      result = await createMerchantCategory(
        name,
        keywords,
        categoryType,
        budgetCents,
        categoryType === 'event' ? eventId : null
      );
    }

    if (result?.error) {
      setError(result.error);
    } else {
      resetForm();
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(categoryId: string) {
    setDeleting(categoryId);
    await deleteMerchantCategory(categoryId);
    router.refresh();
    setDeleting(null);
  }

  // Separate categories by type
  const budgetCategories = categories.filter(c => c.category_type === 'budget');
  const eventCategories = categories.filter(c => c.category_type === 'event');

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Create categories to automatically group and track transactions.
      </div>

      {/* Budget-type categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Variable Spending (Budget Categories)
        </h3>
        <p className="text-xs text-muted-foreground">
          For expenses that vary each month (groceries, gas, dining). Multiple transactions per month.
        </p>

        {budgetCategories.length > 0 ? (
          <div className="space-y-2">
            {budgetCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isEditing={editingId === category.id}
                onEdit={() => startEdit(category)}
                onDelete={() => handleDelete(category.id)}
                deleting={deleting === category.id}
                // Edit form props
                name={name}
                setName={setName}
                keywordsInput={keywordsInput}
                setKeywordsInput={setKeywordsInput}
                categoryType={categoryType}
                setCategoryType={setCategoryType}
                monthlyBudget={monthlyBudget}
                setMonthlyBudget={setMonthlyBudget}
                eventId={eventId}
                setEventId={setEventId}
                events={events}
                error={error}
                saving={saving}
                onSubmit={handleSubmit}
                onCancel={resetForm}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg border-dashed">
            No budget categories yet
          </p>
        )}
      </div>

      {/* Event-type categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          Fixed Expenses (Event Categories)
        </h3>
        <p className="text-xs text-muted-foreground">
          For recurring bills with set amounts (mortgage, Netflix). Links to a scheduled event.
        </p>

        {eventCategories.length > 0 ? (
          <div className="space-y-2">
            {eventCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isEditing={editingId === category.id}
                onEdit={() => startEdit(category)}
                onDelete={() => handleDelete(category.id)}
                deleting={deleting === category.id}
                // Edit form props
                name={name}
                setName={setName}
                keywordsInput={keywordsInput}
                setKeywordsInput={setKeywordsInput}
                categoryType={categoryType}
                setCategoryType={setCategoryType}
                monthlyBudget={monthlyBudget}
                setMonthlyBudget={setMonthlyBudget}
                eventId={eventId}
                setEventId={setEventId}
                events={events}
                error={error}
                saving={saving}
                onSubmit={handleSubmit}
                onCancel={resetForm}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg border-dashed">
            No event categories yet
          </p>
        )}
      </div>

      {/* Add new category form */}
      {showForm ? (
        <CategoryForm
          name={name}
          setName={setName}
          keywordsInput={keywordsInput}
          setKeywordsInput={setKeywordsInput}
          categoryType={categoryType}
          setCategoryType={setCategoryType}
          monthlyBudget={monthlyBudget}
          setMonthlyBudget={setMonthlyBudget}
          eventId={eventId}
          setEventId={setEventId}
          events={events}
          error={error}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          disabled={editingId !== null}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      )}
    </div>
  );
}

interface CategoryCardProps {
  category: MerchantCategoryWithEvent;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  // Form props for edit mode
  name: string;
  setName: (v: string) => void;
  keywordsInput: string;
  setKeywordsInput: (v: string) => void;
  categoryType: CategoryType;
  setCategoryType: (v: CategoryType) => void;
  monthlyBudget: string;
  setMonthlyBudget: (v: string) => void;
  eventId: string;
  setEventId: (v: string) => void;
  events: Event[];
  error: string | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function CategoryCard({
  category,
  isEditing,
  onEdit,
  onDelete,
  deleting,
  ...formProps
}: CategoryCardProps) {
  if (isEditing) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <CategoryForm {...formProps} isEdit />
      </div>
    );
  }

  const isBudget = category.category_type === 'budget';

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-medium">{category.name}</span>
            <Badge variant={isBudget ? 'secondary' : 'outline'} className="text-xs">
              {isBudget ? 'Budget' : 'Event'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isBudget
              ? `Monthly budget: ${formatMoney(category.monthly_budget || 0)}`
              : `Links to: ${category.event?.title || 'Unknown event'}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {category.keywords.map((keyword, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface CategoryFormProps {
  name: string;
  setName: (v: string) => void;
  keywordsInput: string;
  setKeywordsInput: (v: string) => void;
  categoryType: CategoryType;
  setCategoryType: (v: CategoryType) => void;
  monthlyBudget: string;
  setMonthlyBudget: (v: string) => void;
  eventId: string;
  setEventId: (v: string) => void;
  events: Event[];
  error: string | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

function CategoryForm({
  name,
  setName,
  keywordsInput,
  setKeywordsInput,
  categoryType,
  setCategoryType,
  monthlyBudget,
  setMonthlyBudget,
  eventId,
  setEventId,
  events,
  error,
  saving,
  onSubmit,
  onCancel,
  isEdit,
}: CategoryFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!isEdit && <h3 className="font-medium">New Category</h3>}

      {error && (
        <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Category Name</Label>
          <Input
            id="name"
            placeholder="e.g., Gas, Groceries, Mortgage"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Category Type</Label>
          <select
            id="type"
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value as CategoryType)}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="budget">Budget (variable spending)</option>
            <option value="event">Event (fixed recurring)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
        <Input
          id="keywords"
          placeholder="e.g., CHEVRON, ARCO, SHELL"
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Transactions containing any of these keywords will be assigned to this category
        </p>
      </div>

      {categoryType === 'budget' ? (
        <div className="space-y-2">
          <Label htmlFor="budget">Monthly Budget</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="200.00"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="event">Link to Event</Label>
          <select
            id="event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="">Select a recurring event...</option>
            {events
              .filter(e => e.recurrence || e.status === 'upcoming')
              .map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={
            saving ||
            !name.trim() ||
            !keywordsInput.trim() ||
            (categoryType === 'budget' && !monthlyBudget) ||
            (categoryType === 'event' && !eventId)
          }
        >
          {isEdit ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              {saving ? 'Adding...' : 'Add Category'}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {isEdit ? <X className="h-4 w-4 mr-1" /> : null}
          Cancel
        </Button>
      </div>
    </form>
  );
}
