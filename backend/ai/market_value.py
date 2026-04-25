"""
ml_engine.py
Random Forest price forecasting trained on mock historical data.
Predicts modal price for next 1–3 days given a market + commodity.
"""
import math
import random
from typing import List, Dict, Tuple
from datetime import date, timedelta


def _feature_vector(price_series: List[float], arrivals_series: List[int], day_index: int) -> List[float]:
    """
    Build a feature vector for a given day index in the series.
    Features: lag1, lag2, lag3, lag7, rolling_mean_3, rolling_mean_7,
              arrivals_lag1, day_of_week, month
    """
    i = day_index
    lag1 = price_series[i - 1] if i >= 1 else price_series[0]
    lag2 = price_series[i - 2] if i >= 2 else price_series[0]
    lag3 = price_series[i - 3] if i >= 3 else price_series[0]
    lag7 = price_series[i - 7] if i >= 7 else price_series[0]
    rm3  = sum(price_series[max(0, i-3):i]) / min(3, i) if i > 0 else price_series[0]
    rm7  = sum(price_series[max(0, i-7):i]) / min(7, i) if i > 0 else price_series[0]
    arr1 = arrivals_series[i - 1] if i >= 1 else arrivals_series[0]
    # Encode day-of-week and month from start_date + i offset (simplified)
    dow  = i % 7
    month = 4   # fixed for mock; real impl uses actual dates
    return [lag1, lag2, lag3, lag7, rm3, rm7, arr1, dow, month]


class SimpleRandomForest:
    """
    Lightweight hand-rolled random forest (no sklearn dependency required for demo).
    Each tree is a noisy linear combination of features — approximates RF behaviour.
    Replace with sklearn.ensemble.RandomForestRegressor for production.
    """

    def __init__(self, n_trees: int = 30, noise_scale: float = 0.015):
        self.n_trees = n_trees
        self.noise_scale = noise_scale
        self.trees: List[List[float]] = []
        self._fitted = False

    def fit(self, X: List[List[float]], y: List[float]):
        """Bootstrap-aggregate n_trees linear models."""
        n = len(X)
        n_features = len(X[0])
        self.trees = []
        for _ in range(self.n_trees):
            # Bootstrap sample
            idx = [random.randint(0, n - 1) for _ in range(n)]
            Xb = [X[i] for i in idx]
            yb = [y[i] for i in idx]
            # Least-squares weights via normal equations (simplified ridge)
            weights = self._ridge_fit(Xb, yb, n_features)
            self.trees.append(weights)
        self._fitted = True

    def predict(self, x: List[float]) -> float:
        if not self._fitted:
            raise RuntimeError("Model not fitted")
        preds = [sum(w * v for w, v in zip(tree, x)) for tree in self.trees]
        return sum(preds) / len(preds)

    @staticmethod
    def _ridge_fit(X, y, n_features, alpha: float = 1.0) -> List[float]:
        """Analytical ridge regression: w = (X^T X + αI)^{-1} X^T y."""
        # Compute X^T X
        XtX = [[sum(X[r][i] * X[r][j] for r in range(len(X))) for j in range(n_features)]
                for i in range(n_features)]
        for i in range(n_features):
            XtX[i][i] += alpha
        Xty = [sum(X[r][i] * y[r] for r in range(len(X))) for i in range(n_features)]
        # Solve via Gaussian elimination
        return _gauss_solve(XtX, Xty)


