import { describe, expect, test } from "bun:test";
import axios from "axios";
import { fetcher } from "./fetcher.ts";
import { DOMParser } from "happy-dom";
import MockAdapter from "axios-mock-adapter";
import {
  getFinancialAndTradingInfo,
  getTickerData,
  getValuationMeasures,
  getValuesFromStatisticsTable,
  getValuesFromSummaryTable,
  statisticsSelector,
  tickerStatsUrl,
  tickerUrl,
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
  const mock = new MockAdapter(axios);

  const mockAxios = async (url: string) => {
    const test_data = await goog_test_html();
    mock.onGet(url).reply(200, test_data);
  };

  test("loads goog test data", async () => {
    // arrange
    const url = "https://example.com";
    await mockAxios(url);

    // act
    const res = await fetcher(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(res.data, "text/html");
    const summary = doc.querySelector("div#quote-summary");

    // assert
    expect(summary).not.toBeNull();
    // expect summary to contain Google
    expect(summary?.textContent).toContain("Google");

    // restore
    mock.reset();
  });
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
      expect(values.length).toBe(6);
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

  test("gets all values", async () => {
    // arrange
    const ticker = "grwg";
    // mock axios to return test data for each url
    const urls = {
      summary: tickerUrl(ticker),
      stats: tickerStatsUrl(ticker),
    };

    const mock = new MockAdapter(axios);
    const summary_data = await goog_test_html();
    const stats_data = await goog_stats_html();

    mock.onGet(urls.summary).reply(200, summary_data);
    mock.onGet(urls.stats).reply(200, stats_data);

    // act
    const data = await getTickerData(ticker);

    // assert
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("stats");

    if (!data.summary || !data.stats) {
      throw new Error("summary or stats is null");
    }

    // expect summary to have several properties, including "Previous Close", "Ask" EPS (TTM)" and "Market Cap"
    expect(data.summary).toHaveProperty("Previous Close");
    expect(data.summary["Previous Close"]).toBe(136.2);
    expect(data.summary).toHaveProperty("Ask");
    expect(data.summary["Ask"]).toBe("137.57 x 800");
    expect(data.summary).toHaveProperty("EPS (TTM)");
    expect(data.summary).toHaveProperty("Market Cap");

    // expect stats to have several properties, including "Fiscal Year Ends", "Most Recent Quarter (mrq)", "Profit Margin"
    expect(data.stats).toHaveProperty("Fiscal Year Ends");
    expect(data.stats).toHaveProperty("Most Recent Quarter (mrq)");
    expect(data.stats).toHaveProperty("Profit Margin");

    // restore
    mock.reset();
  });
});
