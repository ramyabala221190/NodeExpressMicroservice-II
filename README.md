We can run the project locally without docker, with docker using Docker Desktop and on a remote server(using compose and swarm)

# Deployment on single VM strategy

We will be using the compose files within docker folder when deploying all connected microservices like cart,gateway and ek
to the same VM.

Deploy elk before other microservices because the latter depends on the former.
Let the former keep running.

Also deploy the cart and product microsvcs before gateway because gateway depends on these
microsvcs.

We are using GitHub actions to make CI CD to Azure VM possible.

The .github/workflows/build-deploy.yml contains the workflow for building the project and deploying
to the Azure VM.

We have deployed all the 3 microservices and the ELK to the same VM to keep it simple.
No docker swarm in use in this scenario.

=>Build only the services that have Dockerfiles
=>Build each microservice once, not per replica
=>CI/CD should build → push → deploy, not rebuild on the server
=>Let Docker Compose pull the images in the remote server and run them

In the Github action, we are building images for only those docker services which use Dockerfile
and pushing them to Dockerhub.
Both express and nginx use Dockerfiles. So we are building docker images for these 2 services alone
and pushing them to Dockerhub.
The mongo services uses the inbuilt docker image. So no seperate building/pushing is required.
Note that building and pushing for express and nginx is required when deploying to dev environment,
followed by pulling those images in the VM.
In prod environment, we just need to pull the already built and pushed images in the VM.

So we are maintaining seperate docker-compose files for deployment and local run.
The build field will be provided only in the docker-compose.local.yml and it will be omitted in the
docker-compose.yml.
This is because for local run ,we need to build the image and run it in DockerDesktop.

For deployment, we have a github action building and pushing the image. To pull the image in the VM,
we just need the image name in the docker-compose.yml.

Another important point to note is that the VM requires the compose and environment files in the VM
to pull the image. It also requires the nginx config files for dynamic injection of config file based on
deployment environment. So we have used the scp action to copy the docker folder and its contents
to a dedicated folder in the vm. Post this, we execute the "compose pull" and "compose up"
commands in the github action.

```
 - name: Copy compose files to VM
            uses: appleboy/scp-action@v0.1.7
            with:
              host: ${{ secrets.AZURE_VM_IP }}
              username: ${{ secrets.AZURE_VM_USER }}
              key: ${{ secrets.AZURE_VM_SSH_KEY }}
              source: "docker/**"
              target: "/home/${{ secrets.AZURE_VM_USER }}/${{vars.APP_NAME}}"

```

For sending logs to ELK, we using winston to send logs to a path. Filebeat will read the logs from the file and send to logstash.
ElasticSearch will do the indexing and send to Kibana for display.
So the paths are extremely important.

The env variables exposed throught github actions are accessible to the compose files in the github vm.
As long as you the docker containers are running in the github vm, there is no issue.
But when the compose files are copied to the VM, they no longer can access the environment variables exposed in the github actions.
The compose files entirely rely on inline env variables/ env files.
So we have to create .env file in the deploy step with the variables required to make further decisions as you see below:
Compose will automatically pick the .env file. There is no need to specify it in the compose file.

```
  cat <<EOF > /home/${{ secrets.AZURE_VM_USER }}/${{vars.APP_NAME}}/docker/.env
               DOCKERHUB_USER=${{ vars.DOCKERHUB_USERNAME }}
               APPNAME=${{ vars.APP_NAME }}
               TAG=${{ env.TAG }}
               TARGETENV=${{ github.event.inputs.environment }}
               EOF

```

## Application flow

client <----> nginx <---> express-gateway <----> cart/product microservice <---> mongodb

Client(browser) will send requests to nginx. Nginx acts as a reverse proxy and will also loadbalance between 3 express-gateway instances.
The express-gateway instance to which the request is routed, will loadbalance between 3 instances of the cart and
product microservice respectively. We have 3 instances of each microservices.
Based on the request path, the express-gateway will decide which microservice the request needs to be routed to and will also
loadbalance between different instances of that microservice.
Its important to note that any communication between the microservices has to happen via express-gateway and not nginx.

Nginx only receives the client requests and forwards them to the express-gateway. The express-gateway will forward the request
to the respective microservice. The microservice will communicate with other microservices via the express-gateway.

In production, nginx will use ssl certificates to run on https connection since it is exposed to the internet. The microservices and express-gateway are not exposed to the internet. So there is no need for ssl certificates for these.

nginx acts as edge gateway and express-gateway acts as api gateway

### 🧭 API Gateway vs Edge Gateway

| Feature          | **API Gateway**                                  | **Edge Gateway**                                           |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| **Primary Role** | Manages API traffic between clients and services | Manages all traffic entering the network or cluster        |
| **Scope**        | Focused on APIs and microservices                | Broader scope: APIs, web apps, static content, etc.        |
| **Location**     | Sits between client and backend APIs             | Sits at the network edge, often before API gateway         |
| **Functions**    | Authentication, rate limiting, routing, caching  | SSL termination, load balancing, firewall, DDoS protection |
| **Protocols**    | Mostly HTTP/HTTPS, REST, GraphQL                 | Supports HTTP, TCP, UDP, TLS, and more                     |
| **Examples**     | Kong, Express Gateway, Apigee, AWS API Gateway   | NGINX, Envoy, Cloudflare Gateway, NGINX Gateway Fabric     |
| **Use Case**     | API management and developer control             | Network-level security and traffic control                 |

---

### 🧠 How They Work Together

In many setups, **edge gateways and API gateways are layered**:

```
Client → Edge Gateway (NGINX) → API Gateway (Express Gateway) → Microservices
```

- **Edge Gateway** handles TLS, load balancing, and basic routing.
- **API Gateway** enforces API-specific policies like JWT auth, quotas, and versioning.

# Deployment using swarm

We will be using the compose files within the swarm folder.
We are using GitHub actions to make CI CD to Azure VM possible.

The .github/workflows/swarm-build-deploy.yml contains the workflow for building the project and deploying
to the Azure VM.

So we have totally 4 Azure VM's- 1 manager and 3 workers.
Ideally no apps should be deployed to the manager. But in our example, we have deployed the gateway app to the manager,
product microsvcs to 1 worker, cart microsvcs to another worker and elk to the last worker.
So the manager also acts as a worker in addition to its orchestration duties.

The compose stack files,env files, nginx config files if any for all microsvcs and elk will be copied to the manager node only.
We will never do any file copy to the worker nodes.

If nginx config files or ssl certs need to be shared across nodes, it will be done via Swarm configs/secrets. Explained in detail in the elk project.
So let it be files/certificates, it will be only on the manager node. It will only be shared(if required) with other nodes via swarm configs/
secrets.
We never ssh into the worker nodes in github actions workflow file for any reason. Its not required.

So deployment of the files,config files for each project will happen individually from each of the project's github action workflow file.

