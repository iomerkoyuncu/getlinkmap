const { launch } = require('puppeteer');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

dotenv.config();

const getAllLinks = async (page) => {
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors.map((anchor) => anchor.href).filter((href) => href.startsWith('http'));
  });
  return links;
};

const getLinksRecursively = async (page, url, baseDomain, visitedLinks = new Set(), tree = {}) => {
  if (visitedLinks.has(url)) {
    return; // Eğer URL daha önce ziyaret edildiyse, bir şey döndürme
  }

  visitedLinks.add(url); // URL'yi ziyaret edildi olarak işaretle

  console.log(`Visiting: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const links = await getAllLinks(page);
    console.log(links);

    const uniqueLinks = []
    links.forEach(element => {
      if ((new URL(element).hostname === baseDomain) || ("www." + new URL(element).hostname === baseDomain)) { uniqueLinks.push(element); }
    });

    const pathParts = new URL(url).pathname.split('/').filter(Boolean); // URL'nin yol kısmını parçala
    const currentNode = pathParts.reduce((acc, part) => {
      if (!acc[part]) acc[part] = {};
      return acc[part];
    }, tree);

    for (const link of uniqueLinks) {
      const subPath = new URL(link).pathname.split('/').filter(Boolean);
      const child = subPath[pathParts.length]; // Mevcut seviyedeki alt yol
      if (child) {
        if (!currentNode[child]) {
          currentNode[child] = {};
        }
        await getLinksRecursively(page, link, baseDomain, visitedLinks, tree);
      }
    }
  } catch (error) {
    console.error(`Failed to visit ${url}:`, error.message);
  }
};

const saveToExcel = (data, filename) => {
  const filePath = path.resolve(__dirname, filename);

  console.log(`Saving Excel file to: ${filePath}`);

  const flattenTree = (node, parent = '') => {
    const flat = [];
    for (const key in node) {
      const newParent = parent ? `${parent}/${key}` : key;
      flat.push({ Path: newParent, Parent: parent });
      flat.push(...flattenTree(node[key], newParent));
    }
    return flat;
  };

  const flatData = flattenTree(data);
  const worksheet = xlsx.utils.json_to_sheet(flatData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Results');
  xlsx.writeFile(workbook, filePath);

  return filePath;
};

const main = async () => {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();

  const startUrl = 'https://www.karacahealthcare.com';
  const baseDomain = new URL(startUrl).hostname;

  const linkTree = {};
  await getLinksRecursively(page, startUrl, baseDomain, new Set(), linkTree);

  console.log(linkTree);

  // console.log('Link tree:', JSON.stringify(linkTree, null, 2));

  saveToExcel(linkTree, 'links.xlsx');

  await browser.close();
};

main();