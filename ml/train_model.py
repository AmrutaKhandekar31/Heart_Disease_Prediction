"""
Smart Heart Disease Risk Prediction — ML pipeline.

Reads ml/heart.csv, performs data inspection + EDA, trains and compares
several classifiers, then exports:

  ml/artifacts/heart_model.joblib   -> saved sklearn pipeline
  ml/artifacts/model_card.json      -> metrics, coefficients, metadata
  ml/artifacts/dataset_profile.json -> EDA aggregates for the dashboard
  ml/artifacts/figures/*.png        -> matplotlib/seaborn EDA figures

The exported model_card.json contains the full logistic-regression
coefficients (plus the standardization statistics), which lets the web app
reproduce the exact same probability in TypeScript with no Python runtime.

Usage:
    pip install -r ml/requirements.txt
    python ml/train_model.py
"""

from __future__ import annotations

import json
import os

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "heart.csv")
ART = os.path.join(HERE, "artifacts")
FIG = os.path.join(ART, "figures")
RANDOM_STATE = 42

NUMERIC = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CATEGORICAL = {
    "sex": [0, 1],
    "cp": [0, 1, 2, 3],
    "fbs": [0, 1],
    "restecg": [0, 1, 2],
    "exang": [0, 1],
    "slope": [0, 1, 2],
    "ca": [0, 1, 2, 3],
    "thal": [1, 2, 3],
}
TARGET = "target"


def inspect(df: pd.DataFrame) -> None:
    print("shape:", df.shape)
    print(df.dtypes)
    print("missing values:\n", df.isna().sum())
    print("class distribution:\n", df[TARGET].value_counts())
    print(df.describe().T)


