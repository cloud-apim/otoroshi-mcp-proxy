#!/usr/bin/env node

import { log_error } from '../src/logger.js';
import { Server } from '../src/server.js';

import { start as SseStart } from '../src/sse-proxy.js';
import { start as WsStart } from '../src/ws-proxy.js';
import { start as HttpStart } from '../src/http-proxy.js';

function getServerCapabilities() {
  return {
    "tools": {},
    "logging": {},
  };
}

function getServerInfos() {
  return {
    name: "room-temperature manuel",
    version: "1.0.0",
  };
}

function getToolList() {
  return [
    {
      name: "oto-list-rooms",
      description: "List all the rooms in the house to get temperature from",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "oto-room-temperature",
      description: "Get the temperature for a room",
      inputSchema: {
        type: "object",
        properties: {
          room: {
            type: "string",
            description: "the name of the room",
          },
        },
        required: ["room"],
      },
    },
  ];
}

function handleToolCall(id, params) {
  const { name, arguments: args } = params;
  if (name === "list-rooms") {
    return {
      content: [
        {
          type: "text",
          text: "manual, office, living, kitchen"
        }
      ]
    };
  } else if (name === "room-temperature") {
    const { room } = args;
    return {
      content: [
        {
          type: "text",
          text: `Room temperature for '${room}' is 21 degrees celcius`
        }
      ]
    };
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }
}

console.error('env', JSON.stringify(process.env))

const transport = (process.env.OTOROSHI_TRANSPORT || 'http').toLowerCase();
console.error('transport: ' + transport)

if (transport === 'http') {
  HttpStart();
} else if (transport === 'sse') {
  SseStart();
} else if (transport === 'ws') {
  WsStart();
} else {
  try {
    const server = Server({
      tools: getToolList,
      handleToolCall
    });
    server.start();
  } catch(e) {
    log_error(e.message)
  }
}