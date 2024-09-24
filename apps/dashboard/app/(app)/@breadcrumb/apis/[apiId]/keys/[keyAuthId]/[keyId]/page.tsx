import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { serverAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { unstable_cache as cache } from "next/cache";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type PageProps = {
  params: { apiId: string; keyAuthId: string; keyId: string };
};

async function AsyncPageBreadcrumb(props: PageProps) {
  const tenantId = await serverAuth.getTenantId();

  const getApiById = cache(
    async (apiId: string) =>
      db.query.apis.findFirst({
        where: (table, { eq, and, isNull }) => and(eq(table.id, apiId), isNull(table.deletedAt)),

        with: {
          workspace: true,
        },
      }),
    ["apiById"],
  );

  const api = await getApiById(props.params.apiId);
  if (!api || api.workspace.tenantId !== tenantId) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/apis">APIs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/apis/${props.params.apiId}`}>{api.name}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/apis/${props.params.apiId}/keys/${props.params.keyAuthId}`}>
            Keys
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            ...
            {props.params.keyId.substring(props.params.keyId.length - 4, props.params.keyId.length)}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function PageBreadcrumb(props: PageProps) {
  return (
    <Suspense fallback={null}>
      <AsyncPageBreadcrumb {...props} />
    </Suspense>
  );
}
