import { getTickerData } from "./utils.ts";
import { Command } from "commander";

export const fetch = async (ticker: string) => {
  return getTickerData(ticker);
};

const program = new Command();

program.nameFromFilename("yapi").version("0.0.1");

program
  .command("yapi <ticker>")
  .option("-s, --saveTo <path>", "Specify the saveTo path")
  .description(
    'Start the "yapi" CLI tool with the given ticker and optional saveTo path.',
  )
  .action((ticker: string, options: { saveTo?: string }) => {
    const { saveTo } = options;

    console.info({
      ticker,
      saveTo,
    });
  });

program.parse(process.argv);
