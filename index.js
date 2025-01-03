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

const getLinksRecursively = async (page, url, baseDomain, visitedLinks = new Set()) => {
  if (visitedLinks.has(url)) {
    return null; // Eğer URL daha önce ziyaret edildiyse, bir şey döndürme
  }

  visitedLinks.add(url); // URL'yi ziyaret edildi olarak işaretle

  console.log(`Visiting: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const links = await getAllLinks(page); // Sayfadaki tüm bağlantıları al
    const uniqueLinks = links
      .filter((link) => !visitedLinks.has(link)) // Ziyaret edilmemiş olanları filtrele
      .filter((link) => new URL(link).hostname === baseDomain); // Sadece tam eşleşen domain'e ait bağlantıları filtrele

    const tree = { url, subLinks: [] };

    for (const link of uniqueLinks) {
      const subTree = await getLinksRecursively(page, link, baseDomain, visitedLinks);
      if (subTree) tree.subLinks.push(subTree);
    }

    return tree; // Ağacın bu dalını döndür
  } catch (error) {
    console.error(`Failed to visit ${url}:`, error.message);
    return null;
  }
};

const saveToExcel = (data, filename) => {
  const filePath = path.resolve(__dirname, filename);

  console.log(`Saving Excel file to: ${filePath}`);

  const flattenTree = (node, parent = '') => {
    const flat = [{ Link: node.url, Parent: parent }];
    for (const subLink of node.subLinks) {
      flat.push(...flattenTree(subLink, node.url));
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

  const startUrl = 'https://www.rastmakine.com';
  const baseDomain = new URL(startUrl).hostname;

  const linkTree = await getLinksRecursively(page, startUrl, baseDomain);

  console.log('Link tree:', JSON.stringify(linkTree, null, 2));

  saveToExcel(linkTree, 'links.xlsx');

  await browser.close();
};

main();
