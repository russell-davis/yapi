import { getTickerData } from "./utils.ts";
import { Command } from "commander";

if (import.meta.main) {
  console.info("Running main");
  const program = new Command();

  program.version("0.0.1");

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
      console.info("data", data);
    });
  await program.parseAsync(process.argv);
}
