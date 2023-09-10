import path from "path";
import fs from "fs";

export const saveToDisk = async (filename: string, data: string) => {
  // Create out folder if it doesn't exist
  const outFolderPath = path.join("out");
  const p = path.resolve(outFolderPath);

  if (!fs.existsSync(p)) {
    console.info("Creating out folder");
    fs.mkdirSync(p, { recursive: true });
  }

  const filePath = path.join(outFolderPath, filename);

  // Save the data using Bun
  await Bun.write(filePath, data);
  console.info(`Saved ${filePath} to disk`);
};
