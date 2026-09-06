import Link from "next/link";
import { Activity } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Intern, ProgressInfo, Task } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskToggle, AddTaskForm, StatusSelect } from "@/components/progress-controls";
import {
  toggleProgressTask,
  deleteProgressTask,
  addProgressTask,
  updateInternStatus,
} from "@/lib/actions/progress";

export const dynamic = "force-dynamic";
export const metadata = { title: "Internship Progress" };

interface BoardItem {
  intern: Intern;
  progress: ProgressInfo;
  tasks: Task[];
}

export default async function ProgressPage() {
  const board = (await apiGet<BoardItem[]>("/progress")) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Internship Progress" description="Track timelines and task completion for every intern." />

      {board.length === 0 ? (
        <Card>
          <EmptyState icon={Activity} title="No interns to track" description="Add interns to begin tracking their progress." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {board.map(({ intern, progress: p, tasks }) => {
            const done = tasks.filter((t) => t.isDone).length;
            return (
              <Card key={intern.id}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/interns/${intern.id}`} className="flex min-w-0 items-center gap-3">
                      <Avatar name={intern.fullName} src={intern.photoUrl} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{intern.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{intern.role ?? "Intern"}</p>
                      </div>
                    </Link>
                    <StatusSelect current={intern.status} updateAction={updateInternStatus.bind(null, intern.id)} />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{p.daysCompleted} / {p.totalDays} days</span>
                      <span className="font-semibold text-slate-900">{p.percent}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${p.percent}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                      <span>{p.daysRemaining} days remaining</span>
                      <span>Tasks {done}/{tasks.length}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    {tasks.map((t) => (
                      <TaskToggle
                        key={t.id}
                        done={t.isDone}
                        title={t.title}
                        toggleAction={toggleProgressTask.bind(null, t.id)}
                        deleteAction={deleteProgressTask.bind(null, t.id)}
                      />
                    ))}
                    <AddTaskForm addAction={addProgressTask.bind(null, intern.id)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
