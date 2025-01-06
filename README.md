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
getLinkTree('https://www.ismetomerkoyuncu.com/', './output').then(console.log).catch(console.error); // As xlsx
getLinkTree('https://www.ismetomerkoyuncu.com/').then(console.log).catch(console.error); // As array
```

This will create a visual map of the links found on the website.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.
