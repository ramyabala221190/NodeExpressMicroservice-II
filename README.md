https://github.com/Distinctlyminty/MicroserviceFundamentals/blob/main/VehicleService/src/services/vehicleService.js

# Basics of MongoDB

In MongoDB, data is organized hierarchically:
## Databases:
A MongoDB instance refers to a single running process of the MongoDB database server, typically the mongod process. This process is responsible for managing the data files, handling client connections, and executing database operations.
A single process represents one active mongod process running on a server.

Each instance/single mongod process has its own configuration, often defined in a configuration file, which specifies details like data file locations, port number for connections, and other operational parameters.

Each instance/single mongod process manages its own set of data files where the actual MongoDB documents are stored.

Each instance/single mongod process listens on a specific port for incoming client connections.

A MongoDB instance can operate as a standalone server or as part of a larger cluster, such as a replica set or a sharded cluster. In a clustered environment, multiple instances work together to provide high availability and scalability.

A MongoDB instance can host multiple databases, each containing a distinct set of collections.

While a single MongoDB instance can host multiple databases, using separate databases for different environments within that instance is generally preferred


## Collections:
Analogous to tables in relational databases, a collection is a grouping of MongoDB documents. Unlike relational tables, collections are schema-less, meaning documents within the same collection can have varying fields and data types. Collections are automatically created when the first document is inserted into them.

## Documents:
Documents are the fundamental units of data storage in MongoDB, similar to rows in relational databases. They are stored in BSON (Binary JSON) format and consist of key-value pairs, which are essentially JSON objects. Each document within a collection must contain a unique _id field, which serves as a primary key. If not explicitly provided, MongoDB automatically generates an ObjectId for this field.

## Fields:
Within a document, individual key-value pairs represent fields, akin to columns in a relational table. Fields can hold various data types, including strings, numbers, booleans, arrays, embedded documents, and more. MongoDB's flexible schema allows for dynamic addition or removal of fields within documents in a collection without requiring a predefined schema for the entire collection.

## Schema:

In MongoDB, a schema is defined for a collection, not for an entire database.
While MongoDB is known for its schema flexibility, meaning you aren't strictly required to define a schema before inserting data, 
it's common practice to enforce a structure, especially in application development. This is typically done at the collection level, 
often using an Object Data Modeling (ODM) library like Mongoose in Node.js.

A schema defines:
1. The structure of documents: within a specific collection.
2. The fields: that documents in that collection should contain.
3. Data types: for each field (e.g., String, Number, Date, Boolean).
4. Validation rules: to ensure data integrity.
5. Default values: for fields.

## Installation

1. We need to download the free community edition of Mongo DB

https://www.mongodb.com/products/self-managed/community-edition ---> https://www.mongodb.com/try/download/community
Here we download the Mongo DB community server


2. When installing the .msi, choose custom setup.Click Next and select to use mongodb as a service and not
as a local domain or user.

3. Mongo compass is a user interface to interact with the DB and the data.

4. The dbClient.js is created to manage the database connections.

To connect to a MongoDB deployment, you need two things:

=>Connection URI, also known as a connection string, which tells the Node.js driver which MongoDB deployment to connect to.

=>MongoClient object, which creates the connection to and performs operations on the MongoDB deployment.

In  dbClient.ts below is the connection URI

const uri=`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;

MONGO_HOST is nothing but the docker service name for mongodb
MONGO_PORT is 27017, which is default if not specified
MONGO_Db is myApp

There is no need to create a database before itself. myApp was not created. It got created
automatically on the first connection since it didnt exist.

myApp is the database. In this example, we are creating a products collection in this database.
The collection again not explicitly created.

Since the schema model name was Product, the collection name has become the plural lowercase version of the model name :products. Each collection will have its mongoose schema.

```
export default mongoose.model("Product",productSchema);

```


5. The MongoDB data directory is the location on the file system where MongoDB stores all of its data files, including collections, indexes, and oplog (for replica sets).
Default Locations:
Unix-like systems (Linux, macOS): /data/db
Windows: C:\data\db (on the drive from which mongod is started, if not specified)

## Project Setup

First steps towards a Node Express- Mongo DB project

npm init
tsc --init
git init

npm install --save-dev typescript @types/node @types/express dotenv ts-node nodemon
npm install --save express
npm install --save mongoose

## Local run

We are using nodemon + ts-node to run the project locally

We have created a nodemon.json in the root of the project. We are using ts-node to compile the .ts files.
Instead of node, ts-node is used. 

```
{
    "watch": ["src"],
    "ext": "ts,js",
    "ignore": ["dist", "node_modules"],
    "exec": "ts-node -r dotenv/config ./src/app.ts"
  }

```

Since the location of the .env file is not in the root of the project, we need to set the value of the
DOTENV_CONFIG_PATH environment variable to the custom path of the .env file and then executing nodemon/

```
    "local":"set DOTENV_CONFIG_PATH=./docker/.env&&nodemon",

```

Thus "npm run local" is used to run the project locally.

## Running the application using docker

```
docker compose -p microservices -f docker/docker-compose.yml build

docker compose -p microservices -f docker/docker-compose.yml up -d --remove-orphans --no-build

```

To build changes only in the node project and restart only node container
This is when you already have db,nginx and node containers running but only want changes in the node express project
to be rebuilt.

```

docker compose -p microservices -f docker/docker-compose.yml build node

docker compose -p microservices -f docker/docker-compose.yml up -d --remove-orphans --no-build node


```

client --->nginx --->node express ---> mongo db

Client will make requests to nginx on localhost:8400 which is routed to node express on 8091.
The node express server will query the mongodb listening on port 27017, which is the default port.

## How to view the collections and documents in the database in docker container ?

Once docker image is built and docker containers for db,node and nginx are up and running,

In CMD,use the below  docker exec command to open an interactive mongosh session inside your running MongoDB container.

mongo-container is the mongodb container name, we have  in docker compose file

```
docker exec -it mongo-container mongosh

```

Screenshot of above and below in public/images folder.

Once inside the mongosh shell session, execute the below command to show the list dbs.

```
show dbs
```

Switch to your db

```
use myApp

```

List the collections


```
show collections

```

Query the collections

```
db.products.find()

```

## What is an API gateway ?

Microservices are made accessible to the clients via the api gateway.
It acts as a gatekeeper orchestrating the flow of requests and responses between clients
and backend services.

Functions:

1. API routing to the correct microservice

2. Load balancing -They distribute traffic amongst different instances of the microservice.

3. Manage authentication and enforce access control policies for user authorisation.

4. Security like encryption,denial of service protection and often act as web app firewall.

5. Rate limiting/throttling to prevent abuse/overuse of services to ensure fair usage and system
stability.


6. Caching



