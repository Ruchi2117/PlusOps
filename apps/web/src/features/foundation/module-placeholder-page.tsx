import { Plus } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

type ModulePlaceholderPageProps = {
  title: string;
  emptyTitle: string;
  primaryAction: string;
};

export function ModulePlaceholderPage({
  title,
  emptyTitle,
  primaryAction
}: ModulePlaceholderPageProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspace setup required</p>
        </div>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          {primaryAction}
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid min-h-80 place-items-center rounded-md border border-dashed border-border p-6 text-center">
            <div>
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Add the first record to populate this workspace.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
