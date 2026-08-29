"use client";

import { useState, type FormEvent } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical } from "lucide-react";
import type { Expense, Person, SplitMethod } from "@/types";
import {
  DEFAULT_CATEGORY,
  EXPENSE_CATEGORIES,
  NOTE_MAX_LENGTH,
  categoryMeta,
  type ExpenseCategory,
} from "@/lib/categories";
import { formatCurrency, splitEqually, sumSplits, toCents } from "@/lib/money";
import { generateId, timestampNow, toDateInputValue, combineDateAndTime } from "@/lib/id";
import { AvatarBadge } from "./AvatarBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function emptyExactAmounts(participantIds: string[]): Record<string, string> {
  return Object.fromEntries(participantIds.map((id) => [id, ""]));
}

function initialExactAmounts(editingExpense: Expense | null): Record<string, string> {
  if (!editingExpense) return {};
  const amounts = emptyExactAmounts(editingExpense.participantIds);
  for (const split of editingExpense.splits) {
    amounts[split.personId] = (split.amountCents / 100).toString();
  }
  return amounts;
}

function initialOrder(people: Person[], editingExpense: Expense | null): string[] {
  const base = editingExpense?.participantIds ?? people.map((p) => p.id);
  const rest = people.map((p) => p.id).filter((id) => !base.includes(id));
  return [...base, ...rest];
}

