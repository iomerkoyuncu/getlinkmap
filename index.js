const { launch } = require('puppeteer');
const xlsx = require('xlsx');
const path = require('path');

const getAllLinks = async (page) => {
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors.map(anchor => anchor.href).filter(href => href.startsWith('http'));
  });
  return links;
};

const getLinksRecursively = async (recursion, includeExternalLinks, page, url, baseDomain, visitedLinks = new Set(), tree = {}) => {
  if (visitedLinks.has(url)) return;

  visitedLinks.add(url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const links = await getAllLinks(page);
    const uniqueLinks = links.filter(link => {
      const hostname = new URL(link).hostname;
      return includeExternalLinks || hostname === baseDomain || hostname === `www.${baseDomain}`;
    });

    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
    const currentNode = pathParts.reduce((acc, part) => acc[part] || (acc[part] = {}), tree);

    uniqueLinks.forEach(link => {
      const linkHostname = new URL(link).hostname;
      const linkParts = new URL(link).pathname.split('/').filter(Boolean);
      const linkNode = linkHostname === baseDomain ? currentNode : (tree[linkHostname] || (tree[linkHostname] = {}));
      linkParts.reduce((acc, part) => acc[part] || (acc[part] = {}), linkNode);
    });

    if (recursion) {
      for (const link of uniqueLinks) {
        const linkHostname = new URL(link).hostname;
        if (linkHostname === baseDomain || linkHostname === `www.${baseDomain}`) {
          await getLinksRecursively(recursion, includeExternalLinks, page, link, baseDomain, visitedLinks, currentNode);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to visit ${url}:`, error.message);
  }
};

const flattenTreeForOutput = (node) => {
  const flat = [];
  for (const key in node) {
    if (Object.keys(node[key]).length > 0) {
      flat.push({ [key]: flattenTreeForOutput(node[key]) });
    } else {
      flat.push(key);
    }
  }
  return flat;
};

const saveToExcel = (data, outputPath, filename) => {
  const workbook = xlsx.utils.book_new();
  const flatData = flattenTreeForExcel(data);

  const worksheet = xlsx.utils.json_to_sheet(flatData);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Links');
  const filePath = path.resolve(outputPath, filename);
  xlsx.writeFile(workbook, filePath);

  return filePath;
};

const flattenTreeForExcel = (node, parent = '') => {
  const flat = [];
  for (const key in node) {
    const newParent = parent ? `${parent}/${key}` : key;
    if (typeof node[key] === 'object' && Object.keys(node[key]).length > 0) {
      flat.push(...flattenTreeForExcel(node[key], newParent));
    } else {
      flat.push({ Path: newParent });
    }
  }
  return flat;
};

const getLinkMap = async (url, options, outputPath) => {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  const baseDomain = new URL(url).hostname;
  const linkTree = {};

  await getLinksRecursively(options.recursion, options.includeExternalLinks, page, url, baseDomain, new Set(), linkTree);
  await browser.close();

  if (outputPath) {
    const filename = `${new URL(url).hostname}-links.xlsx`;
    const filePath = saveToExcel(linkTree, outputPath, filename);
    return filePath;
  } else {
    const flatData = flattenTreeForOutput(linkTree);
    return flatData;
  }
};

module.exports = { getLinkMap };

//getLinkMap('https://www.ismetomerkoyuncu.com', { recursion: false, includeExternalLinks: false }).then(console.log).catch(console.error);