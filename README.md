# Smart Heart Disease Risk Prediction & Analytics

An end-to-end machine-learning project: a scikit-learn pipeline trained on the
UCI Cleveland heart disease dataset, plus a React/TanStack Start web app for
interactive risk scoring, dataset analytics and model evaluation.

## What's inside

| Surface      | Route        | Contents                                                                  |
| ------------ | ------------ | ------------------------------------------------------------------------- |
| Overview     | `/`          | Project summary, dataset stats, pipeline walkthrough                       |
| Prediction   | `/predict`   | 13-field clinical form, live probability, factor contributions, history    |
| Analytics    | `/analytics` | Disease rates by cohort, correlations, scatter, numeric summary            |
| Model        | `/model`     | ROC curve, confusion matrix, algorithm comparison, coefficients            |

## Machine learning pipeline

```
ml/
├── heart.csv              # 303 patient records, 13 features + target
├── requirements.txt
├── train_model.py         # profiling, EDA, training, evaluation, export
└── artifacts/
    ├── heart_model.joblib     # saved sklearn model + scaler
    ├── model_card.json        # metrics, coefficients, ROC, importances
    ├── dataset_profile.json   # EDA aggregates for the dashboard
    └── figures/*.png          # correlation heatmap, distributions
```

Run it:

```bash
pip install -r ml/requirements.txt
python ml/train_model.py
cp ml/artifacts/model_card.json src/data/model-card.json
cp ml/artifacts/dataset_profile.json src/data/dataset-profile.json
```

### Data

Source: UCI Machine Learning Repository, Heart Disease (Cleveland), 303 records.
Columns: `age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak,
slope, ca, thal, target`. Four missing `ca` and two missing `thal` values are
median-imputed. `cp` and `slope` are zero-indexed, `thal` is mapped to 1/2/3,
and the multi-class `num` severity column is binarised into `target`
(0 = no disease, 1 = disease). Class balance: 164 negative / 139 positive.

### Preprocessing & models

Numeric features are standardized; categoricals are drop-first one-hot encoded.
Three models are trained on a stratified 80/20 split and compared with 5-fold
cross-validated ROC AUC: logistic regression, random forest, gradient boosting.

### Deployed model

Logistic regression is the deployed model. Its standardization statistics and
coefficients are exported to `src/data/model-card.json`, and
`src/lib/heart-model.ts` reproduces `predict_proba` exactly in TypeScript — so
predictions run in the browser with no Python runtime and no network round-trip.
Random forest importances are shown on the model page for comparison.

## Web app

```bash
bun install
bun run dev      # http://localhost:8080
bun run build
```

Stack: React 19, TanStack Start/Router, TypeScript, Tailwind CSS v4, Recharts,
lucide-react, shadcn-style UI primitives.

Prediction history is stored in `localStorage` (no database, no account) and can
be exported to CSV. To persist history across devices later, swap
`src/lib/prediction-history.ts` for a server function backed by Postgres.

## Disclaimer

Educational project trained on 303 records from 1988. Not a medical device and
not a diagnosis.
