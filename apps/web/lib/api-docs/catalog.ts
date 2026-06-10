export type HttpMethod = "GET" | "POST";

export interface ApiEndpointDoc {
  slug: string;
  method: HttpMethod;
  path: string;
  title: string;
  summary: string;
  tags: string[];
  requiresArtifacts: boolean;
}

export const API_BASE_NOTE =
  "Use your deployed host as the base URL. The canonical API lives on geometry-of-poker; short domains may redirect there.";

export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    slug: "state",
    method: "POST",
    path: "/api/state",
    title: "Analyze state",
    summary:
      "Full combinatorial poker analysis for a hero + board. Category, equity, feature groups, combinatorics, and availability flags. No map or artifacts required.",
    tags: ["analysis", "recommended"],
    requiresArtifacts: false,
  },
  {
    slug: "project",
    method: "POST",
    path: "/api/project",
    title: "Project onto map",
    summary:
      "Extract features and project a hand into the 3D embedding. Returns coordinates, neighbors, and projection method. Requires release artifacts.",
    tags: ["visualization", "artifacts"],
    requiresArtifacts: true,
  },
  {
    slug: "health",
    method: "GET",
    path: "/api/health",
    title: "Health check",
    summary:
      "Deployment status, native engine availability, artifact mode, and which streets are loaded.",
    tags: ["meta"],
    requiresArtifacts: false,
  },
  {
    slug: "state-metrics",
    method: "POST",
    path: "/api/state-metrics",
    title: "Runout metrics",
    summary:
      "Exact runout quantiles and vulnerability only. Prefer POST /api/state for new integrations.",
    tags: ["analysis", "legacy"],
    requiresArtifacts: false,
  },
];

export function getEndpointDoc(slug: string): ApiEndpointDoc | undefined {
  return API_ENDPOINTS.find((endpoint) => endpoint.slug === slug);
}

export function requireEndpointDoc(slug: string): ApiEndpointDoc {
  const doc = getEndpointDoc(slug);
  if (!doc) throw new Error(`Missing API documentation for ${slug}`);
  return doc;
}
