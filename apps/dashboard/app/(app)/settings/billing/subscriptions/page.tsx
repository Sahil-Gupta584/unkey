/**
 * This page is only for debugging purposes
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "@/components/ui/code";
import { serverAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function PlanPage() {
  const tenantId = await serverAuth.getTenantId();

  const workspace = await db.query.workspaces.findFirst({
    where: (table, { and, eq, isNull }) =>
      and(eq(table.tenantId, tenantId), isNull(table.deletedAt)),
  });
  if (!workspace) {
    return redirect("/new");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan</CardTitle>
        <CardDescription>For debugging purposes</CardDescription>
      </CardHeader>
      <CardContent>
        <Code>
          {JSON.stringify(
            {
              workspaceId: workspace.id,
              stripeCustomerId: workspace.stripeCustomerId,
              subscriptions: workspace.subscriptions,
            },
            null,
            2,
          )}
        </Code>
      </CardContent>
    </Card>
  );
}
