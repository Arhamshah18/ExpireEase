# ExpireEase Backend
Owner: **Arham Shah** — Backend/Database & Integration Lead

## Structure
```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # PostgreSQL connection pool
│   ├── models/
│   │   └── schema.sql         # Full DB schema (7 tables)
│   ├── middleware/
│   │   └── auth.js            # Verifies Anurag's Firebase Auth tokens
│   ├── controllers/
│   │   ├── items.controller.js
│   │   ├── history.controller.js       # supports Angel's module
│   │   ├── wasteLog.controller.js      # supports Angel's module
│   │   ├── shoppingList.controller.js  # supports Angel's module
│   │   └── alerts.controller.js        # supports Kriti's module
│   ├── routes/
│   │   ├── items.routes.js
│   │   ├── history.routes.js
│   │   ├── wasteLog.routes.js
│   │   ├── shoppingList.routes.js
│   │   └── alerts.routes.js
│   ├── app.js                 # Express app + route mounting
│   └── server.js              # Entry point
├── .env.example
├── package.json
└── README.md
```

## Setup
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run migrate         # applies schema.sql
npm run dev
```

## API surface
| Base path | Owner it supports |
| --- | --- |
| `/api/items` | Core inventory (this module) |
| `/api/history` | Angel — used/consumed logging |
| `/api/waste-log` | Angel — waste log + auto-expire job |
| `/api/shopping-list` | Angel — smart shopping list |
| `/api/alerts` | Kriti — alert send-once enforcement |

All routes require `Authorization: Bearer <Firebase ID token>` issued by Anurag's auth flow.

## Where this fits in the full repo
This `backend/` folder sits alongside the existing `frontend/` folder at the
project root, replacing the old `backend/functions/index.js` Cloud Function
approach with a standalone Node/Express API on Render, Railway, or AWS.
