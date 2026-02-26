/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HttpHeaders } from '@a2a-js/sdk/client';
import { BaseA2AAuthProvider } from './base-provider.js';
import type { HttpAuthConfig } from './types.js';
import { resolveAuthValue } from './value-resolver.js';
import { debugLogger } from '../../utils/debugLogger.js';

/**
 * Authentication provider for HTTP authentication schemes (Bearer, Basic, etc.).
 * Sends credentials in the 'Authorization' header.
 *
 * Supports resolution of environment variables ($ENV_VAR) and shell commands (!command).
 */
export class HttpAuthProvider extends BaseA2AAuthProvider {
  readonly type = 'http' as const;

  private resolvedToken: string | undefined;
  private resolvedUsername: string | undefined;
  private resolvedPassword: string | undefined;
  private resolvedValue: string | undefined;

  constructor(private readonly config: HttpAuthConfig) {
    super();
  }

  override async initialize(): Promise<void> {
    const config = this.config;
    if (config.scheme === 'Bearer') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const c = config as Extract<HttpAuthConfig, { scheme: 'Bearer' }>;
      this.resolvedToken = await resolveAuthValue(c.token);
    } else if (config.scheme === 'Basic') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const c = config as Extract<HttpAuthConfig, { scheme: 'Basic' }>;
      [this.resolvedUsername, this.resolvedPassword] = await Promise.all([
        resolveAuthValue(c.username),
        resolveAuthValue(c.password),
      ]);
    } else {
      // Generic scheme
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const c = config as Extract<HttpAuthConfig, { value: string }>;
      this.resolvedValue = await resolveAuthValue(c.value);
    }
    debugLogger.debug(
      `[HttpAuthProvider] Initialized with scheme: ${this.config.scheme}`,
    );
  }

  async headers(): Promise<HttpHeaders> {
    let authHeaderValue: string;
    const config = this.config;

    if (config.scheme === 'Bearer') {
      if (!this.resolvedToken) {
        throw new Error('Bearer token not resolved. Call initialize() first.');
      }
      authHeaderValue = `Bearer ${this.resolvedToken}`;
    } else if (config.scheme === 'Basic') {
      if (
        this.resolvedUsername === undefined ||
        this.resolvedPassword === undefined
      ) {
        throw new Error(
          'Basic credentials not resolved. Call initialize() first.',
        );
      }
      const credentials = `${this.resolvedUsername}:${this.resolvedPassword}`;
      const encoded = Buffer.from(credentials, 'utf-8').toString('base64');
      authHeaderValue = `Basic ${encoded}`;
    } else {
      // Generic scheme
      if (!this.resolvedValue) {
        throw new Error(
          `Value for scheme ${config.scheme} not resolved. Call initialize() first.`,
        );
      }
      authHeaderValue = `${config.scheme} ${this.resolvedValue}`;
    }

    return { Authorization: authHeaderValue };
  }

  /**
   * Re-resolve command-based credentials on auth failure.
   */
  override async shouldRetryWithHeaders(
    _req: RequestInit,
    res: Response,
  ): Promise<HttpHeaders | undefined> {
    if (res.status !== 401 && res.status !== 403) {
      this.authRetryCount = 0;
      return undefined;
    }

    if (this.authRetryCount >= BaseA2AAuthProvider.MAX_AUTH_RETRIES) {
      return undefined;
    }

    const needsRetry = this.checkNeedsResolution();
    if (!needsRetry) {
      return undefined;
    }

    this.authRetryCount++;
    debugLogger.debug(
      `[HttpAuthProvider] Re-resolving credentials for ${this.config.scheme} after auth failure`,
    );
    await this.initialize();

    return this.headers();
  }

  private checkNeedsResolution(): boolean {
    const config = this.config;
    if (config.scheme === 'Bearer') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const c = config as Extract<HttpAuthConfig, { scheme: 'Bearer' }>;
      return this.isCommand(c.token);
    }
    if (config.scheme === 'Basic') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const c = config as Extract<HttpAuthConfig, { scheme: 'Basic' }>;
      return this.isCommand(c.username) || this.isCommand(c.password);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const c = config as Extract<HttpAuthConfig, { value: string }>;
    return this.isCommand(c.value);
  }

  private isCommand(val: string): boolean {
    return val.startsWith('!') && !val.startsWith('!!');
  }
}
