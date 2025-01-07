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

const getLinksRecursively = async (page, url, baseDomain, visitedLinks = new Set(), tree = {}) => {
  if (visitedLinks.has(url)) return;

  visitedLinks.add(url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const links = await getAllLinks(page);
    const uniqueLinks = links.filter(link => new URL(link).hostname === baseDomain || "www." + new URL(link).hostname === baseDomain);

    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
    const currentNode = pathParts.reduce((acc, part) => acc[part] || (acc[part] = {}), tree);

    for (const link of uniqueLinks) {
      await getLinksRecursively(page, link, baseDomain, visitedLinks, tree);
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

const getLinkMap = async (url, outputPath) => {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  const baseDomain = new URL(url).hostname;
  const linkTree = {};

  await getLinksRecursively(page, url, baseDomain, new Set(), linkTree);
  await browser.close();

  if (outputPath) {
    const filename = `${new URL(url).hostname}-links.xlsx`;
    const filePath = saveToExcel(linkTree, outputPath, filename);
    return filePath; // Excel dosya yolu döndürülüyor
  } else {
    const flatData = flattenTreeForOutput(linkTree);
    return flatData; // Dizi olarak döndürülüyor
  }
};

module.exports = { getLinkMap, getAllLinks };