Prior to deployment, ensure the below steps are completed:

1. Swarm initialised on VM to function as manager node.
2. Add other VM's as worker nodes to the swarm by ssh'ing into these VM's individually and executing the join command.
3. Update the roles of each of the nodes from the manager node.
4. Create overlay networks for each environment from the manager node.
5. Ensure docker is installed in all VM's.
6. Ensure certbot is installed in the manager node and certificates are available in the manager node.

# running locally

First steps towards a Node Express- Mongo DB project

npm init
tsc --init
git init

This project is developed using typescript and uses nodemon to automatically restart the development server, everytime there is any change in the files in the src folder. We are also using ts-node, which is a TypeScript execution engine and REPL (Read-Eval-Print Loop) for Node.js. It allows direct execution of TypeScript code on Node.js without the need for pre-compilation into JS.

We have installed dotenv as dev dependency to load environment variables from the local.env file in the root of the project. dotenv is only used for local development.

MongoDB is schema-less, which means documents can have any shape. That's flexible - but also risky. Mongoose lets you define schemas that enforce structure. Hence the mongoose npm package.

winston and morgan npm packages are for logging purposes. Morgan is a middleware for Express apps that logs incoming HTTP requests. On the other hand, Winston is a general-purpose logger for your entire application - not just HTTP.

axios is required when 1 microservice wants to communicate with another microservice.

Just running the below script in package.json

```
    "local": "set DOTENV_CONFIG_PATH=./local.env&&nodemon",

```

We are setting the environment variable DOTENV_CONFIG_PATH to ./local.env so that dotenv can pick the correct environment file when we execute the nodemon command.

Moving to the nodemon.json file. It's a configuration file used by Nodemon. Instead of passing command-line flags every time, you can define them once in this JSON file.

```
{
"watch": ["src"],
"ext": "ts,js",
"ignore": ["dist", "node_modules"],
"exec": "ts-node -r dotenv/config ./src/app.ts"
}

```

So Nodemon is going to watch only the src folder for any changes. It only going to watch only files with .ts or .js extension within the src folder. It will ignore any changes within the dist or the node_modules folder. Finally it will run the below command, everytime there is a change and also when the server is started for the first time using "npm run local"

```
ts-node -r dotenv/config ./src/app.ts

```

Note:
If you do not want to install the dotenv package, you can load environment variables using nodemon as well. Specify the environment vairables as key-value pairs within the "env" field in the nodemon.json, instead of defining it within the local.env file. You can skip the dotenv/config within the "exec" field.

```
{
"watch": ["src"],
"ext": "ts,js",
"ignore": ["dist", "node_modules"],
"env":{
  //define your key-value pairs here
},
"exec": "ts-node ./src/app.ts"
}
```

Finally in the "local" script in the package.json will be just executing the nodemon command.

```
"local": "nodemon",

```

how are we running MongoDb locally ?

We need to do this only once. not for every microservice because all microservices are running on the same host when running locally.

For local testing, we need to install the Community Edition of MongoDB. Below is the link. Here we download the Mongo DB community server and then install it. MongoDB Community Server is the free, open-source version of the MongoDB document database. It is widely used for development and non-production environments.

https://www.mongodb.com/try/download/community

When installing the .msi, choose custom setup.Click Next and select to use mongodb as a service and not
as a local domain or user.

Once installed, you can create a empty data/db directory within C:/ using the command "mkdir data/db" in cmd . To start the mongodb server, which by default listens on the port 27017.

The MongoDB data directory is the location on the file system where MongoDB stores all of its data files, including collections, indexes, and oplog (for replica sets).
Default Locations:
Unix-like systems (Linux, macOS): /data/db
Windows: C:\data\db (on the drive from which mongod is started, if not specified)

Go to the bin folder of the installation on command prompt. For me it is C:\Program Files\MongoDB\Server\8.0\bin. Type "mongod" to start the mongodb server on default port 27017.

To verify if the mongodb server is running, enter the below in another command prompt window. If MongoDB is running, you will see a process named mongod.exe listed in the output, along with its PID (Process ID).

```
tasklist | findstr "mongod"

```

# Environment files:

We are using local.env for local running without docker.
docker/environments/dev.env for dev docker container and docker/environments/prod.env for prod docker container
docker/environments/common.env defines variables common to both dev and prod docker containers.

We are also using docker/environments/local.env when running locally using docker. This provides additional info like
docker tag, dockerhub username etc. Based on whether environment is dev/prod, the dev.env/ prod.env will be used in the override file.

# connecting to mongodb

To connect to a MongoDB deployment, you need two things:

=>Connection URI, also known as a connection string, which tells the Node.js driver which MongoDB deployment to connect to.

=>MongoClient object, which creates the connection to and performs operations on the MongoDB deployment.

In dbClient.ts below is the connection URI

const uri=`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;

The above environment variables are defined in the common.env file.

MONGO_HOST is nothing but the docker service name for mongodb
MONGO_PORT is 27017, which is default port, which the mongod process listens on ,internally in the container. It is better not to change
the port the mongod process listens on. Let the container port always be 27017. The host port needs to be changed if you have multiple
docker containers for mongodb within the same host.
MONGO_Db is myProductApp

There is no need to create a database before itself. myProductApp was not created. It got created
automatically on the first connection since it didnt exist.

myProductApp is the database. In this example, we are creating a products collection in this database.
The collection again not explicitly created.

Since the schema model name was Product, the collection name has become the plural lowercase version of the model name :products. Each collection will have its mongoose schema.

```
export default mongoose.model("Product",productSchema);

```

## How to view the collections and documents in the database in docker container ?

Once docker image is built and docker containers for db,node and nginx are up and running,

In CMD,use the below docker exec command to open an interactive mongosh session inside your running MongoDB container.

See the container name, we have in the docker compose file

```
docker exec -it <container-name> mongosh

```

Screenshot of above and below in public/images folder.

Once inside the mongosh shell session, execute the below command to show the list dbs.

```
show dbs
```

Switch to your db

```
use myProductApp

```

List the collections

```
show collections

```

Query the collections

```
db.products.find()

```

# Docker

Lets understand the docker compose files.

In the docker folder, we have a compose file for deployment and local docker container run :
docker-compose.local.yml and docker-compose.yml.
The override files are common to both.

In docker-compose.local.yml, we do not provide the image, just the build field to build the docker
image using the Dockerfile.

In docker-compose.yml, we have just provided the image name to be pulled from Dockerhub from the target
server. The images will be pre-built using Github actions docker/build-push-action@v5

We need to have 3 instances of the product-node. Instead of providing 3 duplicates of the
same service within the compose file, we just define 1 service with the name:product-node.

When pulling the image and running the container, we provide the "--scale" to create multiple instances of the provided service.

"--scale product-node=3" will create 3 instances of the product-node

Below is an example for local run:

```
 "docker-local-dev-up": "cross-env TARGETENV=dev docker compose --env-file docker/environments/local.env -p gateway-dev -f docker/docker-compose.local.yml -f docker/docker-compose.dev.override.yml up -d --remove-orphans --no-build --scale product-node=3",
