from __future__ import annotations

import textwrap
from pathlib import Path

from .experiments import ExperimentResult


def write_analysis_report(
    path: Path,
    context: dict,
    experiments: list[ExperimentResult],
    stability: dict,
    retained_info: dict,
) -> None:
    lines: list[str] = []
    a = lines.append

    a(f"# Embedding Analysis — {context['street']}")
    a("")
    a("## Dataset summary")
    a("")
    a(f"- **Points:** {context['n_points']:,}")
    a(f"- **Retained feature dimensions:** {context['retained_dimensions']}")
    a(f"- **Dropped constant dimensions:** {len(retained_info.get('dropped_constant', []))}")
    if retained_info.get("dropped_constant"):
        a(f"  - {', '.join(retained_info['dropped_constant'][:10])}{'…' if len(retained_info['dropped_constant']) > 10 else ''}")
    a(f"- **PCA dimensions:** {context['pca_dimensions']} ({context['explained_variance_total']:.1%} variance)")
    a("")

    a("## UMAP parameters")
    a("")
    for k, v in context["umap_params"].items():
        a(f"- `{k}`: {v}")
    a("")

    a("## HDBSCAN clustering")
    a("")
    h = context["hdbscan"]
    a(f"- **Clusters:** {h['n_clusters']}")
    a(f"- **Noise points:** {h['noise_count']:,} ({h['noise_pct']:.1f}%)")
    a(f"- **Largest cluster:** {h['largest_cluster']:,}")
    if h["cluster_sizes"]:
        a(f"- **Top cluster sizes:** {h['cluster_sizes'][:10]}")
    a("")

    a("## Embedding quality")
    a("")
    q = context["quality"]
    a(f"- **Trustworthiness** (k={q['k']}): {q['trustworthiness']:.4f}")
    a(f"- **kNN overlap** (feature <-> 3D): {q['knn_overlap']:.4f}")
    a("")

    a("## Category distribution by cluster")
    a("")
    for cid, cats in sorted(context["category_by_cluster"].items()):
        if cid < 0:
            continue
        top = sorted(cats.items(), key=lambda x: -x[1])[:5]
        a(f"### Cluster {cid}")
        for cat, n in top:
            a(f"- {cat}: {n}")
        a("")

    a("## Equity distribution by cluster")
    a("")
    for cid, stats in sorted(context["equity_by_cluster"].items()):
        if cid < 0:
            continue
        a(f"- **Cluster {cid}:** mean={stats['mean']:.3f}, std={stats['std']:.3f}, range=[{stats['min']:.3f}, {stats['max']:.3f}]")
    a("")

    a("## Representative hands (nearest cluster centroid)")
    a("")
    for cid, hands in sorted(context["representative_hands"].items()):
        a(f"### Cluster {cid}")
        for hand in hands:
            a(f"- `{hand['id']}` hero={hand['hero']} board={hand['board']} category={hand['category']} equity={hand['equityVsRandom']:.3f}")
        a("")

    a("## Feature group experiments")
    a("")
    a("| Variant | Dim | PCA | Trustworthiness | kNN overlap | Clusters | Noise % |")
    a("|---------|-----|-----|-----------------|-------------|----------|---------|")
    for exp in experiments:
        if exp.skipped:
            a(f"| {exp.name} | — | — | — | — | — | skipped: {exp.skip_reason[:40]} |")
        else:
            a(
                f"| {exp.name} | {exp.retained_dim} | {exp.pca_dim} | "
                f"{exp.trustworthiness:.3f} | {exp.knn_overlap:.3f} | "
                f"{exp.n_clusters} | {exp.noise_pct:.1f} |"
            )
    a("")

    best = max((e for e in experiments if not e.skipped), key=lambda e: e.knn_overlap, default=None)
    if best:
        a(f"**Best kNN preservation (experiments):** `{best.name}` — {best.description}")
        a("")

    a("## Seed stability")
    a("")
    a(f"- Seeds tested: {stability['seeds']}")
    a(f"- Pairwise kNN overlap (3D): mean={stability['pairwise_knn_overlap_mean']:.3f}, min={stability['pairwise_knn_overlap_min']:.3f}")
    a(f"- Assessment: **{stability['interpretation']}**")
    a("")

    a("## Interpretation notes")
    a("")
    a(_interpretation_notes(context, experiments, stability))
    a("")

    path.write_text("\n".join(lines), encoding="utf-8")


def _interpretation_notes(context: dict, experiments: list[ExperimentResult], stability: dict) -> str:
    notes = []

    h = context["hdbscan"]
    if h["n_clusters"] == 0:
        notes.append("HDBSCAN found no stable clusters — geometry may be continuous rather than sharply partitioned.")
    elif h["noise_pct"] > 30:
        notes.append("High noise fraction suggests overlapping strategic regimes or embedding parameter tuning needed.")
    else:
        notes.append("HDBSCAN clusters are present at moderate noise levels — inspect category/equity tables for strategic meaning.")

    compact = next((e for e in experiments if e.name == "compact" and not e.skipped), None)
    no_board = next((e for e in experiments if e.name == "compact_no_board" and not e.skipped), None)
    no_removal = next((e for e in experiments if e.name == "compact_no_removal" and not e.skipped), None)
    extended = next((e for e in experiments if e.name == "extended" and not e.skipped), None)

    if compact and no_board:
        delta = compact.knn_overlap - no_board.knn_overlap
        if abs(delta) > 0.05:
            notes.append(f"Board metrics {'materially affect' if delta > 0 else 'do not improve'} local geometry (ΔkNN={delta:+.3f}).")
        else:
            notes.append("Board metrics have minimal effect on embedding neighborhood structure.")

    if compact and no_removal:
        delta = compact.knn_overlap - no_removal.knn_overlap
        if abs(delta) > 0.05:
            notes.append(f"Card-removal summaries {'materially affect' if delta > 0 else 'barely affect'} geometry (ΔkNN={delta:+.3f}).")

    if extended:
        if compact and extended.knn_overlap > compact.knn_overlap + 0.02:
            notes.append("Extended vector improves neighborhood preservation vs compact.")
        elif compact:
            notes.append("Compact vector matches or beats extended for kNN preservation on this sample.")

    if stability["interpretation"] == "sensitive":
        notes.append("Embedding is seed-sensitive — report UMAP seed in all artifacts; consider larger n_neighbors.")
    elif stability["interpretation"] == "stable":
        notes.append("Embedding is reasonably stable across UMAP seeds.")

    return textwrap.fill(" ".join(notes), width=100)
