# getlinkmap

## Overview

`getlinkmap` is a tool designed to get map of links from a given website. It crawls the website and finds internal and external links.

## Installation

To install `getlinkmap`, you can use npm:

```bash
npm install getlinkmap
```

## Usage

To generate a link map for a website, use the following command:

```bash
getLinkMap('https://www.ismetomerkoyuncu.com', { recursion: false, includeExternalLinks: true })
  .then(data => console.log('Link Map:', data))
  .catch(console.error);

// Save as Excel
getLinkMap('https://www.ismetomerkoyuncu.com', { recursion: false, includeExternalLinks: true }, './output')
  .then(filePath => console.log(`Excel file created at: ${filePath}`))
  .catch(console.error);
```

This will create a visual map of the links found on the website.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.
