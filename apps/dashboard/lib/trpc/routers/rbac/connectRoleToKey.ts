import { db, schema } from "@/lib/db";
import { ingestAuditLogs } from "@/lib/tinybird";
import { rateLimitedProcedure, ratelimit } from "@/lib/trpc/ratelimitProcedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const connectRoleToKey = rateLimitedProcedure(ratelimit.update)
  .input(
    z.object({
      roleId: z.string(),
      keyId: z.string(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const workspace = await db.query.workspaces.findFirst({
      where: (table, { and, eq, isNull }) =>
        and(eq(table.tenantId, ctx.tenant.id), isNull(table.deletedAt)),
      with: {
        roles: {
          where: (table, { eq }) => eq(table.id, input.roleId),
        },
        keys: {
          where: (table, { eq }) => eq(table.id, input.keyId),
        },
      },
    });
    if (!workspace) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "We are unable to find the correct workspace. Please contact support using support@unkey.dev.",
      });
    }
    const role = workspace.roles.at(0);
    if (!role) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "We are unable to find the correct role. Please contact support using support@unkey.dev.",
      });
    }
    const key = workspace.keys.at(0);
    if (!key) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "We are unable to find the correct key. Please contact support using support@unkey.dev.",
      });
    }

    const tuple = {
      workspaceId: workspace.id,
      keyId: key.id,
      roleId: role.id,
    };
    await db
      .insert(schema.keysRoles)
      .values({ ...tuple, createdAt: new Date() })
      .onDuplicateKeyUpdate({
        set: { ...tuple, updatedAt: new Date() },
      })
      .catch((_err) => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "We are unable to connect the role and key. Please contact support using support@unkey.dev.",
        });
      });

    await ingestAuditLogs({
      workspaceId: workspace.id,
      actor: { type: "user", id: ctx.user.id },
      event: "authorization.connect_role_and_key",
      description: `Connect role ${role.id} to ${key.id}`,
      resources: [
        {
          type: "role",
          id: role.id,
        },
        {
          type: "key",
          id: key.id,
        },
      ],
      context: {
        location: ctx.audit.location,
        userAgent: ctx.audit.userAgent,
      },
    });
  });
