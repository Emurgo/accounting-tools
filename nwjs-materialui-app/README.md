# NW.js Material-UI App

This project is a desktop application built using NW.js, React, Material-UI, and React Router. It provides a user interface for managing cryptocurrency assets, allowing users to add, delete, and list categories and addresses.

## Features

- Permanent Material-UI navigation drawer for easy navigation.
- Manage Assets page for CRUD operations on cryptocurrency categories (BTC, ETH, ADA, SUI).
- Ability to add, delete, and list address strings under each category.

## Project Structure

```
nwjs-materialui-app
├── src
│   ├── App.tsx                # Main application component with routing
│   ├── index.tsx              # Entry point of the React application
│   ├── main.js                # Main script for NW.js
│   ├── components
│   │   ├── NavigationDrawer.tsx # Navigation drawer component
│   │   ├── AssetManager.tsx     # Component for managing assets
│   │   └── CategoryList.tsx     # Component for listing categories and addresses
│   ├── pages
│   │   └── ManageAssetsPage.tsx # Page for managing assets
│   ├── db
│   │   └── jsonDb.ts           # Database configuration using node-json-db
│   └── types
│       └── index.ts            # TypeScript interfaces for data structures
├── public
│   └── index.html              # Main HTML file for the application
├── package.json                # npm configuration file
├── tsconfig.json               # TypeScript configuration file
├── nwjs.package.json           # NW.js application configuration
└── README.md                   # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd nwjs-materialui-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the application:
   ```
   npm start
   ```

## Usage

- Open the application to see the navigation drawer on the left.
- Click on "Manage Assets" to navigate to the Manage Assets page.
- Use the Asset Manager to add, delete, and list categories and addresses.

## License

This project is licensed under the MIT License.