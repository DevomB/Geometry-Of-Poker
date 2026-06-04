from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

from .analyze import build_analysis_context
from .artifacts import save_artifacts
from .config import STREETS, resolve_paths
from .experiments import ExperimentResult, run_experiment_variant, seed_stability
from .features import EXPERIMENT_VARIANTS
from .fit import fit_embedding_pipeline, save_models
from .load import feature_matrix, load_parquet
from .features import parquet_feature_columns
from .preprocess import drop_constant_columns, save_retained_features
from .report import write_analysis_report


def embed_street(
    street: str,
    input_path: Path,
    output_dir: Path,
    random_state: int = 42,
) -> dict:
    from .config import EmbedConfig

    if not input_path.exists():
        raise FileNotFoundError(
            f"Real dataset parquet is required for {street}: {input_path}. "
            f"Run `pnpm generate -- --street {street}` first."
        )

    print(f"[embed] loading {input_path}")
    t0 = time.perf_counter()
    df = load_parquet(input_path)
    feature_cols = parquet_feature_columns(list(df.columns))
    X, cols = feature_matrix(df, feature_cols)
    print(f"[embed] {len(df):,} records x {len(cols)} features")

    config = EmbedConfig(street=street, input_path=input_path, output_dir=output_dir, random_state=random_state)

    prep = drop_constant_columns(X, cols)
    print(f"[embed] retained {len(prep.retained_features)} features (dropped {len(prep.dropped_constant)} constant)")

    output_dir.mkdir(parents=True, exist_ok=True)
    save_retained_features(str(output_dir / "retained-features.json"), prep, street)

    print("[embed] fitting StandardScaler -> PCA -> UMAP -> HDBSCAN")
    result = fit_embedding_pipeline(prep.X, prep.retained_features, config)
    ids = df["id"].to_numpy()

    save_models(result, str(output_dir), ids)
    embedding_df = save_artifacts(output_dir, street, df, result.coords, result.labels, prep.retained_features)

    retained_info = json.loads((output_dir / "retained-features.json").read_text(encoding="utf-8"))
    context = build_analysis_context(street, result, embedding_df, config)
    context["retained_dimensions"] = len(prep.retained_features)
    context["original_dimensions"] = len(cols)

    print("[embed] running feature-group experiments")
    experiments: list[ExperimentResult] = []
    for name, spec in EXPERIMENT_VARIANTS.items():
        if spec.get("extended"):
            ext_cols = [
                c
                for c in df.columns
                if c.startswith("removalGradientDeck") or c.startswith("categoryJoint")
            ]
            if not ext_cols:
                experiments.append(
                    ExperimentResult(
                        name=name,
                        description=spec["description"],
                        retained_dim=0,
                        pca_dim=0,
                        trustworthiness=0.0,
                        knn_overlap=0.0,
                        n_clusters=0,
                        noise_pct=0.0,
                        skipped=True,
                        skip_reason="Extended columns not in parquet",
                    )
                )
                continue
            X_ext, ext_names = feature_matrix(df, parquet_feature_columns(list(df.columns)))
            exp = run_experiment_variant(name, spec["description"], X_ext, ext_names, config)
        else:
            X_var, var_cols = feature_matrix(df, cols, exclude=spec.get("exclude"))
            exp = run_experiment_variant(name, spec["description"], X_var, var_cols, config)
        experiments.append(exp)
        status = "skipped" if exp.skipped else f"kNN={exp.knn_overlap:.3f}"
        print(f"  - {name}: {status}")

    stability = seed_stability(prep.X, prep.retained_features, config)
    print(f"[embed] seed stability: {stability['interpretation']} (mean overlap={stability['pairwise_knn_overlap_mean']:.3f})")

    write_analysis_report(output_dir / "analysis-report.md", context, experiments, stability, retained_info)

    elapsed = time.perf_counter() - t0
    print(f"[embed] done {street} in {elapsed:.1f}s -> {output_dir}")

    return {
        "street": street,
        "count": len(df),
        "elapsed_s": elapsed,
        "context": context,
        "experiments": experiments,
        "stability": stability,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Geometry of Poker street embedding pipeline")
    parser.add_argument("--street", choices=STREETS, help="Street to embed")
    parser.add_argument("--input", help="Path to records.parquet")
    parser.add_argument("--output", help="Output directory for embedding artifacts")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--all", action="store_true", help="Embed all four streets")
    args = parser.parse_args(argv)

    if args.all:
        results = []
        for street in STREETS:
            cfg = resolve_paths(street, args.input, args.output)
            results.append(embed_street(street, cfg.input_path, cfg.output_dir, args.seed))
        print("\n[embed] all streets complete")
        for r in results:
            print(f"  {r['street']}: {r['count']:,} points in {r['elapsed_s']:.1f}s")
        return 0

    if not args.street:
        parser.error("--street is required unless --all is set")

    cfg = resolve_paths(args.street, args.input, args.output)
    embed_street(args.street, cfg.input_path, cfg.output_dir, args.seed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
