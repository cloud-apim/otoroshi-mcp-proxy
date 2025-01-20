import fetch from 'node-fetch';

export async function start() {

  let endpoint = process.env.OTOROSHI_ENDPOINT || 'http://mcplocalproxy.oto.tools:9999/sse';
  const clientId = process.env.OTOROSHI_CLIENT_ID;
  const clientSecret = process.env.OTOROSHI_CLIENT_SECRET;
  const clientToken = process.env.OTOROSHI_TOKEN;
  const cancelledRequests = [];
  const options = {
    resources: [],
    prompts: [],
  }
  let ready = false;
  let received = false;
  
  if (!endpoint) {
    throw new Error("no otoroshi endpoint specified")
  }
  
  function callOtoroshi({ method = "POST", path = "", headers = { "Content-Type": "application/json"}, body = null } ) {
    const addHeaders = {};
    if (clientId && clientSecret) {
      addHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    }
    if (clientToken) {
      addHeaders['Authorization'] = `Bearer ${clientToken}`
    }
    return fetch(`${endpoint}${path}`, {
      method: method || "POST",
      headers: {
        ...headers,
        ...addHeaders,
      },
      body: body ? JSON.stringify(body) : null,
    })
  }
  
  
  callOtoroshi({
    method: "GET",
    headers: {}
  }).then(async response => {
    if (response.ok) {
      try {
        for await (const c of response.body) {
          const chunk = c.toString();
          const lines = chunk.split("\n").filter(line => line.trim() !== "").filter(i => i.indexOf('data: ') === 0).map(i => i.substring(6));
          const getEndpoint = chunk.indexOf('event: endpoint') === 0;
          for (const line of lines) {
            if (getEndpoint) {
              const parts = endpoint.split('/')
              endpoint = [parts[0], parts[1], parts[2], line].join('/').replaceAll('//', '/');
              // console.error('endpoint', endpoint)
              received = true
            } else {
              const parsed = JSON.parse(line);
              // console.error('out', JSON.stringify(parsed))
              console.log(JSON.stringify(parsed));
            }
          }
        }
      } catch (err) {
        console.error(err.stack);
      }
    }
  })
  
  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  } 
  //console.error('waiting ...')
  while(!received) {
    await delay(200);
  }
  
  
  function toolsList(id) {
    return callOtoroshi({
      body: {
        jsonrpc: "2.0",
        id: id,
        method: 'tools/list',
      }
    }).then(rr => {
      //return respond(id, rr);
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
      //return respond(id, rr);
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
      //return respond(id, rr);
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
      // return respond(id, rr);
    }).catch(e => {
      // console.error(e)
      respondError(id, 0, e.getMessage, {});
    });
  }
  
  function respond(id, result) {
    if (cancelledRequests.indexOf(id) === -1) {
      // console.error('respond', JSON.stringify(result))
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
      // console.error('respondError', JSON.stringify(res))
      console.log(JSON.stringify(res));
    }
  }
  
  function onCommand(command) {
    // console.error('command', JSON.stringify(command))
    const { method, params, id } = command;
    if (method === "initialize") {
      initialize(id);
    } else if (method === "notifications/initialized") {
      initialized(id);
      ready = true;
    } else if (method === "tools/list") {
      toolsList(id);
    } else if (method === "resources/list") {
      respond(id, { jsonrpc: "2.0", id: id, result: { resources: options.resources }});
    } else if (method === "prompts/list") {
      respond(id, { jsonrpc: "2.0", id: id, result: { prompts: options.prompts }});
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


  process.stderr.write('starting otoroshi mcp sse proxy\n');
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