def _gauss_solve(A: List[List[float]], b: List[float]) -> List[float]:
    """Solve Ax = b via Gaussian elimination with partial pivoting."""
    n = len(b)
    M = [A[i][:] + [b[i]] for i in range(n)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[pivot] = M[pivot], M[col]
        if abs(M[col][col]) < 1e-12:
            continue
        for row in range(col + 1, n):
            factor = M[row][col] / M[col][col]
            for j in range(col, n + 1):
                M[row][j] -= factor * M[col][j]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = M[i][n]
        for j in range(i + 1, n):
            x[i] -= M[i][j] * x[j]
        if abs(M[i][i]) > 1e-12:
            x[i] /= M[i][i]
    return x


def train_and_predict(
    price_history: List[Dict],
    horizon_days: int = 3
) -> Dict:
    """
    Train model on price_history and return predictions + recommendation.

    Args:
        price_history: list of {date, modal_price, arrivals_qtl, ...}
        horizon_days: number of future days to forecast (1–3)

    Returns:
        {
          "predictions": [{"date": ..., "predicted_price": ..., "confidence_interval": [...]}],
          "recommendation": "sell" | "hold",
          "reason": str,
          "confidence_pct": float,
        }
    """
    if len(price_history) < 8:
        return _fallback_prediction(price_history, horizon_days)

    prices   = [d["modal_price"]    for d in price_history]
    arrivals = [d["arrivals_qtl"]   for d in price_history]

    # Build training set (day 7 onward so all lags are available)
    X, y = [], []
    for i in range(7, len(prices)):
        X.append(_feature_vector(prices, arrivals, i))
        y.append(prices[i])

    model = SimpleRandomForest(n_trees=50)
    model.fit(X, y)

    # Iterative multi-step forecast
    ext_prices   = prices[:]
    ext_arrivals = arrivals[:]
    last_date    = date.fromisoformat(price_history[-1]["date"])

    predictions = []
    for step in range(1, horizon_days + 1):
        idx = len(ext_prices)
        fv  = _feature_vector(ext_prices, ext_arrivals, idx)
        pred = model.predict(fv)
        # Simple confidence interval ±2% * sqrt(step)
        ci_half = pred * 0.02 * math.sqrt(step)
        future_date = last_date + timedelta(days=step)
        predictions.append({
            "date": future_date.isoformat(),
            "predicted_price": round(pred, 2),
            "confidence_interval": [round(pred - ci_half, 2), round(pred + ci_half, 2)],
        })
        # Append predicted price for next iteration
        ext_prices.append(pred)
        ext_arrivals.append(int(sum(arrivals[-3:]) / 3))   # rolling avg arrivals

    today_price = prices[-1]
    tomorrow_pred = predictions[0]["predicted_price"]
    pct_change = ((tomorrow_pred - today_price) / today_price) * 100

    if pct_change > 5:
        rec, reason = "hold", f"Price expected to rise {pct_change:+.1f}% tomorrow — hold for better returns."
    elif pct_change < -3:
        rec, reason = "sell", f"Price expected to drop {abs(pct_change):.1f}% tomorrow — sell today."
    else:
        rec, reason = "sell", f"Price movement minimal ({pct_change:+.1f}%) — selling today avoids storage risk."

    return {
        "predictions":      predictions,
        "recommendation":   rec,
        "reason":           reason,
        "pct_change_tomorrow": round(pct_change, 2),
        "confidence_pct":   round(max(60, 95 - abs(pct_change) * 2), 1),
        "today_price":      today_price,
    }


def _fallback_prediction(price_history, horizon_days):
    """Simple moving-average fallback when history is too short."""
    if not price_history:
        return {"error": "No price history available"}
    prices = [d["modal_price"] for d in price_history]
    ma = sum(prices) / len(prices)
    last_date = date.fromisoformat(price_history[-1]["date"])
    predictions = [
        {"date": (last_date + timedelta(days=i)).isoformat(),
         "predicted_price": round(ma, 2),
         "confidence_interval": [round(ma * 0.96, 2), round(ma * 1.04, 2)]}
        for i in range(1, horizon_days + 1)
    ]
    return {
        "predictions": predictions,
        "recommendation": "sell",
        "reason": "Insufficient history — selling today is the safer option.",
        "pct_change_tomorrow": 0.0,
        "confidence_pct": 55.0,
        "today_price": prices[-1],
    }