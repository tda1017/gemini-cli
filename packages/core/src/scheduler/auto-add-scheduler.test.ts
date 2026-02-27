/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, type Mocked } from 'vitest';
import { updatePolicy } from './policy.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { MessageBusType } from '../confirmation-bus/types.js';
import {
  ToolConfirmationOutcome,
  type AnyDeclarativeTool,
  type ToolEditConfirmationDetails,
} from '../tools/tools.js';
import {
  READ_FILE_TOOL_NAME,
  LS_TOOL_NAME,
  WRITE_FILE_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  READ_MANY_FILES_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  WRITE_TODOS_TOOL_NAME,
} from '../tools/tool-names.js';
import type { ReadFileTool } from '../tools/read-file.js';
import type { LSTool } from '../tools/ls.js';

describe('Scheduler Auto-add Policy Logic', () => {
  it('should set persist: true for ProceedAlways if autoAddPolicy is enabled', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = { name: 'test-tool' } as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: 'test-tool',
        persist: true,
      }),
    );
  });

  it('should set persist: false for ProceedAlways if autoAddPolicy is disabled', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(false),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = { name: 'test-tool' } as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: 'test-tool',
        persist: false,
      }),
    );
  });

  it('should generate specific argsPattern for edit tools', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = { name: WRITE_FILE_TOOL_NAME } as AnyDeclarativeTool;
    const details: ToolEditConfirmationDetails = {
      type: 'edit',
      title: 'Confirm Write',
      fileName: 'test.txt',
      filePath: 'test.txt',
      fileDiff: '',
      originalContent: '',
      newContent: '',
      onConfirm: vi.fn(),
    };

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, details, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        argsPattern: expect.stringMatching(/test.*txt/),
      }),
    );
  });

  it('should generate specific argsPattern for read_file', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: READ_FILE_TOOL_NAME,
      params: { file_path: 'read.me' },
    } as unknown as ReadFileTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: READ_FILE_TOOL_NAME,
        argsPattern: expect.stringMatching(/read.*me/),
      }),
    );
  });

  it('should generate specific argsPattern for list_directory', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: LS_TOOL_NAME,
      params: { dir_path: './src' },
    } as unknown as LSTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: LS_TOOL_NAME,
        argsPattern: expect.stringMatching(/src/),
      }),
    );
  });

  it('should generate specific argsPattern for glob', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: GLOB_TOOL_NAME,
      params: { dir_path: './packages' },
    } as unknown as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: GLOB_TOOL_NAME,
        argsPattern: expect.stringMatching(/packages/),
      }),
    );
  });

  it('should generate specific argsPattern for grep_search', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: GREP_TOOL_NAME,
      params: { dir_path: './src' },
    } as unknown as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: GREP_TOOL_NAME,
        argsPattern: expect.stringMatching(/src/),
      }),
    );
  });

  it('should generate specific argsPattern for read_many_files', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: READ_MANY_FILES_TOOL_NAME,
      params: { include: ['src/**/*.ts', 'test/'] },
    } as unknown as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: READ_MANY_FILES_TOOL_NAME,
        argsPattern: expect.stringMatching(/include.*src.*ts.*test/),
      }),
    );
  });

  it('should generate specific argsPattern for web_fetch', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: WEB_FETCH_TOOL_NAME,
      params: { prompt: 'Summarize https://example.com/page' },
    } as unknown as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: WEB_FETCH_TOOL_NAME,
        argsPattern: expect.stringContaining('example\\.com'),
      }),
    );
  });

  it('should generate specific argsPattern for web_search', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: WEB_SEARCH_TOOL_NAME,
      params: { q: 'how to bake bread' },
    } as unknown as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: WEB_SEARCH_TOOL_NAME,
        argsPattern: expect.stringContaining('how to bake bread'),
      }),
    );
  });

  it('should generate specific argsPattern for write_todos', async () => {
    const mockConfig = {
      getAutoAddPolicy: vi.fn().mockReturnValue(true),
      setApprovalMode: vi.fn(),
    } as unknown as Mocked<Config>;
    const mockMessageBus = {
      publish: vi.fn(),
    } as unknown as Mocked<MessageBus>;
    const tool = {
      name: WRITE_TODOS_TOOL_NAME,
      params: { todo: 'fix the bug' },
    } as unknown as AnyDeclarativeTool;

    await updatePolicy(tool, ToolConfirmationOutcome.ProceedAlways, undefined, {
      config: mockConfig,
      messageBus: mockMessageBus,
    });

    expect(mockMessageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageBusType.UPDATE_POLICY,
        toolName: WRITE_TODOS_TOOL_NAME,
        argsPattern: expect.stringContaining('fix the bug'),
      }),
    );
  });
});
