import { createClient } from "@/lib/supabase/server";
import { addTask, toggleTask } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function TasksModule() {
  const supabase = await createClient();
  // RLS guarantees this only returns the signed-in user's own tasks.
  const { data: tasks } = await supabase
    .from("tasks_items")
    .select("id, title, done")
    .order("created_at", { ascending: false });
  const rows = tasks ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add a task</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addTask} className="flex gap-2">
            <Input name="title" placeholder="New task" required />
            <SubmitButton pendingText="Adding…">Add</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((t) => (
            <Card key={t.id} size="sm">
              <CardContent className="flex items-center justify-between gap-3">
                <span className={t.done ? "text-muted-foreground line-through" : ""}>
                  {t.title}
                </span>
                <form action={toggleTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="done" value={t.done ? "0" : "1"} />
                  <SubmitButton variant="outline" size="sm">
                    {t.done ? "Undo" : "Done"}
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No tasks yet. Add your first one above.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
