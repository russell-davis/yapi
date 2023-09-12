export const fetcher = async (url: string, config?: FetchRequestInit) => {
  try {
    console.assert(!!url, "url is required");
    console.assert(!!fetch, "fetch is required");
    console.info("Fetching url", url);
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error("Error fetching url");
    }

    const data = await response.text();

    return data;
  } catch (e) {
    console.debug("Error fetching url", url);
    console.error(e);
    throw e;
  }
};