```

Same approach used for deployment as well:

```
docker compose \
               -p ${{vars.APP_NAME}}-${{ github.event.inputs.environment }} \
               -f docker/docker-compose.yml \
               -f docker/docker-compose.${{ github.event.inputs.environment }}.override.yml \
               up -d --remove-orphans --no-build \
               --scale product-node=3
```

We always create the docker image once when deploying to dev environment and pull it from the VM for dev and prod environments for creating
the containers.

## 🧩 How environment variables actually work in Docker

### 1. **Environment variables are available _inside the running container’s process environment_**

A file inside the container (like an Nginx template, a Node.js script, a shell script, etc.) can access an environment variable **only if that variable exists in the container’s environment at runtime**.

### 2. **How do environment variables get into the container?**

They can come from several sources:

| Source                                    | Does it make the variable available inside the container? |
| ----------------------------------------- | --------------------------------------------------------- |
| `environment:` in `docker-compose.yml`    | ✅ Yes                                                    |
| `env_file:` in `docker-compose.yml`       | ✅ Yes                                                    |
| `docker run -e VAR=value`                 | ✅ Yes                                                    |
| `docker run --env-file file.env`          | ✅ Yes                                                    |
| `ENV VAR=value` in Dockerfile             | ✅ Yes (but baked into the image)                         |
| Variables defined only in your host shell | ❌ No, unless passed explicitly                           |

By convention, Docker Compose automatically looks for a file named .env in the same directory as your docker-compose.yml (or compose.yaml).
If found, variables from this file are loaded automatically.
You do not need to explicitly declare it with env_file: in the service definition or pass --env-file on the CLI.

So **environment variables are NOT limited to only `environment:` or `env_file:`**.  
They just need to be part of the container’s environment when it starts.

### 3. **Files inside the container cannot magically read host environment variables**

A file like:

- `/etc/nginx/templates/default.conf.template`
- `/usr/src/app/config.js`
- `/app/.env` (unless you copy it)
- Any script inside the container

…can only access variables that Docker injected into the container environment.

### 4. **Template engines (like envsubst, Nginx templates, etc.) only see variables in the container environment**

If you’re using:

- `envsubst`
- Nginx’s `template` feature
- A Node.js script reading `process.env`
- A shell script reading `$VAR`

They all rely on the container’s environment.

If the variable wasn’t passed via:

- `environment:`
- `env_file:`
- `docker run -e`
- `ENV` in Dockerfile

…it simply won’t exist.

---

## 🧠 The key rule

**A variable is accessible only if it exists in the container’s environment at runtime.**  
How it got there doesn’t matter — but it must be injected by Docker.

.env → used for Compose file substitution.

environment: or env_file: or --env-file is used for container runtime environment.

So any environment variables exposed from Github actions, are added to the .env file in the same folder as docker-compose in the VM.
This ensures the compose file picks them up but they will not be available in the container.

```
 cat <<EOF > /home/${{env.VM_USER }}/${{vars.APP_NAME}}/docker/.env
               DOCKERHUB_USER=${{ vars.DOCKERHUB_USERNAME }}
               APPNAME=${{ vars.APP_NAME }}
               TAG=${{ env.TAG }}
               TARGETENV=${{ github.event.inputs.environment }}
               AZURE_VM_DOMAIN=${{env.VM_DOMAIN}}
               VM_USER=${{env.VM_USER}}
               EOF


```

To make them available to the files in the container, we need to re-declare them in the environment field of the service.

```
 nginx:
       image: ${DOCKERHUB_USER}/${APPNAME}-nginx:${TAG}
       env_file: environments/common.env
       environment:
         - stdoutPath=/var/log/${APPNAME}-nginx/combined.log
         - stderrPath=/var/log/${APPNAME}-nginx/error.log
         - AZURE_VM_DOMAIN=${AZURE_VM_DOMAIN} # exposed from github actions but must be declared here to access in conf file
       restart: always
       volumes:
         - nginx-logs-volume:/var/log/${APPNAME}-nginx/
         - /home/${VM_USER}/${APPNAME}/docker/nginx.${TARGETENV}.conf:/etc/nginx/templates/default.conf.template

```

So there is difference between the variables in .env file vs in environment:, --env-file and env_file.
The last 3 will be available in the container runtime. The former will be available only to the compose file.
So it needs to be re-declared in the environment: field.

# running in docker

Used cross-env npm package for local docker builds
cross-env package helps to pass environment varibles in the npm script
If we pass using "set", compose file is unable to detect it.
So go for cross-env

So we build the docker image once for dev.
We use the same image to bring the dev and prod containers up. Below are the commands:

```

   "docker-local-dev-build": "cross-env TARGETENV=dev docker compose --env-file docker/environments/local.env  -p product-node-express-dev -f docker/docker-compose.local.yml -f docker/docker-compose.dev.override.yml  build",
    "docker-local-dev-up": "cross-env TARGETENV=dev docker compose --env-file docker/environments/local.env -p product-node-express-dev -f docker/docker-compose.local.yml -f docker/docker-compose.dev.override.yml up -d --remove-orphans --no-build --scale product-node=3",
    "docker-local-prod-up": "cross-env TARGETENV=prod docker compose --env-file docker/environments/local.env -p product-node-express-prod -f docker/docker-compose.local.yml -f docker/docker-compose.prod.override.yml up -d --remove-orphans --no-build --scale product-node=3"

```

For product-node , we have used expose instead of ports field.
This ensures that the containers are only exposed to other containers and not externally
We have not exposed the host ports so that it is not accessible externally in the browser.
Since they are not going to be accessed directly in the browser, we need not bother about host port.

Container ports can remain the same for the 3 instances of product-node service

### 🧠 When to Use This

- Microservices architecture where docker services talk to each other internally.
- You want to keep services private and secure.
- You’re using a reverse proxy like nginx + express-gatway to route the client requests to the correct microservice

```

Looking at docker-compose.dev.override.yml for db

```

product-db:
ports: - 27017:27017
networks: - mynetwork-dev

```

Looking at docker-compose.prod.override.yml

