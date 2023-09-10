import { DOMParser, IElement } from "happy-dom";

// const TICKER = "GRWG";
// const url = `https://finance.yahoo.com/quote/${TICKER}`;

/**
 * Get the values from the summary table on the Yahoo Finance page
 * @param html - any node above the #quote-summary div
 */
export const getValuesFromSummaryTable = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const summary = doc.querySelector("div#quote-summary");

  // two tables: "left-summary-table" and "right-summary-table"
  const leftTable = summary?.querySelector(
    'div[data-test="left-summary-table"]',
  );
  const rightTable = summary?.querySelector(
    "div[data-test=right-summary-table]",
  );
  // each table has a tbody with trs
  // each tr has two tds: one for the label, one for the value
  // return an object with the label as the key and the value as the value

  const leftTableRows = leftTable?.querySelectorAll("tbody>tr");
  const leftTableValues = leftTableRows?.map((row) => {
    const label = row.querySelector("td:nth-child(1)")?.textContent;
    const value = row.querySelector("td:nth-child(2)")?.textContent;
    return { label, value };
  });
  const rightTableRows = rightTable?.querySelectorAll("tbody>tr");
  const rightTableValues = rightTableRows?.map((row) => {
    const label = row.querySelector("td:nth-child(1)")?.textContent;
    const value = row.querySelector("td:nth-child(2)")?.textContent;
    return { label, value };
  });
  // merge the two arrays of objects
  const merged = leftTableValues?.concat(rightTableValues || []);
  // build single object with label as key and value as value
  const obj = merged?.reduce(
    (acc, cur) => {
      // if the value is a number, convert it to a number
      if (cur.label && cur.value) {
        if (!isNaN(Number(cur.value))) {
          acc[cur.label] = Number(cur.value);
        } else {
          acc[cur.label] = cur.value;
        }
      }
      return acc;
    },
    {} as Record<string, string | number>,
  );

  return obj;
};

export const statisticsSelector = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const statistics = doc.querySelector('section[data-test="qsp-statistics"]');
  return statistics;
};
export const getValuesFromStatisticsTable = (html: string) => {
  // look for section with data-test="qsp-statistics"
  const statistics = statisticsSelector(html);
  if (!statistics) {
    throw new Error("No statistics section found");
  }
  // within statistics, there are three sections: Valuation Measures, Financial Highlights, Trading Information
  // within each section, there are tables. They can be located as silbings of the h2 element containing the section name
  // within the first, Valuation Measures, is a table with row AND column headers. The table is a grid of values.
  // const valuationMeasures = getValuationMeasures(statistics);

  // within the second and third, Financial Highlights and Trading Information, The tables are only two columns: label and value
  // const financialHighlights = getFinancialHighlights(statistics);
  // const tradingInformation = getTradingInformation(statistics);

  return {
    // valuationMeasures,
    // financialHighlights,
    // tradingInformation,
  };
};
