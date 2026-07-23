# Mean Squared Error (MSE)

The Mean Squared Error measures the average of the squares of the errors — the average squared difference between the estimated values and the actual value.

## Formula

For $n$ data points:

$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2
$$

Where:
- $n$ = number of data points
- $y_i$ = actual / observed value for the $i$-th data point
- $\hat{y}_i$ = predicted / estimated value for the $i$-th data point
- $(y_i - \hat{y}_i)$ = residual / error

## Alternative Forms

**Vector form:**
$$
\text{MSE} = \frac{1}{n} \| \mathbf{y} - \mathbf{\hat{y}} \|_2^2
$$

**For a regression model with parameters $\theta$:**
$$
\text{MSE}(\theta) = \frac{1}{n} \sum_{i=1}^{n} (y_i - f(x_i; \theta))^2
$$

**Root Mean Squared Error (RMSE) relationship:**
$$
\text{RMSE} = \sqrt{\text{MSE}}
$$

## Properties

- $\text{MSE} \ge 0$
- Lower MSE indicates better fit
- Sensitive to outliers due to squaring
- Units are squared units of $y$

## Example

If $y = [1, 2, 3]$ and $\hat{y} = [1.1, 1.9, 3.2]$:

$$
\text{MSE} = \frac{(1-1.1)^2 + (2-1.9)^2 + (3-3.2)^2}{3} = \frac{0.01 + 0.01 + 0.04}{3} = 0.02
$$
