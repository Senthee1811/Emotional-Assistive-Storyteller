import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def _run(cmd, cwd):
    print(" ".join(cmd))
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed with code {result.returncode}: {' '.join(cmd)}")


def main():
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent
    sweeps_root = project_root / "models" / "sweeps"
    sweep_name = datetime.now().strftime("%Y%m%d_%H%M%S")
    sweep_dir = sweeps_root / sweep_name
    sweep_dir.mkdir(parents=True, exist_ok=True)

    # Keep this compact to avoid very long runs; expand as needed.
    experiments = [
        {"name": "ce_lr1e4_bs32", "lr": 1e-4, "epochs": 30, "focal": False, "gamma": 2.0},
        {"name": "ce_lr5e4_bs32", "lr": 5e-4, "epochs": 30, "focal": False, "gamma": 2.0},
        {"name": "focal_lr1e4_g2", "lr": 1e-4, "epochs": 30, "focal": True, "gamma": 2.0},
        {"name": "focal_lr5e5_g1p5", "lr": 5e-5, "epochs": 40, "focal": True, "gamma": 1.5},
    ]

    summary_rows = []
    for exp in experiments:
        run_dir = sweep_dir / exp["name"]
        run_dir.mkdir(parents=True, exist_ok=True)
        model_path = run_dir / "model.pth"

        train_cmd = [
            sys.executable,
            "train.py",
            "--run-name",
            exp["name"],
            "--epochs",
            str(exp["epochs"]),
            "--lr",
            str(exp["lr"]),
            "--early-stop-patience",
            "8",
            "--model-path",
            str(model_path),
        ]
        if exp["focal"]:
            train_cmd.extend(["--use-focal-loss", "--focal-gamma", str(exp["gamma"])])

        _run(train_cmd, cwd=str(backend_dir))
        _run(
            [
                sys.executable,
                "evaluate_face_model.py",
                "--split",
                "test",
                "--model-path",
                str(model_path),
            ],
            cwd=str(backend_dir),
        )

        metrics_dir = run_dir / "metrics"
        report_path = metrics_dir / "classification_report.json"
        summary_path = metrics_dir / "training_summary.json"

        row = {"name": exp["name"], "model_path": str(model_path)}
        if summary_path.exists():
            row.update(json.loads(summary_path.read_text(encoding="utf-8")))
        if report_path.exists():
            report_payload = json.loads(report_path.read_text(encoding="utf-8"))
            row["test_accuracy"] = report_payload.get("accuracy")
            row["test_macro_f1"] = (
                report_payload.get("classification_report", {})
                .get("macro avg", {})
                .get("f1-score")
            )
        summary_rows.append(row)

    summary_rows.sort(key=lambda x: x.get("test_macro_f1", -1), reverse=True)
    out_path = sweep_dir / "sweep_results.json"
    out_path.write_text(json.dumps(summary_rows, indent=2), encoding="utf-8")

    print(f"\nSweep complete. Results: {out_path}")
    if summary_rows:
        best = summary_rows[0]
        print(
            "Best run: "
            f"{best.get('name')} "
            f"(macro_f1={best.get('test_macro_f1')}, acc={best.get('test_accuracy')})"
        )


if __name__ == "__main__":
    main()
