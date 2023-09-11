import { DOMParser, IElement } from "happy-dom";
import { fetcher } from "./fetcher.ts";

export const tickerUrl = (ticker: string) => {
  return `https://finance.yahoo.com/quote/${ticker}`;
};
export const tickerStatsUrl = (ticker: string) => {
  return `${tickerUrl(ticker)}/key-statistics?p=${ticker}`;
};

export const getTickerData = async (ticker: string) => {
  const summaryUrl = `https://finance.yahoo.com/quote/${ticker}`;
  const statsUrl = `https://finance.yahoo.com/quote/${ticker}/key-statistics?p=${ticker}`;

  const opts = {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,ml;q=0.7",
      "cache-control": "max-age=0",
      dnt: "1",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36",
    },
  };

  const summaryHtmlReq = await fetcher(summaryUrl, opts);
  const summaryHtml = summaryHtmlReq.data;
  const statsHtmlReq = await fetcher(statsUrl, opts);
  const statsHtml = statsHtmlReq.data;

  const summaryValues = getValuesFromSummaryTable(summaryHtml);
  const statsValues = getValuesFromStatisticsTable(statsHtml);

  return {
    summary: summaryValues,
    stats: statsValues,
  };
};

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

/**
 * Get the values from the statistics table on the Yahoo Finance page
 * @param html
 */
export const statisticsSelector = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const statistics = doc.querySelector('section[data-test="qsp-statistics"]');
  return statistics;
};
/**
 * Get the values from the statistics table on the Yahoo Finance page
 * @param html
 */
export const getValuesFromStatisticsTable = (html: string) => {
  // look for section with data-test="qsp-statistics"
  const statistics = statisticsSelector(html);
  if (!statistics) {
    throw new Error("No statistics section found");
  }
  // within statistics, there are three sections: Valuation Measures, Financial Highlights, Trading Information
  // within each section, there are tables. They can be located as silbings of the h2 element containing the section name
  // within the first, Valuation Measures, is a table with row AND column headers. The table is a grid of values.
  const valuationMeasures = getValuationMeasures(statistics);

  // within the second and third, Financial Highlights and Trading Information, The tables are only two columns: label and value
  const financialAndTradingHighlights = getFinancialAndTradingInfo(statistics);

  return {
    ...financialAndTradingHighlights,
    ...valuationMeasures,
  };
};

export const getValuationMeasures = (statistics: IElement) => {
  // format of table: thead is the dates going across the top, the first td in each tr is the label, the rest are values
  // the format of the returned object should be:
  /**
   * [{
   *     quarter: 'current' | m/dd/yyyy,
   *     Market Cap (intraday): number,
   *     Enterprise Value: number,
   *     ... etc
   * }]
   */
  // find an h2 with the text "Valuation Measures"
  const valuationMeasuresH2 = statistics.querySelector(
    'h2:contains("Valuation Measures")',
  );
  if (!valuationMeasuresH2) {
    throw new Error("No Valuation Measures section found");
  }

  // check each sibling of the h2 until you find a table
  let valuationMeasuresTable: IElement | null = null;
  let sibling = valuationMeasuresH2.nextElementSibling;
  while (sibling) {
    // check if the sibling or any of its children are a table
    const table = sibling.querySelector("table");
    if (table) {
      valuationMeasuresTable = table;
      break;
    }
    sibling = sibling.nextElementSibling;
  }

  if (!valuationMeasuresTable) {
    throw new Error("No Valuation Measures table found");
  }

  // header has on tr and the th are the dates. first col is empty, then the dates.
  const headers = valuationMeasuresTable.querySelectorAll("thead>tr>th");

  // filter the headers to only 'current' or date string (m/dd/yyyy)
  const dates = Array.from(headers)
    .map((header) => header.textContent)
    .filter(
      (text) =>
        text.includes("Current") || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text),
    )
    .map((text) => {
      // if the text is 'Current', return 'current'
      if (text.includes("Current")) {
        return "Current";
      }
      return text;
    });

  // console.info({ dates });

  let measuresByDate: Record<string, any>[] = dates.map((date) => {
    return {
      quarter: date,
    };
  });

  // get the rows
  const rows = valuationMeasuresTable.querySelectorAll("tbody>tr");

  // get the values from each row
  for (const row of rows) {
    // the first column is the label, the rest are the values for each quarter in descending order from 'current' to oldest
    const label = row.querySelector("td:nth-child(1)")?.textContent;
    if (!label) {
      throw new Error("No label found");
    }
    const values = Array.from(row.querySelectorAll("td")).slice(1);
    // console.info({ label, values: values.map((value) => value.textContent) });

    // loop through the measuresByDate and add the value to the correct quarter
    for (const [index, value] of values.entries()) {
      // console.info({ value: value.textContent, date: dates[index] });
      measuresByDate[index][label] = value.textContent;
    }
  }

  return measuresByDate;
};

export const getFinancialAndTradingInfo = (statistics: IElement) => {
  // format of table: h2 next to a div with several divs containing h3s and tables
  // within the second, Financial Highlights, The table is only two columns: label and value
  // there will be several tables, each

  // find divs with empty classes that have an h3 and a table in them
  const financialAndTradingHighlights =
    statistics.querySelectorAll('div[class=""]');
  // make sure they have an h3 and a table
  const financialAndTradingHighlightsWithH3AndTable =
    financialAndTradingHighlights.filter((div) => {
      const h3 = div.querySelector("h3");
      const table = div.querySelector("table");
      return h3 && table;
    });

  let financialAndTradingHighlightsValues: Record<string, string | number> = {};

  financialAndTradingHighlightsWithH3AndTable.forEach((div) => {
    const h3 = div.querySelector("h3");
    const table = div.querySelector("table");
    const rows = table?.querySelectorAll("tbody>tr");
    const values = rows?.map((row) => {
      const label = row.querySelector("td:nth-child(1)")?.textContent;
      const value = row.querySelector("td:nth-child(2)")?.textContent;
      return { label, value };
    });
    const obj = values?.reduce(
      (acc, cur) => {
        // if the value is a number, convert it to a number
        if (cur.label && cur.value) {
          if (!isNaN(Number(cur.value))) {
            acc[cur.label.trim()] = Number(cur.value.trim());
          } else {
            acc[cur.label.trim()] = cur.value.trim();
          }
        }
        return acc;
      },
      {} as Record<string, string | number>,
    );
    financialAndTradingHighlightsValues = {
      ...financialAndTradingHighlightsValues,
      ...obj,
    };
  });

  return financialAndTradingHighlightsValues;
};
