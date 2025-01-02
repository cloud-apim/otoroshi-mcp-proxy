const fetch = require('node:fetch');

exports.Proxy = function(opts) {

  const endpoint = opts.endpoint || process.env.OTOROSHI_ENDPOINT;
  const clientId = opts.client_id || process.env.OTOROSHI_CLIENT_ID;
  const clientSecret = opts.client_secret || process.env.OTOROSHI_CLIENT_SECRET;
  const clientToken = opts.bearer_token || process.env.OTOROSHI_TOKEN;

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
    });
  }

  return {
    raw: callOtoroshi,
    getServerInfos: () => {

    },
    getCapabilities: () => {

    },
    getTools: () => {
      return callOtoroshi({
        body: {
          method: 'tools/call',
          params
        }
      }).then(r => {
        if (r.status === 200) {
          r.json();
        } else {
          r.text().then(text => {
            return {
              "content": [{
                "type": "text",
                "text": text
              }],
              "isError": true
            };
          });
        }
      });
    },
    toolCall: (params) => {
      return callOtoroshi({
        body: {
          method: 'tools/call',
          params
        }
      }).then(r => {
        if (r.status === 200) {
          r.json().then(content => {
            return {
              "content": [content],
              "isError": false
            };
          });
        } else {
          r.text().then(text => {
            return {
              "content": [{
                "type": "text",
                "text": text
              }],
              "isError": true
            };
          });
        }
      });
    }
  }
};