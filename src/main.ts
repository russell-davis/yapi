import { getTickerData } from "./utils.ts";
import { Command } from "commander";
import { fetcher } from "./fetcher.ts";
import axios from "axios";

const main = async () => {
  const program = new Command();

  program.nameFromFilename("yapi").version("0.0.1");

  program
    .command("yapi <ticker>")
    .option("-s, --saveTo <path>", "Specify the saveTo path")
    .description(
      'Start the "yapi" CLI tool with the given ticker and optional saveTo path.',
    )
    .action(async (ticker: string, options: { saveTo?: string }) => {
      const { saveTo } = options;

      // if ticker is not provided, throw error
      if (!ticker) {
        console.error("Please provide a ticker");
        throw new Error("Please provide a ticker");
      }

      // fetch the data
      const data = await getTickerData(ticker);

      if (!data) {
        throw new Error("data is null");
      }

      // log the data to the console
      const json = JSON.stringify(data, null, 2);
      console.info({ json });
    });
  await program.parseAsync(process.argv);
};

export default main;

if (import.meta.main) {
  console.info("Running main");
  await main();
}
