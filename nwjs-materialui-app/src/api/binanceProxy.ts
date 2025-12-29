const SEC_HEADER_NAME = 'X-MBX-APIKEY';

export default async function proxyBinanceApi(req) {
  const match = req.url.match(/\/binance\/(.*)/);
  const requestUrl = `https://api.binance.com/${match[1]}`;
  //console.log('>', requestUrl);
  //console.log('>', req.headers);
  const headers = { [SEC_HEADER_NAME]: req.headers.get(SEC_HEADER_NAME) };
  //console.log('>', headers);
  const resp = await fetch(requestUrl, { headers });
  const respBody = await resp.json();
  return Response.json(respBody);
}
