import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const fetcher = async (
  url: string,
  config?: AxiosRequestConfig<any> | undefined,
) => {
  return axios.get(url, config);
};
