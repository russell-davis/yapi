import { describe, expect, test } from "bun:test";
import {
  getFinancialAndTradingInfo,
  getValuationMeasures,
  getValuesFromStatisticsTable,
  getValuesFromSummaryTable,
  statisticsSelector,
} from "./utils.ts";

export const goog_test_data = () => {
  const TEST_HTML = Bun.file("src/goog.test.html");
  return TEST_HTML;
};
export const goog_stats_data = () => {
  const TEST_HTML = Bun.file("src/goog.stats.test.html");
  return TEST_HTML;
};
export const goog_test_html = async () => {
  const TEST_HTML = goog_test_data();
  return TEST_HTML.text();
};
export const goog_stats_html = async () => {
  const TEST_HTML = goog_stats_data();
  return TEST_HTML.text();
};

describe("ticker tests", async () => {
  test("returns an object of summary properties", async () => {
    // arrange
    const html = await goog_test_html();

    // act
    const values = getValuesFromSummaryTable(html);

    // assert;
    expect(values).toHaveProperty("Previous Close");
  });

  describe("finds statistics", () => {
    test("gets valuation measures", async () => {
      // arrange
      const html = await goog_stats_html();
      const statistics = statisticsSelector(html);
      if (!statistics) {
        throw new Error("statistics is null");
      }

      // act
      const values = getValuationMeasures(statistics);

      // assert;
      expect(values).not.toBeNull();
      expect(values?.length).toBe(6);
    });
    test("statistics section exists", async () => {
      // arrange
      const html = await goog_stats_html();

      // act
      const statistics = statisticsSelector(html);

      // assert
      expect(statistics).not.toBeNull();
    });
    test("returns statistics values", async () => {
      // arrange
      const html = await goog_stats_html();
      const statistics = statisticsSelector(html);
      if (!statistics) {
        throw new Error("statistics is null");
      }

      // act
      const values = getFinancialAndTradingInfo(statistics);

      // assert
      expect(values).toHaveProperty("Fiscal Year Ends");
    });
    test("gets all stats", async () => {
      const html = await goog_stats_html();
      const statistics = getValuesFromStatisticsTable(html);
      expect(statistics).toHaveProperty("Fiscal Year Ends");
      expect(statistics).toHaveProperty("Most Recent Quarter (mrq)");
      expect(statistics).toHaveProperty("Profit Margin");
    });
  });
});
