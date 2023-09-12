import { Cheerio, Element, load } from "cheerio";
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
      "User-Agent": "PostmanRuntime/7.32.3",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    },
  };

  const summaryHtml = await fetcher(summaryUrl, opts);
  const statsHtml = await fetcher(statsUrl, opts);

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
  if (!html) {
    throw new Error("No html provided");
  }
  if (!html.includes("quote-summary")) {
    throw new Error("No summary found");
  }

  const $ = load(html);

  const summary = $("div#quote-summary");
  if (!summary) {
    throw new Error("No summary found");
  }

  // two tables: "left-summary-table" and "right-summary-table"
  const leftTable = summary.find('div[data-test="left-summary-table"]');
  const rightTable = summary.find("div[data-test=right-summary-table]");

  // each table has a tbody with trs
  // each tr has two tds: one for the label, one for the value
  // return an object with the label as the key and the value as the value

  const leftTableRows = leftTable.find("tbody").children("tr");
  const leftTableValues = leftTableRows?.get().map((row) => {
    const r = $(row);
    const label = r.find("td:nth-child(1)")?.text();
    const value = r.find("td:nth-child(2)")?.text();
    return { label, value };
  });
  const rightTableRows = rightTable.find("tbody").children("tr");
  const rightTableValues = rightTableRows.get().map((row) => {
    const r = $(row);
    const label = r.find("td:nth-child(1)")?.text();
    const value = r.find("td:nth-child(2)")?.text();
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
  const $ = load(html);
  const statistics = $('section[data-test="qsp-statistics"]');
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

export const getValuationMeasures = (statistics: Cheerio<Element>) => {
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

  const html = statistics.html();
  if (!html) return;
  const $ = load(html);

  // find an h2 with the text "Valuation Measures"
  const valuationMeasuresH2 = statistics.find(
    'h2:contains("Valuation Measures")',
  );
  if (!valuationMeasuresH2) {
    throw new Error("No Valuation Measures section found");
  }

  // check each sibling of the h2 until you find a table
  let valuationMeasuresTable = valuationMeasuresH2.siblings().has("table");

  if (!valuationMeasuresTable) {
    throw new Error("No Valuation Measures table found");
  }

  // header has on tr and the th are the dates. first col is empty, then the dates.
  const headers = valuationMeasuresTable.find("thead>tr").children("th");

  // filter the headers to only 'current' or date string (m/dd/yyyy)
  const dates = headers
    .get()
    .map((header) => $(header).text())
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

  //  console.info({ dates });

  let measuresByDate: Record<string, any>[] = dates.map((date) => {
    return {
      quarter: date,
    };
  });

  // get the rows
  const rows = valuationMeasuresTable.find("tbody").children("tr");

  // get the values from each row
  for (const row of rows) {
    // the first column is the label, the rest are the values for each quarter in descending order from 'current' to oldest
    const label = $(row).find("td:nth-child(1)")?.text();
    if (!label) {
      throw new Error("No label found");
    }
    const values = Array.from($(row).children("td")).slice(1);
    //    console.info({ label, values: values.map((value) => $(value).text()) });

    // loop through the measuresByDate and add the value to the correct quarter
    for (const [index, value] of values.entries()) {
      //      console.info({ value: $(value).text(), date: dates[index] });
      measuresByDate[index][label] = $(value).text();
    }
  }

  //  console.info({
  //    measuresByDate,
  //  });

  return measuresByDate;
};

export const getFinancialAndTradingInfo = (statistics: Cheerio<Element>) => {
  // format of table: h2 next to a div with several divs containing h3s and tables
  // within the second, Financial Highlights, The table is only two columns: label and value
  // there will be several tables, each
  const html = statistics.html();
  if (!html) return;
  const $ = load(html);

  const sections = statistics
    .find('div[class=""]:has(> h3, > table)')
    .get()
    .map((el, i) => {
      const div = $(el);
      const h3 = div.find("h3").text().trim();
      const table = div.find("table");
      const rows = table?.find("tbody>tr").get();
      const values = rows?.map((row) => {
        const label = $(row).find("td:nth-child(1)")?.text().trim();
        const value = $(row).find("td:nth-child(2)")?.text().trim();

        return { label, value };
      });
      return {
        h3,
        values,
      };
    })
    .reduce(
      (acc, section) => {
        section.values.forEach((value) => {
          acc[value.label] = isNaN(Number(value.value))
            ? value.value
            : Number(value.value);
        });
        return acc;
      },
      {} as Record<string, any>,
    );

  return sections;
};
