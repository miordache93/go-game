// Mongo initialization script — runs once on first container start
// (mounted into /docker-entrypoint-initdb.d). Creates the application
// database, an app user, and baseline indexes.
//
// The root user/password come from MONGO_INITDB_ROOT_* in docker-compose.

const dbName = 'go-game-db';
const appUser = 'go-game-user';
const appPass = 'go-game-pass';

db = db.getSiblingDB(dbName);

db.createUser({
  user: appUser,
  pwd: appPass,
  roles: [{ role: 'readWrite', db: dbName }],
});

// Touch the core collections so they exist before the API connects.
db.createCollection('users');
db.createCollection('games');

print(`Initialized database "${dbName}" with app user "${appUser}".`);
