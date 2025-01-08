import { log_error } from '../src/logger.js';
import { Server } from '../src/server.js';

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

try {
const server = Server({
  //capabilities: getServerCapabilities(),
  //infos: getServerInfos(),
  tools: getToolList,
  handleToolCall
});

server.start();
} catch(e) {
  log_error(e.message)
}
