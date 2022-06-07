const { parentPort, workerData } = require("worker_threads");
const cheerio = require("cheerio");
const axios = require("axios").default;
const urlParser = require("url");

var seenUrls = {};
var url = "";
function fixUrl(link) {
  if (link.includes("http")) return link;
  else return url + link;
}

async function run(url) {
  try {
    if (seenUrls[url]) return;
    console.log("crawling", url);
    seenUrls[url] = true;
    var resp = await axios.get(fixUrl(url));
    const links = findUrls(resp.data);
    const { host } = urlParser.parse(url);
    links
      .filter((link) => urlParser.parse(fixUrl(link)).host === host)
      .forEach(async (link) => {
        await run(fixUrl(link));
      });
  } catch (error) {
    console.log(error);
  }
}

function findUrls(searchText) {
  const $ = cheerio.load(searchText);
  const links = $("a")
    .map((i, link) => link.attribs.href)
    .get();
  return links;
}
console.log("worker started");
url = workerData.url;
workerData.data.forEach(async (link) => {
  await run(link);
});
parentPort.postMessage("success");
