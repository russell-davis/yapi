import { describe, expect, test } from "bun:test";
import axios from "axios";
import { fetcher } from "./fetcher.ts";
import { DOMParser } from "happy-dom";
import MockAdapter from "axios-mock-adapter";
import { getValuesFromSummaryTable, statisticsSelector } from "./main.ts";

export const goog_test_data = () => {
  const TEST_HTML = Bun.file("src/goog.test.html");
  return TEST_HTML;
};
export const goog_test_html = async () => {
  const TEST_HTML = goog_test_data();
  return TEST_HTML.text();
};

describe("ticker tests", async () => {
  test("loads goog test html", async () => {
    const file = await goog_test_data();
    const html = await file.text();
    expect(html).toContain("quote-summary");
  });

  const mockAxios = async (url: string) => {
    const mock = new MockAdapter(axios);
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
  });

  describe("finds values in summary tables", () => {
    test("returns an object of summary properties", async () => {
      // arrange
      const html = await goog_test_html();

      // act
      const values = getValuesFromSummaryTable(html);

      // assert;
      expect(values).toHaveProperty("Previous Close");
    });
  });

  describe("finds statistics", () => {
    test("returns an object of financial highlights", async () => {
      // arrange
      const html = await goog_test_html();

      // act
      const statistics = statisticsSelector(html);
      // const values = getFinancialHighlights(statistics);

      // assert
      // expect(values).toHaveProperty("financialHighlights");
      expect(statistics).not.toBeNull();
    });
  });
});
