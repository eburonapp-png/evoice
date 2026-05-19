/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from './state';

export const AVAILABLE_TOOLS: FunctionCall[] = [
  // Workspace Tools
  {
    name: 'create_markdown_document',
    description: 'Creates a Markdown document or document artifact.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        content: { type: 'STRING' },
      },
      required: ['title', 'content'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'save_note',
    description: 'Saves a note to the user\'s notes collection.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        content: { type: 'STRING' },
      },
      required: ['title', 'content'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'create_chart_spec',
    description: 'Generates a JSON specification for a data visualization chart (Recharts compatible).',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        type: { type: 'STRING', enum: ['line', 'bar', 'pie'] },
        data: { type: 'ARRAY', items: { type: 'OBJECT' } },
      },
      required: ['title', 'type', 'data'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  // Communication
  {
    name: 'send_whatsapp_message',
    description: 'Sends a WhatsApp message via the Eburon GoWA proxy.',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING', description: 'Phone number in international format or JID' },
        message: { type: 'STRING' },
      },
      required: ['to', 'message'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  // System
  {
    name: 'execute_safe_command',
    description: 'Executes a safe system command (date, uptime, hostname, pwd, whoami, ls).',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: { type: 'STRING', enum: ['date', 'uptime', 'hostname', 'pwd', 'whoami', 'ls'] },
      },
      required: ['command'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  // Location
  {
    name: 'get_user_location',
    description: 'Retrieves the user\'s current GPS location via the browser.',
    parameters: { type: 'OBJECT', properties: {} },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  // System Actions (Overlays)
  {
    name: 'open_overlay',
    description: 'Opens a specific overlay panel in the UI (e.g. for user input, settings, or external integrations).',
    parameters: {
      type: 'OBJECT',
      properties: {
        overlay_id: { 
          type: 'STRING', 
          enum: ['profile', 'settings', 'history', 'tools', 'whatsapp', 'scanner', 'meet', 'map', 'picker'],
          description: 'The ID of the overlay to open.'
        },
      },
      required: ['overlay_id'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  // Core Utilities
  {
    name: 'get_current_datetime',
    description: 'Returns current local date, time, and timezone.',
    parameters: { type: 'OBJECT', properties: {} },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'calculate',
    description: 'Evaluates math expressions.',
    parameters: { type: 'OBJECT', properties: { expression: { type: 'STRING' } }, required: ['expression'] },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'open_browser_url',
    description: 'Opens a URL in the user\'s default browser.',
    parameters: { type: 'OBJECT', properties: { url: { type: 'STRING' } }, required: ['url'] },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'create_html_document',
    description: 'Creates standalone HTML files with full styling (forms, invoices, dashboards).',
    parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, content: { type: 'STRING' } }, required: ['title', 'content'] },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'create_json_file',
    description: 'Creates JSON data files.',
    parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, content: { type: 'STRING' } }, required: ['title', 'content'] },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },

  {
    name: 'google_search',
    description: 'Searches the web via Google Custom Search API.',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'search_places',
    description: 'Searches for nearby places/establishments using location context.',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'save_memory',
    description: 'Proactively stores important information to long-term memory (personal, work, project).',
    parameters: { 
      type: 'OBJECT', 
      properties: { 
        category: { type: 'STRING', enum: ['personal', 'work', 'project'] },
        content: { type: 'STRING', description: 'The memory detail to save' }
      }, 
      required: ['category', 'content'] 
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];
