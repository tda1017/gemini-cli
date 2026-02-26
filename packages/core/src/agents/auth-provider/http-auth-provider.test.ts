/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpAuthProvider } from './http-auth-provider.js';
import type { HttpAuthConfig } from './types.js';
import * as valueResolver from './value-resolver.js';

vi.mock('./value-resolver.js', () => ({
  resolveAuthValue: vi.fn(),
  needsResolution: vi.fn(),
}));

describe('HttpAuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Bearer auth', () => {
    it('should generate Bearer token header from literal', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Bearer',
        token: 'test-token',
      };
      vi.mocked(valueResolver.resolveAuthValue).mockResolvedValue('test-token');

      const provider = new HttpAuthProvider(config);
      await provider.initialize();
      const headers = await provider.headers();

      expect(headers).toEqual({ Authorization: 'Bearer test-token' });
      expect(valueResolver.resolveAuthValue).toHaveBeenCalledWith('test-token');
    });

    it('should generate Bearer token header from command', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Bearer',
        token: '!get-token',
      };
      vi.mocked(valueResolver.resolveAuthValue).mockResolvedValue(
        'resolved-token',
      );

      const provider = new HttpAuthProvider(config);
      await provider.initialize();
      const headers = await provider.headers();

      expect(headers).toEqual({ Authorization: 'Bearer resolved-token' });
      expect(valueResolver.resolveAuthValue).toHaveBeenCalledWith('!get-token');
    });
  });

  describe('Basic auth', () => {
    it('should generate Basic auth header from literals', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Basic',
        username: 'user',
        password: 'pass',
      };
      vi.mocked(valueResolver.resolveAuthValue).mockImplementation(
        async (val) => val,
      );

      const provider = new HttpAuthProvider(config);
      await provider.initialize();
      const headers = await provider.headers();

      // user:pass -> dXNlcjpwYXNz
      expect(headers).toEqual({ Authorization: 'Basic dXNlcjpwYXNz' });
    });

    it('should generate Basic auth header from commands', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Basic',
        username: '!get-user',
        password: '!get-pass',
      };
      vi.mocked(valueResolver.resolveAuthValue).mockImplementation(
        async (val) => {
          if (val === '!get-user') return 'user';
          if (val === '!get-pass') return 'pass';
          return val;
        },
      );

      const provider = new HttpAuthProvider(config);
      await provider.initialize();
      const headers = await provider.headers();

      expect(headers).toEqual({ Authorization: 'Basic dXNlcjpwYXNz' });
    });
  });

  describe('Custom schemes', () => {
    it('should generate header for generic scheme (e.g. Digest)', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Digest',
        value: 'digest-value',
      };
      vi.mocked(valueResolver.resolveAuthValue).mockResolvedValue(
        'digest-value',
      );

      const provider = new HttpAuthProvider(config);
      await provider.initialize();
      const headers = await provider.headers();

      expect(headers).toEqual({ Authorization: 'Digest digest-value' });
    });
  });

  describe('retry logic', () => {
    it('should retry for command-based credentials on 401', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Bearer',
        token: '!get-token',
      };
      vi.mocked(valueResolver.resolveAuthValue)
        .mockResolvedValueOnce('token-1')
        .mockResolvedValueOnce('token-2');

      const provider = new HttpAuthProvider(config);
      await provider.initialize();

      const res = new Response(null, { status: 401 });
      const retryHeaders = await provider.shouldRetryWithHeaders(
        {} as RequestInit,
        res,
      );

      expect(retryHeaders).toEqual({ Authorization: 'Bearer token-2' });
      expect(valueResolver.resolveAuthValue).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry for literal credentials', async () => {
      const config: HttpAuthConfig = {
        type: 'http',
        scheme: 'Bearer',
        token: 'literal-token',
      };
      vi.mocked(valueResolver.resolveAuthValue).mockResolvedValue(
        'literal-token',
      );

      const provider = new HttpAuthProvider(config);
      await provider.initialize();

      const res = new Response(null, { status: 401 });
      const retryHeaders = await provider.shouldRetryWithHeaders(
        {} as RequestInit,
        res,
      );

      expect(retryHeaders).toBeUndefined();
      expect(valueResolver.resolveAuthValue).toHaveBeenCalledTimes(1);
    });
  });
});
