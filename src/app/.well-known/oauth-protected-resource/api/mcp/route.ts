import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";

// Metadati RFC 9728 della risorsa /api/mcp: il server di autorizzazione è Supabase Auth.
const handler = protectedResourceHandler({
  authServerUrls: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
});

const options = metadataCorsOptionsRequestHandler();

export { handler as GET, options as OPTIONS };
