import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const fetcher = (
  url: string,
  config?: AxiosRequestConfig<any> | undefined,
) => {
  return axios.get(url, config);
};
