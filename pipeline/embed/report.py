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
    _add_dataset_summary(lines, context, retained_info)
    _add_umap_parameters(lines, context)
    _add_hdbscan_summary(lines, context)
    _add_quality_summary(lines, context)
    _add_category_distribution(lines, context)
    _add_equity_distribution(lines, context)
    _add_representative_hands(lines, context)
    _add_experiment_table(lines, experiments)
    _add_seed_stability(lines, stability)
    _add_interpretation(lines, context, experiments, stability)
    path.write_text("\n".join(lines), encoding="utf-8")


def _section(lines: list[str], title: str) -> None:
    lines.extend([f"## {title}", ""])


def _add_dataset_summary(lines: list[str], context: dict, retained_info: dict) -> None:
    lines.extend([f"# Embedding Analysis - {context['street']}", ""])
    _section(lines, "Dataset summary")
    dropped = retained_info.get("dropped_constant", [])
    lines.append(f"- **Points:** {context['n_points']:,}")
    lines.append(f"- **Retained feature dimensions:** {context['retained_dimensions']}")
    lines.append(f"- **Dropped constant dimensions:** {len(dropped)}")
    if dropped:
        suffix = "..." if len(dropped) > 10 else ""
        lines.append(f"  - {', '.join(dropped[:10])}{suffix}")
    lines.append(
        f"- **PCA dimensions:** {context['pca_dimensions']} "
        f"({context['explained_variance_total']:.1%} variance)"
    )
    lines.append("")


def _add_umap_parameters(lines: list[str], context: dict) -> None:
    _section(lines, "UMAP parameters")
    for key, value in context["umap_params"].items():
        lines.append(f"- `{key}`: {value}")
    lines.append("")


def _add_hdbscan_summary(lines: list[str], context: dict) -> None:
    _section(lines, "HDBSCAN clustering")
    hdbscan = context["hdbscan"]
    lines.append(f"- **Clusters:** {hdbscan['n_clusters']}")
    lines.append(f"- **Noise points:** {hdbscan['noise_count']:,} ({hdbscan['noise_pct']:.1f}%)")
    lines.append(f"- **Largest cluster:** {hdbscan['largest_cluster']:,}")
    if hdbscan["cluster_sizes"]:
        lines.append(f"- **Top cluster sizes:** {hdbscan['cluster_sizes'][:10]}")
    lines.append("")


def _add_quality_summary(lines: list[str], context: dict) -> None:
    _section(lines, "Embedding quality")
    quality = context["quality"]
    lines.append(f"- **Trustworthiness** (k={quality['k']}): {quality['trustworthiness']:.4f}")
    lines.append(f"- **kNN overlap** (feature <-> 3D): {quality['knn_overlap']:.4f}")
    lines.append("")


def _add_category_distribution(lines: list[str], context: dict) -> None:
    _section(lines, "Category distribution by cluster")
    for cid, cats in sorted(context["category_by_cluster"].items()):
        if cid < 0:
            continue
        lines.append(f"### Cluster {cid}")
        for cat, count in sorted(cats.items(), key=lambda x: -x[1])[:5]:
            lines.append(f"- {cat}: {count}")
        lines.append("")


def _add_equity_distribution(lines: list[str], context: dict) -> None:
    _section(lines, "Equity distribution by cluster")
    for cid, stats in sorted(context["equity_by_cluster"].items()):
        if cid < 0:
            continue
        lines.append(
            f"- **Cluster {cid}:** mean={stats['mean']:.3f}, std={stats['std']:.3f}, "
            f"range=[{stats['min']:.3f}, {stats['max']:.3f}]"
        )
    lines.append("")


def _add_representative_hands(lines: list[str], context: dict) -> None:
    _section(lines, "Representative hands (nearest cluster centroid)")
    for cid, hands in sorted(context["representative_hands"].items()):
        lines.append(f"### Cluster {cid}")
        for hand in hands:
            lines.append(
                f"- `{hand['id']}` hero={hand['hero']} board={hand['board']} "
                f"category={hand['category']} equity={hand['equityVsRandom']:.3f}"
            )
        lines.append("")


