from pathlib import Path
from typing import Type, Optional
import pandas as pd
from backtesting import Backtest, Strategy
from config import RESULTS_DIR
from strategies import SmaCross, RsiStrategy, BreakoutAtrStrategy

def run_backtest(
    df: pd.DataFrame,
    strategy_cls: Type[Strategy] = SmaCross,
    cash: float = 100000.0,
    commission: float = 0.0005,  # 0.05% brokerage/slippage
    save_html_chart: bool = True,
    chart_name: str = "backtest_chart",
    print_stats: bool = True
) -> dict:
    """
    Run backtest on OHLCV DataFrame using Backtesting.py
    
    Parameters:
        df: DataFrame with DatetimeIndex and ['Open', 'High', 'Low', 'Close', 'Volume']
        strategy_cls: Strategy class from strategies.py
        cash: Starting account equity (e.g. INR 1,00,000)
        commission: Commission per trade as a fraction (0.0005 = 0.05%)
        save_html_chart: Whether to generate an interactive HTML bokeh chart
        chart_name: File prefix for saved chart
        print_stats: Print formatted statistics to console
        
    Returns:
        pd.Series of backtest statistics
    """
    if df.empty:
        raise ValueError("Cannot run backtest on empty DataFrame.")

    # Initialize Backtest engine
    bt = Backtest(
        df,
        strategy_cls,
        cash=cash,
        commission=commission,
        exclusive_orders=True
    )

    stats = bt.run()

    if print_stats:
        print("\n" + "=" * 55)
        print(f"       BACKTEST RESULTS: {strategy_cls.__name__}")
        print("=" * 55)
        key_metrics = [
            ("Start", stats.get("Start")),
            ("End", stats.get("End")),
            ("Duration", stats.get("Duration")),
            ("Initial Capital", f"Rs. {cash:,.2f}"),
            ("Equity Final", f"Rs. {stats.get('Equity Final [$]', 0):,.2f}"),
            ("Return [%]", f"{stats.get('Return [%]', 0):.2f}%"),
            ("Buy & Hold Return [%]", f"{stats.get('Buy & Hold Return [%]', 0):.2f}%"),
            ("CAGR [%]", f"{stats.get('Return (Ann.) [%]', 0):.2f}%"),
            ("Volatility (Ann.) [%]", f"{stats.get('Volatility (Ann.) [%]', 0):.2f}%"),
            ("Sharpe Ratio", f"{stats.get('Sharpe Ratio', 0):.2f}"),
            ("Sortino Ratio", f"{stats.get('Sortino Ratio', 0):.2f}"),
            ("Max Drawdown [%]", f"{stats.get('Max. Drawdown [%]', 0):.2f}%"),
            ("Max Drawdown Duration", stats.get("Max. Drawdown Duration")),
            ("# Trades", stats.get("# Trades")),
            ("Win Rate [%]", f"{stats.get('Win Rate [%]', 0):.2f}%"),
            ("Profit Factor", f"{stats.get('Profit Factor', 0):.2f}"),
            ("Expectancy [%]", f"{stats.get('Expectancy [%]', 0):.2f}%"),
            ("Avg Trade [%]", f"{stats.get('Avg. Trade [%]', 0):.2f}%"),
        ]

        for label, val in key_metrics:
            print(f"  {label:<26} : {val}")
        print("=" * 55)

    # Save trade log if trades were placed
    trades = stats.get("_trades")
    if trades is not None and not trades.empty:
        trades_file = RESULTS_DIR / f"{chart_name}_trades.csv"
        trades.to_csv(trades_file, index=False)
        print(f"[+] Trades log saved to: {trades_file}")

    # Generate interactive HTML plot
    if save_html_chart:
        html_file = RESULTS_DIR / f"{chart_name}.html"
        try:
            bt.plot(filename=str(html_file), open_browser=False)
            print(f"[+] Interactive chart saved to: {html_file}")
        except Exception as e:
            print(f"[-] Note: Chart generation skipped ({e})")

    return stats

def optimize_sma_strategy(df: pd.DataFrame, cash: float = 100000.0) -> dict:
    """
    Run parameter grid optimization for SMA Crossover Strategy.
    """
    print("\n[*] Running grid optimization on SMA parameters...")
    bt = Backtest(df, SmaCross, cash=cash, commission=0.0005, exclusive_orders=True)
    stats, heatmap = bt.optimize(
        fast_period=range(10, 31, 5),
        slow_period=range(40, 101, 10),
        constraint=lambda p: p.fast_period < p.slow_period,
        maximize="Return [%]",
        return_heatmap=True
    )
    print("\n[+] Optimization Completed!")
    print(f"    Optimal Fast SMA : {stats._strategy.fast_period}")
    print(f"    Optimal Slow SMA : {stats._strategy.slow_period}")
    print(f"    Optimal Return   : {stats['Return [%]']:.2f}%")
    return stats

if __name__ == "__main__":
    from fyers_data import generate_sample_data, load_data_for_backtest
    from config import DATA_DIR

    sample_csv = DATA_DIR / "NSE_NIFTY50_INDEX_D_sample.csv"
    if not sample_csv.exists():
        generate_sample_data()

    df = load_data_for_backtest(sample_csv)
    run_backtest(df, strategy_cls=SmaCross, chart_name="sample_sma_cross")
