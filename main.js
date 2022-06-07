const { Worker } = require("worker_threads");
const cheerio = require("cheerio");
const axios = require("axios").default;

function offloadToThread(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./worker.js", { workerData });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0)
        console.log(`Stopped the Worker Thread with the exit code: ${code}`);
    });
  });
}

function findUrls(searchText) {
  const $ = cheerio.load(searchText);
  const links = $("a")
    .map((i, link) => link.attribs.href)
    .get();
  return links;
}

async function begin(url, workers) {
  var resp = await axios.get(url);
  const links = findUrls(resp.data);
  const workLoad = [...Array(Math.ceil(workers))].map((_) =>
    links.splice(0, links.length / workers)
  );
  for (let i = 0; i < workers; i++) {
    await offloadToThread({ data: workLoad[i], url });
  }
}

function isValidWebUrl(url) {
  let regEx =
    /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/gm;
  return regEx.test(url);
}

var args = process.argv.slice(2);
var url = args[0];
if (!isValidWebUrl(url)) {
  console.log(`Please enter a valid url`);
  process.exit();
}
url = url.replace(/\/$/, "");
var flagIndex = args.indexOf("-n");
var workers = flagIndex > -1 ? args[flagIndex + 1] : 1;
if (workers > 0) {
  console.log(`Starting process with ${workers} workers`);
  begin(url, workers);
} else {
  console.log(
    `Starting process with a single worker because either the -n flag was not provided or the number of workers was not a valid number`
  );
  begin(url, 1);
}
