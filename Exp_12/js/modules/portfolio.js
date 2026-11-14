/**
 * ============================================================================
 * Experiment 12 - Portfolio & Trade Simulator Module (portfolio.js)
 * Covers: Real-time asset valuation, P&L calculations, paper trade execution,
 *         and state coordination with StorageService.
 * ============================================================================
 */

const PortfolioService = (function () {
  'use strict';

  /**
   * Calculate comprehensive valuation metrics using latest market prices
   */
  function calculateValuation(marketAssets) {
    const portfolio = StorageService.getPortfolio();
    const assetMap = {};
    marketAssets.forEach(a => {
      assetMap[a.id] = a;
    });

    let totalHoldingsValue = 0;
    let totalCostBasis = 0;
    const enrichedHoldings = [];

    for (const [assetId, position] of Object.entries(portfolio.holdings)) {
      if (position.quantity <= 0) continue;

      const currentAsset = assetMap[assetId];
      const currentPrice = currentAsset ? currentAsset.priceUsd : position.avgPrice;
      const currentValue = position.quantity * currentPrice;
      const costBasis = position.totalCost || (position.quantity * position.avgPrice);
      const unrealizedPnL = currentValue - costBasis;
      const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

      totalHoldingsValue += currentValue;
      totalCostBasis += costBasis;

      enrichedHoldings.push({
        id: assetId,
        name: currentAsset ? currentAsset.name : assetId,
        symbol: currentAsset ? currentAsset.symbol : assetId.toUpperCase(),
        quantity: position.quantity,
        avgPrice: position.avgPrice,
        currentPrice: currentPrice,
        currentValue: currentValue,
        costBasis: costBasis,
        unrealizedPnL: unrealizedPnL,
        unrealizedPnLPercent: unrealizedPnLPercent,
        change24h: currentAsset ? currentAsset.changePercent24Hr : 0
      });
    }

    const netWorth = portfolio.cashBalance + totalHoldingsValue;
    const totalProfitLoss = netWorth - portfolio.initialCapital;
    const totalProfitLossPercent = portfolio.initialCapital > 0
      ? (totalProfitLoss / portfolio.initialCapital) * 100
      : 0;

    return {
      cashBalance: portfolio.cashBalance,
      initialCapital: portfolio.initialCapital,
      totalHoldingsValue,
      totalCostBasis,
      netWorth,
      totalProfitLoss,
      totalProfitLossPercent,
      holdings: enrichedHoldings
    };
  }

  /**
   * Execute BUY order
   */
  function executeBuy(assetId, symbol, quantity, price) {
    if (quantity <= 0 || price <= 0) {
      return { success: false, message: 'Quantity and price must be greater than zero.' };
    }

    const totalCost = quantity * price;
    const portfolio = StorageService.getPortfolio();

    if (totalCost > portfolio.cashBalance) {
      return {
        success: false,
        message: `Insufficient cash balance ($${portfolio.cashBalance.toFixed(2)}). Order requires $${totalCost.toFixed(2)}.`
      };
    }

    // Deduct cash
    portfolio.cashBalance -= totalCost;

    // Update holdings
    if (!portfolio.holdings[assetId]) {
      portfolio.holdings[assetId] = {
        quantity: 0,
        totalCost: 0,
        avgPrice: 0
      };
    }

    const currentPos = portfolio.holdings[assetId];
    const newQuantity = currentPos.quantity + quantity;
    const newTotalCost = currentPos.totalCost + totalCost;
    const newAvgPrice = newTotalCost / newQuantity;

    portfolio.holdings[assetId] = {
      quantity: parseFloat(newQuantity.toFixed(6)),
      totalCost: parseFloat(newTotalCost.toFixed(2)),
      avgPrice: parseFloat(newAvgPrice.toFixed(2))
    };

    StorageService.savePortfolio(portfolio);

    // Record transaction
    const tx = StorageService.addTransaction({
      type: 'BUY',
      assetId,
      symbol,
      quantity,
      price,
      total: totalCost
    });

    StorageService.incrementSessionMetric('tradesExecuted');

    return {
      success: true,
      message: `Bought ${quantity} ${symbol} at $${price.toLocaleString()} (Total: $${totalCost.toFixed(2)})`,
      transaction: tx,
      portfolio
    };
  }

  /**
   * Execute SELL order
   */
  function executeSell(assetId, symbol, quantity, price) {
    if (quantity <= 0 || price <= 0) {
      return { success: false, message: 'Quantity and price must be greater than zero.' };
    }

    const portfolio = StorageService.getPortfolio();
    const currentPos = portfolio.holdings[assetId];

    if (!currentPos || currentPos.quantity < quantity) {
      const owned = currentPos ? currentPos.quantity : 0;
      return {
        success: false,
        message: `Insufficient asset holdings. You own ${owned} ${symbol}, cannot sell ${quantity}.`
      };
    }

    const proceeds = quantity * price;
    const costForShares = (currentPos.totalCost / currentPos.quantity) * quantity;
    const realizedPnL = proceeds - costForShares;

    // Credit cash
    portfolio.cashBalance += proceeds;

    // Update holding
    const remainingQty = currentPos.quantity - quantity;
    if (remainingQty <= 0.000001) {
      delete portfolio.holdings[assetId];
    } else {
      portfolio.holdings[assetId] = {
        quantity: parseFloat(remainingQty.toFixed(6)),
        totalCost: parseFloat((currentPos.totalCost - costForShares).toFixed(2)),
        avgPrice: currentPos.avgPrice
      };
    }

    StorageService.savePortfolio(portfolio);

    // Record transaction
    const tx = StorageService.addTransaction({
      type: 'SELL',
      assetId,
      symbol,
      quantity,
      price,
      total: proceeds,
      realizedPnL: parseFloat(realizedPnL.toFixed(2))
    });

    StorageService.incrementSessionMetric('tradesExecuted');

    return {
      success: true,
      message: `Sold ${quantity} ${symbol} at $${price.toLocaleString()} for $${proceeds.toFixed(2)} (P&L: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)})`,
      transaction: tx,
      portfolio
    };
  }

  return {
    calculateValuation,
    executeBuy,
    executeSell
  };
})();