def encode(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Standardizable numeric columns + drop-first one-hot categoricals."""
    frames = [df[NUMERIC].astype(float)]
    for col, levels in CATEGORICAL.items():
        for level in levels[1:]:  # drop-first baseline
            frames.append(
                pd.Series((df[col] == level).astype(float), name=f"{col}_{level}")
            )
    X = pd.concat(frames, axis=1)
    return X, list(X.columns)


def eda_figures(df: pd.DataFrame) -> None:
    os.makedirs(FIG, exist_ok=True)
    sns.set_theme(style="whitegrid")

    plt.figure(figsize=(9, 7))
    sns.heatmap(df.corr(numeric_only=True), annot=False, cmap="rocket_r")
    plt.title("Feature correlation")
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "correlation.png"), dpi=130)
    plt.close()

    fig, axes = plt.subplots(2, 3, figsize=(15, 8))
    for ax, col in zip(axes.ravel(), NUMERIC + ["ca"]):
        sns.histplot(data=df, x=col, hue=TARGET, kde=col in NUMERIC, ax=ax)
        ax.set_title(col)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "distributions.png"), dpi=130)
    plt.close()


def dataset_profile(df: pd.DataFrame) -> dict:
    """Aggregates consumed by the analytics dashboard."""
    bins = [28, 40, 50, 60, 70, 80]
    labels = ["29-39", "40-49", "50-59", "60-69", "70+"]
    age_band = pd.cut(df["age"], bins=bins, labels=labels, right=False)

    def rate(group: pd.Series) -> list[dict]:
        out = []
        for key, sub in df.groupby(group, observed=True):
            out.append(
                {
                    "key": str(key),
                    "total": int(len(sub)),
                    "positive": int(sub[TARGET].sum()),
                    "rate": round(float(sub[TARGET].mean()), 4),
                }
            )
        return out

    corr = df.corr(numeric_only=True)[TARGET].drop(TARGET)
    return {
        "rows": int(len(df)),
        "columns": list(df.columns),
        "missing": {k: int(v) for k, v in df.isna().sum().items()},
        "classBalance": {
            "negative": int((df[TARGET] == 0).sum()),
            "positive": int((df[TARGET] == 1).sum()),
        },
        "summary": {
            col: {
                "mean": round(float(df[col].mean()), 3),
                "std": round(float(df[col].std()), 3),
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "median": float(df[col].median()),
            }
            for col in NUMERIC
        },
        "byAgeBand": rate(age_band),
        "bySex": rate(df["sex"].map({0: "Female", 1: "Male"})),
        "byChestPain": rate(
            df["cp"].map(
                {0: "Typical angina", 1: "Atypical", 2: "Non-anginal", 3: "Asymptomatic"}
            )
        ),
        "byVessels": rate(df["ca"].map(lambda v: f"{v} vessels")),
        "byThal": rate(
            df["thal"].map({1: "Normal", 2: "Fixed defect", 3: "Reversible defect"})
        ),
        "byExang": rate(df["exang"].map({0: "No", 1: "Yes"})),
        "targetCorrelation": [
            {"feature": k, "correlation": round(float(v), 4)}
            for k, v in corr.sort_values(key=abs, ascending=False).items()
        ],
        "scatterAgeThalach": [
            {
                "age": int(r.age),
                "thalach": int(r.thalach),
                "chol": int(r.chol),
                "target": int(getattr(r, TARGET)),
            }
            for r in df.itertuples()
        ],
    }


def main() -> None:
    os.makedirs(ART, exist_ok=True)
    df = pd.read_csv(CSV)
    inspect(df)
    eda_figures(df)

    X, feature_names = encode(df)
    y = df[TARGET].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    scaler = StandardScaler().fit(X_train[NUMERIC])

    def scale(frame: pd.DataFrame) -> np.ndarray:
        out = frame.copy()
        out[NUMERIC] = scaler.transform(out[NUMERIC])
        return out.to_numpy()

    Xtr, Xte = scale(X_train), scale(X_test)

    candidates = {
        "Logistic Regression": LogisticRegression(max_iter=2000, C=1.0),
        "Random Forest": RandomForestClassifier(
            n_estimators=400, max_depth=6, random_state=RANDOM_STATE
        ),
        "Gradient Boosting": GradientBoostingClassifier(random_state=RANDOM_STATE),
    }

    comparison = []
    fitted = {}
    for name, model in candidates.items():
        model.fit(Xtr, y_train)
        fitted[name] = model
        proba = model.predict_proba(Xte)[:, 1]
        pred = (proba >= 0.5).astype(int)
        cv = cross_val_score(model, Xtr, y_train, cv=5, scoring="roc_auc")
        comparison.append(
            {
                "name": name,
                "accuracy": round(float(accuracy_score(y_test, pred)), 4),
                "precision": round(float(precision_score(y_test, pred)), 4),
                "recall": round(float(recall_score(y_test, pred)), 4),
                "f1": round(float(f1_score(y_test, pred)), 4),
                "rocAuc": round(float(roc_auc_score(y_test, proba)), 4),
                "cvRocAucMean": round(float(cv.mean()), 4),
                "cvRocAucStd": round(float(cv.std()), 4),
            }
        )
        print(name, "\n", classification_report(y_test, pred))

    # Deployed model: logistic regression (fully portable as coefficients).
    deployed_name = "Logistic Regression"
    deployed = fitted[deployed_name]
    proba = deployed.predict_proba(Xte)[:, 1]
    pred = (proba >= 0.5).astype(int)
    cm = confusion_matrix(y_test, pred)
    fpr, tpr, _ = roc_curve(y_test, proba)

    rf = fitted["Random Forest"]
    importances = sorted(
        (
            {"feature": f, "importance": round(float(i), 5)}
            for f, i in zip(feature_names, rf.feature_importances_)
        ),
        key=lambda d: -d["importance"],
    )

    model_card = {
        "deployedModel": deployed_name,
        "trainedAt": pd.Timestamp.utcnow().strftime("%Y-%m-%d"),
        "randomState": RANDOM_STATE,
        "trainRows": int(len(X_train)),
        "testRows": int(len(X_test)),
        "featureNames": feature_names,
        "numericFeatures": NUMERIC,
        "scaler": {
            "mean": {c: float(m) for c, m in zip(NUMERIC, scaler.mean_)},
            "scale": {c: float(s) for c, s in zip(NUMERIC, scaler.scale_)},
        },
        "coefficients": {
            f: round(float(c), 6) for f, c in zip(feature_names, deployed.coef_[0])
        },
        "intercept": round(float(deployed.intercept_[0]), 6),
        "metrics": next(m for m in comparison if m["name"] == deployed_name),
        "comparison": comparison,
        "confusionMatrix": {
            "trueNegative": int(cm[0][0]),
            "falsePositive": int(cm[0][1]),
            "falseNegative": int(cm[1][0]),
            "truePositive": int(cm[1][1]),
        },
        "rocCurve": [
            {"fpr": round(float(a), 4), "tpr": round(float(b), 4)}
            for a, b in zip(fpr, tpr)
        ],
        "featureImportance": importances,
    }

    joblib.dump(
        {"model": deployed, "scaler": scaler, "features": feature_names},
        os.path.join(ART, "heart_model.joblib"),
    )
    with open(os.path.join(ART, "model_card.json"), "w") as fh:
        json.dump(model_card, fh, indent=2)
    with open(os.path.join(ART, "dataset_profile.json"), "w") as fh:
        json.dump(dataset_profile(df), fh, indent=2)
    print("artifacts written to", ART)


if __name__ == "__main__":
    main()
