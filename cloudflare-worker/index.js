export default {
  async fetch(request, env, ctx) {
    // Enable CORS for the Chrome Extension
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight options request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname; // Expected path: /v1beta/models/gemini-2.5-flash:generateContent

    // Validate path to ensure it is only forwarding Gemini model API calls
    if (!path.startsWith("/v1beta/models/")) {
      return new Response(
        JSON.stringify({ error: "Only v1beta/models/ endpoints are proxied." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Securely append the Gemini API key on the server-side
    const targetUrl = `https://generativelanguage.googleapis.com${path}?key=${env.GEMINI_API_KEY}`;

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: request.body,
    });

    try {
      const response = await fetch(newRequest);
      const newResponse = new Response(response.body, response);
      
      // Inject CORS headers
      Object.keys(corsHeaders).forEach(key => {
        newResponse.headers.set(key, corsHeaders[key]);
      });
      
      return newResponse;
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }
}
