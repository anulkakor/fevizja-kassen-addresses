export const json = (data, status = 200, headers = {}) => {
  const responseHeaders = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  };

  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: responseHeaders,
  });
};

export const clean = (value) =>
  typeof value === "string" ? value.trim() : "";
