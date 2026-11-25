import { createFileRoute } from "@tanstack/react-router";
import {
  createLocalBase44,
  loginLocalUser,
  logoutLocalSession,
  registerLocalUser,
} from "@/lib/local-db.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const action = params._splat;
        if (action === "me") {
          try {
            const user = await createLocalBase44(request).auth.me();
            return Response.json(user);
          } catch (err) {
            return Response.json({ error: err?.message || "Unauthorized" }, { status: err?.status || 401 });
          }
        }
        return Response.json({ error: "Not found" }, { status: 404 });
      },
      POST: async ({ request, params }) => {
        const action = params._splat;
        try {
          if (action === "login") {
            const body = await request.json();
            const result = await loginLocalUser(body.email, body.password);
            return Response.json(result);
          }
          if (action === "register") {
            const body = await request.json();
            const result = await registerLocalUser(body);
            return Response.json(result);
          }
          if (action === "logout") {
            const authHeader = request.headers.get("Authorization") || "";
            const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
            await logoutLocalSession(token);
            return Response.json({ ok: true });
          }
          return Response.json({ error: "Not found" }, { status: 404 });
        } catch (err) {
          return Response.json(
            { error: { message: err?.message || "Request failed" }, detail: err?.message || "Request failed" },
            { status: err?.status || 400 },
          );
        }
      },
    },
  },
});