```

product-db:
ports: - 27016:27017
networks: - mynetwork-prod

````

In the docker compose file, the container port(RHS) must be the port on which the mongod process within the container is listening on. This
port will always be 27017 so the container port(RHS) must also be 27017, unless you are changing the port on which the mongod process
itself listens on(which is very unncessary)
The host port (LHS) is 27017 which means that mongo db will be accessible on port 27017 of host machine for dev container
For prod docker container, the host port is 27016.
It should not be 27017 again because we already have another container mapped to
host port 27017 on the same host. So the host port needs to be different here.

Observe that we have defined 3 docker services for the express app: product-node-1, product-node-2 and product-node-3

Express-gateway has the task of loadbalancing between these instances.

# SSL

SSL is not required for the microsvcs because ssl is handled at nginx level. Below is just for info.

Only for prod docker containers, we are using ssl self signed certificates for gateways and microservices.

Same rootCa certificate is used for all microservices and gateway project. That command already specified in gateway project.

1. Generate private key
openssl genrsa -out product.key 2048

2. Generate CSR using private key
openssl req -key product.key -new -out product.csr

3. Sign csr with root ca and generate .crt file using product-config.ext
openssl x509 -req -CA rootCA.crt -CAkey rootCA.key -in product.csr -out product.crt -days 365 -CAcreateserial -extfile product-config.ext

Below are the contents of the product-config.ext. Observe that the docker service names are also there in the subjectAltName.

authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
DNS.2 = product-node-1
DNS.3 = product-node-2
DNS.4 = product-node-3



### 🐳 Docker Service Names as Hostnames

In Docker networks, each service is automatically assigned a DNS name that matches its **service name**. So when a microservice sends a request using `axios` like this:

```js
axios.get('http://nginx-service/api/data')
````

…it’s actually resolving `nginx-service` via Docker’s internal DNS to the container running NGINX.

---

### 🔐 SSL Implications

If you're using **HTTPS** and the request is:

```js
axios.get("https://nginx-service/api/data");
```

then the SSL certificate presented by NGINX must match `nginx-service`—or the request will fail with a **certificate mismatch error**.

#### ✅ Solutions:

- **Use a self-signed certificate** with `nginx-service` as a Subject Alternative Name (SAN).
- Or, configure NGINX to respond to a **real domain name** (e.g., `api.example.com`) and use that in your request.
- Alternatively, use **HTTP internally** and terminate SSL at the edge (e.g., for external traffic only).

---

### 🧠 Best Practice

- Use **Docker service names** for internal routing.
- Use **domain names** for external access and SSL.
- If SSL is needed internally, ensure your cert includes the Docker service name in its SAN.

We are bind mounting these cetificates from the host onto the container

```
volumes:
        - C:/Users/User/certificates/self-signed-custom-ca/product.key:/var/lib/certs/product.key
        - C:/Users/User/certificates/self-signed-custom-ca/product.crt:/var/lib/certs/product.crt
        - C:/Users/User/certificates/self-signed-custom-ca/rootCA.crt:/var/lib/certs/rootCA.crt
```

We are referencing these certificates in the src/app.ts to create a https server if the environment is "prod".

```
  if(process.env.APP_ENV === "prod"){
    const options = {
      key: fs.readFileSync('/var/lib/certs/product.key'), // Path to your private key
      cert: fs.readFileSync('/var/lib/certs/product.crt')  // Path to your certificate
  };
    https.createServer(options, app).listen(process.env.APP_HTTP_PORT, () => {
          winstonLogger.debug(`HTTPS server running on port ${process.env.APP_HTTP_PORT}`);
      });
    }
else{
app.listen(process.env.APP_HTTP_PORT,()=>{
     winstonLogger.debug(`Server listening on port ${process.env.APP_HTTP_PORT}`)
})
}

```

Where is rootCA.crt used ? It is used in prod.env to set the below env variable

```
NODE_EXTRA_CA_CERTS=/var/lib/certs/rootCA.crt

```

The NODE_EXTRA_CA_CERTS environment variable in Node.js is used to specify an additional Certificate Authority (CA) certificate file that Node.js should trust when making HTTPS requests.

Why Use NODE_EXTRA_CA_CERTS?
By default, Node.js uses a built-in set of trusted root certificates. However, in enterprise or private environments, you might need to trust custom or internal CAs—for example:

- Your company uses a private CA to issue certificates for internal services.
- You're working with a self-signed certificate.
- You need to trust a third-party CA not included in Node’s default list.

When you set NODE_EXTRA_CA_CERTS, Node.js:

- Loads the specified PEM-encoded certificate file.
- Adds those certificates to the trust store used by TLS/HTTPS modules.
- Applies them globally to all HTTPS requests made by your Node.js app.

# Logging

Using winston + morgan for logging

npm i --save winston morgan
npm i --save-dev @types/morgan

set LOG_LEVEL=debug in local.env and common.env for usage in winstonLogger.js
If you dont set this, even debug logs appear as info.

As mentioned earlier, morgan is used for logging http requests and winston is a more genralised logger.

In src/logger, we have 2 files for winston and logger respectively.

Locally we are using combined.log and error.log in the root to store info+debug and error messages
respectively.

In docker, check the below variables set in common.env. The paths are different

```
stdoutPath=/var/log/${APPNAME}/combined.log
stderrPath=/var/log/${APPNAME}/error.log

```

Also in order to integrate this with ELK, we have done few more steps

1. Observe the filebeat folder in the root. Each microservice has the filebeat configured to pick up
   the log messages from configured path, send them to logstash, which in turn sends them to elastic search.
   Kibana provides a visual display.

2. Logstash,Elastic Search and Kibana are configured in a seperate project. But filebeat needs to be in
   every project, where log messages need to be collect, processed and displayed in kibana.

Moving to the docker-compose.yml

```
 filebeat:
      restart: always
      build:
        context: ../
        dockerfile: filebeat/Dockerfile
      environment:
         - strict.perms=false
      volumes:
         - logs-volume:/var/log/${APPNAME}/:ro
      networks:
         - elk-network

```

In Docker, both named volumes and bind mounts are used to persist and share data between containers and the host system—but they serve different purposes and behave differently.
Here’s a clear comparison to help you choose the right one:

📦 Named Volumes

- Managed by Docker: Stored in Docker’s internal storage (/var/lib/docker/volumes/).
- Created by name: You can create them explicitly (docker volume create mydata) or implicitly when starting a container.
- Portable: Easier to use across environments (e.g., dev, staging, prod).
- Safe and isolated: Docker controls access, reducing risk of accidental deletion or modification.
- Backups and drivers: Can be backed up easily and support volume drivers (e.g., for cloud storage).
  Use when:
- You want Docker to manage the storage.
- You need portability and isolation.
- You're deploying to production or orchestrating with Docker Compose or Swarm.

📂 Bind Mounts

- Direct host path: Maps a specific file or folder from the host system into the container.
- Full control: You can edit files directly on the host and see changes instantly in the container.
- Less portable: Depends on host file paths, which may vary across systems.
- More flexible: Useful for development, debugging, or sharing config files.
  Use when:
- You need real-time access to host files (e.g., source code).
- You're developing locally and want to see changes instantly.
- You need to mount specific host directories.

So we have created a named volume called logs-volume

```
  volumes:
         - logs-volume:/var/log/${APPNAME}/:ro
```

- logs-volume is a named volume managed by Docker.
- Docker mounts this volume into the container at /var/log/${APPNAME}/.
- The :ro flag makes it read-only inside the container

