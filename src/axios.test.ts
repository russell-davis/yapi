import { expect, test } from "bun:test";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { fetcher } from "./fetcher.ts";

test("basic axios mock", async () => {
  const mock = new MockAdapter(axios);
  const url = "https://example.com";
  mock.onGet(url).reply(
    200,
    `<html>
            <head>
                <title>Test</title>
            </head>
            <body>
                <h1>Test</h1>
            </body>
        </html>`,
  );
  const res = await fetcher(url);
  expect(res.status).toBe(200);
  expect(res.data).toContain("<title>Test</title>");
});