def _add_experiment_table(lines: list[str], experiments: list[ExperimentResult]) -> None:
    _section(lines, "Feature group experiments")
    lines.append("| Variant | Dim | PCA | Trustworthiness | kNN overlap | Clusters | Noise % |")
    lines.append("|---------|-----|-----|-----------------|-------------|----------|---------|")
    for exp in experiments:
        lines.append(_experiment_row(exp))
    lines.append("")

    best = max((exp for exp in experiments if not exp.skipped), key=lambda exp: exp.knn_overlap, default=None)
    if best:
        lines.extend([f"**Best kNN preservation (experiments):** `{best.name}` - {best.description}", ""])


def _experiment_row(exp: ExperimentResult) -> str:
    if exp.skipped:
        return f"| {exp.name} | - | - | - | - | - | skipped: {exp.skip_reason[:40]} |"
    return (
        f"| {exp.name} | {exp.retained_dim} | {exp.pca_dim} | "
        f"{exp.trustworthiness:.3f} | {exp.knn_overlap:.3f} | "
        f"{exp.n_clusters} | {exp.noise_pct:.1f} |"
    )


def _add_seed_stability(lines: list[str], stability: dict) -> None:
    _section(lines, "Seed stability")
    lines.append(f"- Seeds tested: {stability['seeds']}")
    lines.append(
        f"- Pairwise kNN overlap (3D): mean={stability['pairwise_knn_overlap_mean']:.3f}, "
        f"min={stability['pairwise_knn_overlap_min']:.3f}"
    )
    lines.append(f"- Assessment: **{stability['interpretation']}**")
    lines.append("")


def _add_interpretation(
    lines: list[str],
    context: dict,
    experiments: list[ExperimentResult],
    stability: dict,
) -> None:
    _section(lines, "Interpretation notes")
    lines.extend([_interpretation_notes(context, experiments, stability), ""])


def _interpretation_notes(context: dict, experiments: list[ExperimentResult], stability: dict) -> str:
    notes = [_cluster_note(context["hdbscan"])]
    notes.extend(_feature_ablation_notes(experiments))
    stability_note = _stability_note(stability["interpretation"])
    if stability_note:
        notes.append(stability_note)
    return textwrap.fill(" ".join(notes), width=100)


def _cluster_note(hdbscan: dict) -> str:
    if hdbscan["n_clusters"] == 0:
        return "HDBSCAN found no stable clusters; geometry may be continuous rather than sharply partitioned."
    if hdbscan["noise_pct"] > 30:
        return "High noise fraction suggests overlapping strategic regimes or embedding parameter tuning needed."
    return "HDBSCAN clusters are present at moderate noise levels; inspect category/equity tables for strategic meaning."


def _experiment_by_name(experiments: list[ExperimentResult], name: str) -> ExperimentResult | None:
    return next((exp for exp in experiments if exp.name == name and not exp.skipped), None)


def _feature_ablation_notes(experiments: list[ExperimentResult]) -> list[str]:
    compact = _experiment_by_name(experiments, "compact")
    notes = []
    notes.extend(_delta_note(compact, _experiment_by_name(experiments, "compact_no_board"), "Board metrics", "local geometry"))
    notes.extend(_delta_note(compact, _experiment_by_name(experiments, "compact_no_removal"), "Card-removal summaries", "geometry"))
    notes.extend(_extended_vector_note(compact, _experiment_by_name(experiments, "extended")))
    return notes


def _delta_note(
    compact: ExperimentResult | None,
    variant: ExperimentResult | None,
    subject: str,
    target: str,
) -> list[str]:
    if not compact or not variant:
        return []
    delta = compact.knn_overlap - variant.knn_overlap
    if abs(delta) <= 0.05:
        return [f"{subject} have minimal effect on embedding neighborhood structure."]
    effect = "materially affect" if delta > 0 else "do not improve"
    return [f"{subject} {effect} {target} (delta kNN={delta:+.3f})."]


def _extended_vector_note(
    compact: ExperimentResult | None,
    extended: ExperimentResult | None,
) -> list[str]:
    if not extended or not compact:
        return []
    if extended.knn_overlap > compact.knn_overlap + 0.02:
        return ["Extended vector improves neighborhood preservation vs compact."]
    return ["Compact vector matches or beats extended for kNN preservation on this sample."]


def _stability_note(interpretation: str) -> str:
    if interpretation == "sensitive":
        return "Embedding is seed-sensitive; report UMAP seed in all artifacts and consider larger n_neighbors."
    if interpretation == "stable":
        return "Embedding is reasonably stable across UMAP seeds."
    return ""