So inside the container, when it accesses /var/log/${APPNAME}/, it's actually reading data from the logs-volume —not from a specific host directory.

🧠 Key Distinction
If you had used a bind mount like this:
volumes:

- ./host-logs:/var/log/${APPNAME}/:ro

Then the container would be reading directly from the host path ./host-logs.
But with a named volume (logs-volume), Docker abstracts away the host path and manages the storage internally.

Observe that the docker service for the express app also references the named volume. The express app will write the logs using winston to the combined.log/error.log within /var/log/${APPNAME} folder. So this also means that these logs will be available in the logs-volume.
The filebeat service has ro access to the volume and can access the log messages.

```
 volumes:
       - logs-volume:/var/log/${APPNAME}
```

- logs-volume: A Docker-managed volume that stores data persistently.
- /var/log/${APPNAME}: The location inside the container where the volume is mounted.
- No :ro flag: So the mount is read-write by default—the container can read from and write to this volume.
- any logs or files written by the container to /var/log/${APPNAME} will be stored in logs-volume.
- This data persists even if the container is stopped or removed.
- Multiple containers can share this volume if needed.

Observe that the filebeat service is connected to an external network: elk-network. This is nothing but the network connecting
elasticsearch,logstash and kibana services. In order to communicate with logstash and other services, filbeat needs to be connected
to the same network.

```
networks:
         - elk-network
```

No ports specified for filebeat in docker compose ?

Filebeat is a log shipper, not a service that listens for incoming network traffic. It typically:

- Reads log files from mounted volumes or paths.
- Sends data out to Elasticsearch, Logstash, or other endpoints.
  Because it acts as a client, it doesn’t expose ports by default—so you don’t need to specify any ports: unless you’re doing something custom, like exposing its monitoring endpoint.

So unless you're explicitly enabling monitoring or debugging, no ports is perfectly normal.

In the filebeat.yml, observe the service_name field added. This field will be used in the elk project
to differentiate between the logs of different microservices and gateways.

```
 fields:
           event.dataset: ${APPNAME}
           service_name: ${APPNAME}
```

Filebeat picks up log messages from the location specified in the path field and sends to logstash
\*.log ensures that both combined.log and error.log are picked.

```
paths:
            - /var/log/${APPNAME}/*.log

```

Given your architecture (microservices + Filebeat + external network):

✅ Deploy ELK once and keep it running ✅ Deploy microservices independently ✅ Ensure the external network exists before deploying microservices

This gives you clean logs, stable pipelines, and simpler deployments.

# Caching

There are multiple lib's available for caching in express:

1. apicache - caching api responses
2. memcache - large scale distributed caching across multiple servers
3. node-cache - caching arbitrary data like configs

## Github actions

Github actions are defined in the .github/workflows folder in the root of the project.
We have defined only 1 workflow in the build-deploy.yml file within the .github/workflows folder.
We are using it as a CI/CD tool to build and push docker images to docker hub registry and
also pull the images and run the docker containers in the remote server using ssh.

In each repo of express-gateway, cart and product microserivce and elk stack, go to
Settings ---> Security and Variables --->Actions

We can here set the secrets and variables for the repo.
These are accessed in the workflow file as ${{vars.variable_name}} and ${{secrets.variable_name}}
These can be only accessed within the workflow file.
To access them in other files, we need to expose them as environment variables. Ensure they are in uppercase in case
they are to be used in docker compose

Environment variables can be accessed at workflow level, job level and step level.
In the workflow level, the env variables set can be accessed anywhere within the workflow.
In the job level, the env variables set can be accessed within any step in the same job.
At step level, the env variables set can be accessed only within the step.
They can be accessed using the syntax ${{env.variable_name}}

```
env:
 DOCKERHUB_USER: ${{vars.DOCKERHUB_USERNAME}}
 APPNAME: ${{vars.APP_NAME}}
```

Note that just running "docker compose up" will create containers within the Github runner and not
in docker desktop. You can create containers in docker desktop this way.
You need to ssh into a remote server, pull the images and then do a "docker compose up".

We have used workflow_dispatch to manually run the workflow from the Actions tab in the repo. We are also allowing
the user to provide the target environment and an optional docker tag for prod environment.

```
on:
 workflow_dispatch:
   inputs:
     environment:
        type: choice
        description: "Specify the environment(dev or prod)"
        options:
          - dev
          - prod
        required: true
        default: 'dev'

     tag:
      description: "Specify the image tag to be pulled for prod"
      required: false


```

The first step in the "build-and-deploy" job is to to checkout the git repo using an inbuilt action: actions/checkout@v4

```
 - name: Checkout repository
            uses: actions/checkout@v4
            env:
             var3: This is step level env var accessible only in this step


```

The next step is to check if the target environment is prod and the tag is provided. If tag not provided , throw an error

```
 - name: Validate PROD inputs
          # for prod deployments the tag input from the user must not be empty. -z does the empty string check
            run: |
             if [[ "${{ github.event.inputs.environment }}" == "prod" && -z "${{ github.event.inputs.tag }}" ]]; then
             echo "ERROR: tag is required for PROD deployments"
             exit 1
             fi

```

In the next step, we are overwriting the value of the TAG environment variable with the user provided tag, in case the target
enviornment is production.

```
 - name: Set conditional env
          # for prod we overwriting the value of the tab env variable to the tag input provided by the user.
            run: |
             if [[ "${{ github.event.inputs.environment }}" == "prod" ]]; then
             echo "TAG=${{ github.event.inputs.tag }}" >> $GITHUB_ENV
             fi

```

Next, we are logging into dockerhub using inbuilt action docker/login-action@v3 with provided parameters: username, password.
This is only for dev environment

```
 - name: Login to DockerHub
          # executed only for dev
            if: ${{ github.event.inputs.environment == 'dev' }}
            uses: docker/login-action@v3
            with:
              username: ${{vars.DOCKERHUB_USERNAME}}
              password: ${{secrets.DOCKERHUB_PASSWORD}}
              # added the dockerhub username as repo variable and password as repo secret

```

Next we are building the docker image for services that use dockerfiles and push them to dockerhub
This is only for dev environment

```
   - name: Build Docker image
          # executed only for dev
            if: ${{ github.event.inputs.environment == 'dev' }}
            uses: docker/build-push-action@v5
            with:
              push: true  # so that image is pushed to Dockerhub as well
              context: .   # this ensures the paths in the Dockerfile work as expected
              file: ./docker/Dockerfile  # this ensures the Dockerfile is located in the correct folder
              tags: ${{vars.DOCKERHUB_USERNAME}}/${{vars.APP_NAME}}:${{env.TAG}}


```

# Meaning of the environment variables and secrets from Github

These are set in the Repo settings ---> Secrets and Variables ---> Actions

Below are the secrets:

AZURE_SWARM_MANAGER_IP: Used only in swarm-build-deploy.yml for swarm setup. This is the public IP
of the VM which functions as the manager node in swarm cluster.

AZURE_SWARM_MANAGER_USER:Used only in swarm-build-deploy.yml for swarm setup. This is the username
of the VM which functions as the manager node in swarm cluster.

The above 2 are required when we need to deploy the compose stack files, env files of the product
microsvcs into a folder: product-node-express in the VM.

AZURE_VM_SSH_KEY: Contains the private key. Public key provided to azure.
DOCKERHUB_PASSWORD: Contains the password for Dockerhub account

Below are used for non-swarm deployment scenario in the build-deploy.yml.
Since we used 2 Azure VM's : one for dev and other for prod environment, we have DNS name, public IP
and username for the 2 VM's. The names below are self explanatory. We will ssh into the particular
VM based on the environment to deploy the compose and env files into a particular folder and
then execute "docker compose up" to run the containers.

AZURE_VM_DEV_DOMAIN
AZURE_VM_DEV_IP
AZURE_VM_DEV_USER
AZURE_VM_PROD_DOMAIN
AZURE_VM_PROD_IP
AZURE_VM_PROD_USER

Below are the variables:

APP_NAME: It is the name assigned to application deployed to Azure VM
DOCKERHUB_USERNAME: This is the dockerhub login username

# Interfaces, MongoDB Schema and API responses structure

From my experience, we require 3 seperate interfaces types:
1. An interface that models the Mongodb collection schema
2. Single or multiple interfaces that model the API responses.
3. Single or multiple interfaces that model incoming payload of the API.

We have moved the interfaces corresponding 2. and 3. to a seperate TS package:api-contracts, so that it can be shared amongst the microservices.
The TS package will be a single point of change in the interfaces. Its a github package. More details on this package is available
in the repo itself

The mongodb schema and the interface in 1. will be maintained in the respective microservice.

We never pass the mongoose functions or details in the API response or payload i.e we never use mongoose types in the interfaces in 2. and 3.
It is essential that the interfaces in 2. and 3. only using "string" as the type for fields that store ObjectId.
Date remains Date in mongoose or JS. So no change.
To help with this conversion, we have written a mapper.ts to convert the ProductDocument(which contains all mongoose details) into
ProductModel, which is a plain JS object.

```
export function schemaToResponseMapper(product: ProductDocument): ProductModel {
    const productObj=product.toObject();
    return {
        ...productObj,
        ...{
            _id: productObj._id.toString(),
            ...{
                reviews: productObj.reviews.map((x:ReviewDocument) => {
                    return {
                        ...x,
                        ...{ _id: x._id.toString() }
                    }
                })
            }
        }
    }
}

```

Our first step in the conversion is to use The `toObject()` method, to convert a Mongoose document instance into a plain JavaScript object (POJO)
`const productObj=product.toObject();`
Next, we have used that object: productObj to convert all ObjectId fields into string fields using the `toString()`.

Note that the same string fields in the incoming API payload, can be converted into ObjectID using `new mongoose.Types.ObjectId(fieldName)`;
This is required when you need to query these fields. Below is an example.
```
 const productObjectIds= productIds.map(x=>new mongoose.Types.ObjectId(x)); //convert string into ObjectId
const products: ProductDocument[] = await productModel.find({ _id: { $in: productObjectIds } } //find always returns array of docs or []
```

Another important point is related to optional and required fields in the schema vs interface.

In the schema `title: { type: String, required: true }` means the title field is also mandatory in the interface `title:string`. It cannot
be `title?:string`.
If using `{timestamps:true}` in schema, ensure the additonal fields: `createdAt` and `updatedAt` are also included in the interfaces.
`_id` is not included in the schema. It is added by default in the main document and sub documents.
You need to explicitly add it in the interface if required or map it to some other field name in the interface(eg: ID) or omit it if not required.

# Schema Validators

Here’s the **full list of built-in validators in Mongoose** you can use in your schema definitions:

---

## 🔑 Default Validators
- **`required`** → Ensures the field is present.  
- **Type casting** → Automatically checks that values can be cast to the defined type (`String`, `Number`, `Date`, etc.).  

---

## 📋 Built-in Validators
| Validator | Applies To | Description |
|-----------|------------|-------------|
| `required` | All types | Field must be present. |
| `min` | Number, Date | Minimum value allowed. |
| `max` | Number, Date | Maximum value allowed. |
| `enum` | String | Value must be one of a predefined set. |
| `match` | String | Value must match a regex pattern. |
| `minLength` | String | Minimum length of string. |
| `maxLength` | String | Maximum length of string. |
| `validate` | Any type | Custom validator function. |
| `unique` | Any type | Creates a unique index in MongoDB (not a true validator, but enforces uniqueness at DB level). |

---

## 📌 Example
```js
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  age: { type: Number, min: 18, max: 65 },
  email: { type: String, match: /.+\@.+\..+/ },
  role: { type: String, enum: ['admin', 'user', 'guest'] },
  bio: { type: String, minLength: 10, maxLength: 200 }
});
```

---

✅ **Summary:**  
- **Always applied by default** → `required` and type casting.  
- **Optional extras you can add** → `min`, `max`, `enum`, `match`, `minLength`, `maxLength`, `validate`, `unique`.  

# Getting data into the collection

## 📊 Data Insertion Methods with Example Operators

| Method | Ease of Use | Performance | Best Use Case | Example Operators / Commands |
|--------|-------------|-------------|---------------|-------------------------------|
| **Mongoose (Node.js ORM)** | High | Moderate | Web apps, APIs needing schema validation & middleware | `new User({...}).save()` or `User.create({...})` |
| **MongoDB Driver (Native)** | Moderate | High | High-performance apps, microservices | `db.collection('users').insertOne({...})` or `insertMany([...])` |
| **`mongosh` (Mongo Shell)** | High | Low | Quick testing, debugging, admin tasks | `db.users.insertOne({...})`, `db.users.insertMany([...])` |
| **`mongoimport` CLI** | Moderate | High | Bulk import, migrations | `mongoimport --db=test --collection=users --file=users.json --jsonArray` |
| **MongoDB Compass / Atlas UI** | Very High | Low | Manual edits, demos, non-technical users | GUI “Insert Document” button (no operator, point-and-click) |
| **REST / GraphQL APIs** | Moderate | Moderate | Production apps where clients submit data | `POST /api/users` → backend calls `insertOne({...})` |
| **Bulk Operations (`insertMany`, `bulkWrite`)** | Moderate | Very High | Large-scale inserts, ETL workloads | `db.users.insertMany([...])`, `db.users.bulkWrite([{ insertOne: {...} }, ...])` |
| **ETL / Data Pipelines (Kafka, Spark, Airflow)** | Low | Very High | Enterprise integration, real-time ingestion | Operators vary: Spark → `.write.format("mongo").save()`, Kafka → MongoDB Sink Connector |