// Drag is scoped to the grip handle (dragListener={false} + manual
// controls.start) rather than the whole row, so tapping the checkbox/label
// still just toggles — it doesn't fight the drag gesture. Motion's Reorder
// handles both mouse and touch input, unlike the HTML5 drag-and-drop API
// (which native mobile browsers never fire drag events for at all).
function ParticipantRow({
  person,
  checked,
  onToggle,
}: {
  person: Person;
  checked: boolean;
  onToggle: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={person.id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </span>
      <label className="flex flex-1 cursor-pointer items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={onToggle} />
        <AvatarBadge id={person.id} name={person.name} avatarUrl={person.avatarUrl} size="sm" />
        {person.name}
      </label>
    </Reorder.Item>
  );
}

// Rendered with a `key` in ExpenseFormDialog that changes between "new" and
// each expense id, so switching targets remounts this form instead of
// syncing via an effect.
export function ExpenseForm({
  people,
  editingExpense,
  onSave,
  onCancel,
}: {
  people: Person[];
  editingExpense: Expense | null;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(editingExpense?.description ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(
    editingExpense?.category ?? DEFAULT_CATEGORY
  );
  const [note, setNote] = useState(editingExpense?.note ?? "");
  const [amountRs, setAmountRs] = useState(
    editingExpense ? (editingExpense.totalCents / 100).toString() : ""
  );
  const [paidBy, setPaidBy] = useState(editingExpense?.paidBy ?? people[0]?.id ?? "");
  // Captured once on mount: source of truth for the time-of-day portion of
  // createdAt, so picking a date doesn't collapse same-day entries to midnight.
  const [referenceTime] = useState(() => editingExpense?.createdAt ?? timestampNow());
  const [dateStr, setDateStr] = useState(() => toDateInputValue(referenceTime));
  // `order` controls display order for every member, checked or not. Splits
  // (equal or exact) are computed in this order, so dragging a row also
  // decides who gets the leftover cent(s) on an uneven equal split.
  const [order, setOrder] = useState<string[]>(() => initialOrder(people, editingExpense));
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(editingExpense?.participantIds ?? people.map((p) => p.id))
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(editingExpense?.splitMethod ?? "equal");
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    initialExactAmounts(editingExpense)
  );

  const participantIds = order.filter((id) => selected.has(id));
  const totalCents = toCents(parseFloat(amountRs) || 0);

  function toggleParticipant(personId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  const equalPreview =
    splitMethod === "equal" && participantIds.length > 0
      ? splitEqually(totalCents, participantIds)
      : [];

  const exactSplits = participantIds.map((personId) => ({
    personId,
    amountCents: toCents(parseFloat(exactAmounts[personId]) || 0),
  }));
  const exactSum = sumSplits(exactSplits);
  const exactRemaining = totalCents - exactSum;

  const canSubmit =
    paidBy !== "" &&
    participantIds.length > 0 &&
    totalCents > 0 &&
    (splitMethod === "equal" || exactRemaining === 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const splits = splitMethod === "equal" ? splitEqually(totalCents, participantIds) : exactSplits;

    const expense: Expense = {
      id: editingExpense?.id ?? generateId(),
      description: description.trim(),
      totalCents,
      paidBy,
      participantIds,
      splitMethod,
      splits,
      createdAt: combineDateAndTime(dateStr, referenceTime),
      category,
      note: note.trim() || null,
    };

    onSave(expense);
  }

  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least one member before logging an expense.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-description">Description</Label>
        <Input
          id="expense-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner, Uber, Groceries"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
          <SelectTrigger id="expense-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((value) => {
              const { label, icon: Icon } = categoryMeta(value);
              return (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="expense-note">Note (optional)</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
        <Input
          id="expense-note"
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Table for 6, tip included"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="expense-amount">Total amount (LKR)</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            value={amountRs}
            onChange={(e) => setAmountRs(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-paidby">Paid by</Label>
        <Select value={paidBy} onValueChange={setPaidBy}>
          <SelectTrigger id="expense-paidby" className="w-full">
            <SelectValue placeholder="Select who paid" />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label>Split between</Label>
          <span
            tabIndex={0}
            title="If the total can't be split perfectly evenly, the extra cent(s) go to the first person in this list. Drag rows by the handle to reorder."
            className="flex size-4 shrink-0 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
          >
            i
          </span>
        </div>
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={setOrder}
          className="flex flex-col gap-1.5"
        >
          {order.map((personId) => {
            const p = people.find((person) => person.id === personId);
            if (!p) return null;
            return (
              <ParticipantRow
                key={p.id}
                person={p}
                checked={selected.has(p.id)}
                onToggle={() => toggleParticipant(p.id)}
              />
            );
          })}
        </Reorder.Group>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Split method</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={splitMethod}
          onValueChange={(v) => v && setSplitMethod(v as SplitMethod)}
          className="w-full"
        >
          <ToggleGroupItem value="equal" className="flex-1">
            Equal
          </ToggleGroupItem>
          <ToggleGroupItem value="exact" className="flex-1">
            Exact amount
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {splitMethod === "equal" && participantIds.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-lg border border-border p-3 text-sm">
          {equalPreview.map((split) => {
            const person = people.find((p) => p.id === split.personId);
            const minAmount = Math.min(...equalPreview.map((s) => s.amountCents));
            const getsExtraCent = split.amountCents > minAmount;
            return (
              <li key={split.personId} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {person?.name}
                  {getsExtraCent && (
                    <Badge variant="outline" className="text-[10px]">
                      +1¢
                    </Badge>
                  )}
                </span>
                <span className="tabular-nums">{formatCurrency(split.amountCents)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {splitMethod === "exact" && participantIds.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
          {participantIds.map((personId) => {
            const person = people.find((p) => p.id === personId);
            return (
              <div key={personId} className="flex items-center justify-between gap-3">
                <span className="text-sm">{person?.name}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={exactAmounts[personId] ?? ""}
                  onChange={(e) =>
                    setExactAmounts((prev) => ({ ...prev, [personId]: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-28 text-right"
                />
              </div>
            );
          })}
          <div
            className={cn(
              "mt-1 text-right text-sm font-medium",
              exactRemaining === 0 ? "text-positive" : "text-negative"
            )}
          >
            {exactRemaining === 0
              ? "Splits match the total"
              : `Remaining: ${formatCurrency(exactRemaining)}`}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {editingExpense ? "Save changes" : "Add expense"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
