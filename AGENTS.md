<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- The ML pipeline lives in `ml/` (Python, scikit-learn) and is the only place models are trained; it exports JSON artifacts so the app needs no Python at runtime.
- Trained-model artifacts consumed by the app live in `src/data/` (`model-card.json`, `dataset-profile.json`); regenerate them with `python ml/train_model.py`, never hand-edit.
- Risk scoring in the app is implemented in `src/lib/heart-model.ts` by replaying the exported logistic-regression coefficients, so predictions stay identical to sklearn's `predict_proba`.
- Prediction history is browser-local (`src/lib/prediction-history.ts`, localStorage) — no database, so the app deploys statically.
- All colors/typography come from semantic tokens in `src/styles.css`; components must not hardcode color utilities.