---

### ✅ Key Takeaways
- **Operators in code**: `insertOne`, `insertMany`, `bulkWrite` are the core MongoDB operators across most methods.  
- **Mongoose adds abstraction**: `save()`, `create()` wrap those operators with schema validation.  
- **CLI tools**: `mongoimport` uses flags instead of operators.  
- **GUI tools**: Compass/Atlas UI are operator-free, but internally they still call `insertOne`.  
- **ETL pipelines**: Use connectors or libraries that eventually call the same insert operators under the hood.  

mongoimport --file "C:\Users\User\Desktop\users.json" --db myUsers --collection users --drop --jsonArray

```
PS C:\Users\User\angular\mongodb> mongoimport --file "C:\Users\User\Desktop\users.json" --db myUsers --collection users --drop --jsonArray
2026-01-19T17:37:23.2o42+0530    connected to: mongodb://localhost/
2026-01-19T17:37:23.244+0530    dropping: myUsers.users
2026-01-19T17:37:23.271+0530    30 document(s) imported successfully. 0 document(s) failed to import.
PS C:\Users\User\angular\mongodb> show dbs

```

mongoimport will respect schema if you have created a collection with validators in advance. 

```
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "age"],
      properties: {
        name: { bsonType: "string" },
        age: { bsonType: "int", minimum: 18 }
      }
    }
  }
});

```

In each microservice, we have added the data into collection via the mongoose create()
which automatically does the schema validation. Check dbConnectionService.ts

# Referencing vs Embedding documents from other collections

In MongoDB, you can model relationships between documents using **embedding** or **referencing**, and the choice depends on your application's access patterns, scalability needs, and data complexity. Here’s a clear comparison:

## 📊 Embedding vs Referencing in MongoDB

| Aspect | Embedding | Referencing |
|--------|-----------|-------------|
| **Definition** | Store related data inside a single document (nested structure). | Store related data in separate collections and link them via ObjectIDs or keys. |
| **Performance** | Faster reads since all related data is fetched in one query. | Slower reads, often requiring multiple queries or `$lookup` joins. |
| **Atomicity** | Updates to the document are atomic (all-or-nothing). | Atomicity limited to individual documents; cross-document transactions may be needed. |
| **Data Size** | Best for small, bounded subdocuments. | Better for large, growing, or frequently changing related data. |
| **Flexibility** | Less flexible if relationships change often. | More flexible for complex, many-to-many, or shared relationships. |
| **Use Cases** | User profile with embedded addresses, product with embedded reviews. | Orders referencing customers, blog posts referencing authors, carts referencing products. |
| **Schema Complexity** | Simpler queries, but risk of bloated documents. | More normalized, but queries can be more complex. |

## ✅ When to Use Each
- **Embedding is ideal when:**
  - Data is tightly coupled and always accessed together.
  - The relationship is one-to-few (e.g., a user with a few addresses).
  - You want fast reads and atomic updates.

- **Referencing is ideal when:**
  - Data is loosely coupled or shared across multiple documents.
  - The relationship is one-to-many or many-to-many (e.g., products in multiple carts).
  - You need scalability and avoid document size limits (16 MB in MongoDB).

## ⚖️ Trade-Offs
- Embedding favors **denormalization** (speed, simplicity) but risks duplication and large documents.
- Referencing favors **normalization** (flexibility, scalability) but requires joins or multiple queries.

- **Embed** when data is small, tightly coupled, and immutable (like flash‑sale products, shipping addresses, or order line items).
- **Reference** when data is large, reused, or frequently updated (like users, catalog products, or inventory).

In the cart microservice, we are using the referencing approach over embedding.
The products in the cart are referenced in the carts collection using ObjectIDs. 


## ✅ Scenario Where Embedding Is Correct

Imagine you’re building a **flash‑sale app** where:

- Products are **ephemeral** (only available for a few hours).
- Product details (name, price, discount) **never change once published**.
- The cart is **short‑lived** (users either check out quickly or the cart expires).
- You don’t need to maintain historical consistency across multiple carts.

### Example Schema (Embedded)

```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),   // reference to Users collection
  "items": [
    {
      "product": {
        "name": "Wireless Mouse",
        "sku": "WM123",
        "price": 19.99,
        "discount": 0.10
      },
      "quantity": 2
    },
    {
      "product": {
        "name": "Mechanical Keyboard",
        "sku": "MK456",
        "price": 79.99,
        "discount": 0.20
      },
      "quantity": 1
    }
  ],
  "createdAt": ISODate("..."),
  "expiresAt": ISODate("...")
}
```

---

## 🔎 Why Embedding Works Here
- **No duplication concerns**: Products are short‑lived, so embedding avoids the overhead of maintaining a separate product collection.
- **Fast reads**: You can fetch the cart with all product details in one query — ideal for checkout flows.
- **Immutable product data**: Since flash‑sale products don’t change, embedding avoids the stale‑data problem.
- **Simpler design**: No need for `$lookup` or joins; the cart is self‑contained.

If using references method, 
Inside one monolith: populate() and ref works because all models are registered in the same Mongoose connection.
Inside microservices: you cannot populate() across services. You must call the other service’s API to enrich your cart response.

Each microservice maintains its own DB and hence its own mongoose schema.

Its possible that when you are sending the response back to client, you need data from multiple
DB's(and hence multiple collections). Since we have microsvcs, each microsvcs manages its own DB and 
collections.
Thus API is the only way for 1 microsvcs to fetch data from the DB of another microservice.
If cart microservice requires the details of the products stored in the cart, it will send a request
to the gateway microservice, which in turn connects to the product microservice, gets the data and
returns it back to the cart microservice.

# Transactions

We have used transactions when checking out the cart. We required 2 updates: creating an order in the orders collection and also
emptying the cart for the user in the carts collection. Either both should succeed or both should fail. In order to ensure this, transactions are required.

In MongoDB, transactions are needed when you want to guarantee ACID properties (Atomicity, Consistency, Isolation, Durability) across multiple documents, collections, or even databases. 

By default, MongoDB operations on a single document are atomic, so you don’t need transactions for most embedded-document use cases. But when relationships are modeled with referencing, or when multiple documents must be updated together, transactions become important.


### 🔑 When Transactions Are Needed
- **Multi-document updates**  
  Example: Updating both an `orders` document and a `products` document to reflect a purchase.
- **Cross-collection consistency**  
  Example: Creating an order in the `orders` collection while simultaneously decrementing stock in the `inventory` collection.
- **Many-to-many relationships**  
  Example: A student enrolling in multiple courses, requiring updates in both `students` and `courses` collections.
- **Financial or critical workflows**  
  Example: Banking transfers, checkout flows, or any process where partial updates could cause data corruption.
- **Sharded clusters**  
  Transactions can span multiple shards, ensuring consistency across distributed data.

