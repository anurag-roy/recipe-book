import type { ApiRoutes } from '@server/app';
import { hc } from 'hono/client';
import ky, { isHTTPError } from 'ky';

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'API Error';
  }
}

const kyInstance = ky.create({
  retry: { limit: 0 },
  timeout: 300_000,
  hooks: {
    beforeError: [
      ({ error }) => {
        if (isHTTPError(error)) {
          const data = error.data;
          if (
            data &&
            typeof data === 'object' &&
            data !== null &&
            'message' in data &&
            typeof data.message === 'string'
          ) {
            return new ApiError(data.message);
          }
        }

        return error;
      },
    ],
  },
});

const client = hc<ApiRoutes>('/', {
  fetch: kyInstance,
});

export const api = client.api;
