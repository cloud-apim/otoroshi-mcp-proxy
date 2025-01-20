import WebSocket from 'ws';

const endpoint = process.env.OTOROSHI_ENDPOINT || 'ws://mcplocalproxy.oto.tools:9999/ws';
const clientId = process.env.OTOROSHI_CLIENT_ID;
const clientSecret = process.env.OTOROSHI_CLIENT_SECRET;
const clientToken = process.env.OTOROSHI_TOKEN;
const cancelledRequests = [];
const options = {
  resources: [],
  prompts: [],
}
let ready = false;

if (!endpoint) {
  throw new Error("no otoroshi endpoint specified")
}

const addHeaders = {};
if (clientId && clientSecret) {
  addHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
}
if (clientToken) {
  addHeaders['Authorization'] = `Bearer ${clientToken}`
}
const messages = {};
const ws = new WebSocket(endpoint, { 
  headers: addHeaders
});
ws.on('error', console.error);
ws.on('message', (data) => {
  const parsed = JSON.parse(data);
  // console.error('got message', parsed)
  const id = parsed.id;
  if (messages[String(id)]) {
    messages[String(id)](parsed);
    delete messages[String(id)]
  }
});

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 
//console.error('waiting ...')
while(ws.readyState !== WebSocket.OPEN) {
  await delay(200);
}
//console.error('done waiting')

function callOtoroshi({ body = null } ) {
  const id = body.id;
  const p = new Promise((success, failure) => {
    messages[String(id)] = (parsed) => {
      success(parsed)
    };
  });
  ws.send(JSON.stringify(body));
  return p;
}

function toolsList(id) {
  return callOtoroshi({
    body: {
      jsonrpc: "2.0",
      id: id,
      method: 'tools/list',
    }
  }).then(rr => {
    return respond(id, rr);
  }).catch(e => {
    // console.error(e)
    respondError(id, 0, e.getMessage, {});
  });
}

function toolsCall(id, params) {
  return callOtoroshi({
    body: {
      jsonrpc: "2.0",
      id: id,
      method: 'tools/call',
      params
    }
  }).then(rr => {
    return respond(id, rr);
  }).catch(e => {
    // console.error(e)
    respondError(id, 0, e.getMessage, {});
  });
}

function initialize(id) {
  return callOtoroshi({
    body: {
      jsonrpc: "2.0",
      id: id,
      method: 'initialize',
    }
  }).then(rr => {
    return respond(id, rr);
  }).catch(e => {
    // console.error(e)
    respondError(id, 0, e.getMessage, {});
  });
}

function initialized(id) {
  return callOtoroshi({
    body: {
      jsonrpc: "2.0",
      id: id,
      method: 'notifications/initialized',
    }
  }).then(rr => {
    return respond(id, rr);
  }).catch(e => {
    // console.error(e)
    respondError(id, 0, e.getMessage, {});
  });
}

function respond(id, result) {
  if (cancelledRequests.indexOf(id) === -1) {
    console.log(JSON.stringify(result));
  }
}

function respondError(id, code, error, data) {
  if (cancelledRequests.indexOf(id) === -1) {
    const res = {
      "jsonrpc": "2.0",
      "id": id,
      "error": {
        code, 
        data, 
        error
      }
    };
    console.log(JSON.stringify(res));
  }
}

function onCommand(command) {
  const { method, params, id } = command;
  if (method === "initialize") {
    initialize(id);
  } else if (method === "notifications/initialized") {
    initialized(id);
    ready = true;
  } else if (method === "tools/list") {
    toolsList(id);
  } else if (method === "resources/list") {
    respond(id, options.resources);
  } else if (method === "prompts/list") {
    respond(id, options.prompts);
  } else if (method === "tools/call") {
    toolsCall(id, params)
  } else if (method === "cancelled") {
    const rid = params.requestId;
    cancelledRequests.push(rid);
  } else {
    // console.error(`unknown method: ${method}`)
    respondError(id, 0, `unknown method: ${method}`, {})
  }
}

export function start() {
  process.stderr.write('starting otoroshi mcp ws proxy\n');
  process.stdin.on("data", data => {
    try {
      const data_str = data.toString('utf8');
      // console.error('raw_input', data_str);
      if (data_str.indexOf('\n') > -1) {
        const commands = data_str.split('\n');
        commands.filter(i => i.trim().length > 0).map(c => onCommand(JSON.parse(c)));
      } else {
        onCommand(JSON.parse(data_str))
      }
    } catch (e) {
      console.error('stdin error', e.message);
      console.error(e);
    }
  });
}