### 🚫 When Transactions Are Not Needed
- **Single-document operations**  
  MongoDB guarantees atomicity at the document level, including updates to embedded arrays and subdocuments.
- **Bounded, embedded data**  
  If you embed related data (like a user’s addresses inside the user document), you can rely on single-document atomicity instead of transactions.
- **Eventual consistency is acceptable**  
  In scenarios where slight delays or retries are tolerable, transactions may be overkill.

### ⚖️ Trade-Offs
- Transactions add **performance overhead** compared to single-document operations.
- They are powerful but should be reserved for cases where **data integrity across multiple documents is critical**.
- Embedding often reduces the need for transactions, while referencing increases the likelihood you’ll need them.


### 🛒 Case 1: Embedding (No Transactions Needed)
Suppose you embed products directly inside the cart document:

```json
{
  "_id": "cart123",
  "userId": "user456",
  "items": [
    { "productId": "p1", "name": "Laptop", "price": 1200, "qty": 1 },
    { "productId": "p2", "name": "Mouse", "price": 25, "qty": 2 }
  ]
}
```

- **Checkout flow:**  
  - You atomically update the cart document to clear items.  
  - You atomically create an order document with the embedded items.  
- **Why no transaction?**  
  Each operation is a single-document write, and MongoDB guarantees atomicity at the document level. No cross-document consistency issues.

---

### 📦 Case 2: Referencing (Transactions Needed)
Now imagine you reference products instead of embedding:

```json
{
  "_id": "cart123",
  "userId": "user456",
  "items": [
    { "productId": "p1", "qty": 1 },
    { "productId": "p2", "qty": 2 }
  ]
}
```

Products live in a separate `products` collection:

```json
{ "_id": "p1", "name": "Laptop", "price": 1200, "stock": 10 }
{ "_id": "p2", "name": "Mouse", "price": 25, "stock": 50 }
```

- **Checkout flow:**  
  - Create an order document in `orders`.  
  - Decrement stock in `products`.  
  - Clear items in `cart`.  
- **Why transactions?**  
  These are **three separate documents across two collections**. Without a transaction, you risk partial updates (e.g., stock decremented but order not created). A multi-document transaction ensures all-or-nothing consistency.

---

### ⚖️ Summary
- **Embedding** → simpler, atomic by default, no transactions needed.  
- **Referencing** → flexible, scalable, but requires transactions for workflows that span multiple documents/collections.  


# Integrating with Swagger UI and Open API for API documentation

We have added the openapi documentations for each microservice in the api-contracts github package.
We are installing the package in each microservice. Since its a github package, authentication is required when installing it.

Thus we have added a .npmrc file in the root of the project. ramyabala221190 is the username. ${GITHUB_PAT} will be replaced with your
github personal access token, save the file and then do the installation of the api-contracts package from github.
```
@ramyabala221190:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}

For installation of the local .tgz file, this PAT is not required. Its only needed when installing from github.

```
In order to load the swagger UI dashboard when the microservice is up and running, we are installing `swagger-ui-express` npm package as a dependency.  We are also installing swagger-cli as dev dep to enable bundling in case we are referencing schemas or anything else from other
.json files
```
npm i --save-dev @types/swagger-ui-express
npm i --save swagger-ui-express
npm i --save-dev swagger-cli
```

So when we start the microservice using `npm run local`, the below pre script will also execute automatically

`"prelocal": "swagger-cli bundle node_modules/@ramyabala221190/api-contracts/dist/openapi/product/openapi.json -o bundled-product.json -t json",`

So we are picking the correct openapi.json file from the node_modules for the current microservice, bundling it into a bundled-product.json
file in the root of the project. We will be using this file in the app.ts.

Finally in the app.ts, we add the below lines of code to integrate the openapi.json with the swagger ui
dashboard. /api-docs is the route we need to hit, to access the Swagger UI dashboard. So we hit localhost:3601/api-docs to access the dashboard.

```
if (process.env.APP_ENV !== "prod") {
  //we dont swagger in prod
 const productJSONPath=join(`${process.cwd()}`,'bundled-product.json');
  const productJSON= readFileSync(productJSONPath,{encoding:'utf8'});
  app.use(
    '/api-docs',
    swaggerUI.serve,
    swaggerUI.setup(JSON.parse(productJSON), { explorer: true, swaggerOptions: {
    supportedSubmitMethods: ['get'] // Disables the "Execute" button for POST, PUT, DELETE
  } })
  )
}

```

# Kubernetes

We are deploying to a single cluster. Environments are seperated based on namespace:
dev-node-namespace and prod-node-namespace.

We require seperate deployments and service for Express app and MongoDB.
We have 1 pod for express app and for mongodb container.
The express app container and mongo db container in the 2 pods will not directly interact with each other.
We have 1 ClusterIP service each for the 2 pods, sitting in front of the pods.

In express-service.yaml, the port is 8081 and targetPort will be 8091 in dev and 8095 in prod.
In mongo-service.yaml, the port and targetPort is the same i.e 27017.
Keeping the service port same as the port mongo container listens on avoids errors when the express
app connects to mongo db in dbclient.ts file.

Complete routing flow is given in the gateway repo.

In the package.json, we have the scripts for starting the project.

For "dev" environment, we execute the "start-dev" script.

```
    "start-dev":"npm run build-docker && npm run create-namespace-dev && npm run set-context-dev && npm run helm-pack && npm run helm-upgrade-dev",

```

Here we build the docker image for express app, create namespace for dev, switch the current context,
pack the chart artifacts into a .tgz file and then run "helm upgrade".

For "prod" environment, we execute the "start-prod" script.

```
 "start-prod":"npm run create-namespace-prod && npm run set-context-prod && npm run helm-upgrade-prod",

```

Here we just create namespace, set context and do the "helm upgrade" based on the .tgz file created
earlier for "dev".

We have a basic values.yml file and an override file for "dev" and "prod" : values-dev.yml and values-prod.yml.

We use these files when doing the helm upgrade in the "start-dev" and "start-prod" script. We can use -f or --values to pass the path to the
values.yml and the override file. Always first pass the values.yaml followed by the override file so that values are correctly overrided.
--set can also be used override fields in the values.yaml. Since the value of image tag is not static, we prefer to override it using --set rather than the override file.

```
    "helm-upgrade-dev":"helm upgrade product-express-app-release ./charts/node-product-microsvcs/ --install --debug -f ./charts/node-product-microsvcs/values.yml -f ./charts/node-product-microsvcs/values-dev.yml --set image.express=node-product-express-app:2",

```

```
    "helm-upgrade-prod":"helm upgrade product-express-app-release ./artifacts/node-product-microsvcs-chart-1.0.4.tgz --install --debug -f ./charts/node-product-microsvcs/values.yml -f ./charts/node-product-microsvcs/values-prod.yml --set image.express=node-product-express-app:2"
```




