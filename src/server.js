import { log_error, log_info } from './logger.js';

import { Proxy } from './proxy.js';

export function Server(opts) {

  let ready = false;

  let proxy = Proxy({});

  const cancelledRequests = [];

  function respond(id, result) {
    if (cancelledRequests.indexOf(id) === -1) {
      const res = {
        "jsonrpc": "2.0",
        "id": id,
        "result": result
      };
      log_info('output', res);
      console.log(JSON.stringify(res));
    }
  }

  function respondError(id, error, code, data) {
    if (cancelledRequests.indexOf(id) === -1) {
      const res = {
        "jsonrpc": "2.0",
        "id": id,
        "error": {
          code, data, error
        }
      };
      log_info('output', res);
      console.log(JSON.stringify(res));
    }
  }

  const options = {
    getServerCapabilities: () => opts.capabilities || {
      "tools": {},
      "logging": {},
    },
    getServerInfos: () => opts.infos || {
      name: process.env.MCP_SERVER_NAME || "otoroshi-mcp-local-proxy",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
    },
    getToolList: () => proxy.getTools(), //opts.tools ? opts.tools() : [],
    getResourceList: () => opts.resources ? opts.resources() : [],
    getPromptList: () => opts.prompts ? opts.prompts() : [],
    handleToolCall: (id, params) => {
      return proxy.toolCall(id, params);
      // if (opts.handleToolCall) {
      //   opts.handleToolCall(id, params);
      // } else {
      //   respondError(id, "no tools available", 0, { id, params });
      // }
    }
  }

  function onCommand(command) {
    const { method, params, id } = command;
    if (method === "initialize") {
      respond(id, {
        "protocolVersion": "2024-11-05",
        "capabilities": options.getServerCapabilities(),
        "serverInfo": options.getServerInfos(),
      });
    } else if (method === "notifications/initialized") {
      ready = true;
    } else if (method === "tools/list") {
      const r = options.getToolList();
      if (r.then) {
        r.then(rz => {
          respond(id, {
            tools: rz,
          })
        });
      } else {
        respond(id, {
          tools: r,
        });
      }
    } else if (method === "resources/list") {
      const r = options.getResourceList();
      if (r.then) {
        r.then(rz => respond(id, {
          resources: rz,
        }));
      } else {
        respond(id, {
          resources: r,
        });
      }
    } else if (method === "prompts/list") {
      const r = options.getPromptList();
      if (r.then) {
        r.then(rz => respond(id, {
          prompts: rz,
        }));
      } else {
        respond(id, {
          prompts: r,
        });
      }
    } else if (method === "tools/call") {
      try {
        const res = options.handleToolCall(id, params);
        if (res.then) {
          res.then(r => respond(id, r));
        } else {
          respond(id, res);
        }
      } catch(e) {
        respondError(id, "error while calling tool", 0, { id, params, e});
      }
    } else if (method === "cancelled") {
      const rid = params.requestId;
      cancelledRequests.push(rid);
    } else {
      log_error(`unknown method: ${method}`)
    }
  }

  return {
    start: () => {
      process.stderr.write('starting otoroshi mcp local proxy\n');
      process.stdin.on("data", data => {
        try {
          const data_str = data.toString('utf8');
          log_info('raw_input', data_str);
          if (data_str.indexOf('\n') > -1) {
            const commands = data_str.split('\n');
            commands.filter(i => i.trim().length > 0).map(c => onCommand(JSON.parse(c)));
          } else {
            onCommand(JSON.parse(data_str))
          }
        } catch (e) {
          log_error('stdin error', e.message);
          console.error(e);
        }
      });
    }
  };
};
