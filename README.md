# npuser - sendmail

> Two Docker containers: Postfix and NodeJS web service. Together they send authorization emails on 
> behalf of the npuser service.

This is a sub-project of https://github.com/npuserauth/npuser

This project provides the email verification service which npuser needs when it sends verification emails without tracking end users.

This project has two docker containers. One runs an SMTP MTA (postfix) and, the second container provides an API endpoint for the npuser server to send its verification emails.  

The npuser service sends its validation emails via a web service call, within a docker network, to this project's web service.

For local development you can also run just the API endpoint. See the Local section below.

The two containers will run on the npuser server within a docker environment that provides a private network. 
It is important and assumed that both the MTA and this email service web API are NOT available to the outside world.
Both will run inside the docker private network listening on ports that are not exposed to the outside world.
This assumption greatly simplifies the security requirements for both the MTA and email sending web service api.

To scale up the npuser service these two containers can be hosted on their own dedicated system and the npuser service could
be replicated behind a load balancing front end.

This email sending service might be extended to support other email sending needs. (e.g. email confirmations or error reports or application access reports, or)

## Configure and Run

Modify the sample env files if needed. The key difference is which MTA is used. For production use the local postfix MTA.
For development, send emails to the https://ethereal.email/ service.  This service will capture all email send requests and not
forward them.  Instead, developers can watch the local console for the bounce back message from Ethereal and extract an URL.
Follow this URL to see how the email message looks to the outside world. 

To set up the local environment
```
npm run dev
# or
npm run prod
```

To run
```
# if production run the local postfix service. See important note about DKIM below

# to build, to run interactively, to run disconnected
npm run post:run -- --build
npm run post:run
npm run post:run -- -d

# run the npuser sendmail service
# to build, to run interactively, to run disconnected
npm run send:run -- --build
npm run send:run
npm run send:run -- -d
```

To stop the containers
```
npm run post:stop
npm run send:stop
```

Also see the ```exec.sh``` shell script
 
## Testing

See the npuser project


## Postfix

Postfix provides the SMTP MTA. This is a send-only service and, it can be protected
further by running the container behind a firewall that blocks all incoming smtp ports.
Outgoing port 25 needs to be open.

To start just the postfix container
```
npm run post:run -- -build
npm run post:run
npm run post:run -- -d
```

### SPF
Sender Policy Framework.  To keep the validation emails from going to spam be sure to set up your domain's DNS.
For example, if you are using a Digital Ocean droplet rename the droplet to match your domain name.  This is sufficient
to satisfy SPF. 

https://en.wikipedia.org/wiki/Sender_Policy_Framework

### DKIM

https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail

When the postfix server starts it will create DKIM keys. 
You need to grant read access to the generated keys so that
the next time the postfix container runs the root, inside the container, can access
the keys.
Use Ctrl-C to stop the container. Then  
```
sudo chmod 644 dkimkeys/*
```
Note from bokysan/postfix project:  "Security.  Postfix will run the master proces as root, because that's how it's designed. Subprocesses will run under the postfix account which will use UID:GID of 100:101. opendkim will run under account 102:103."

Then configure your DNS with the DKIM key.
```
sudo cat dkimkeys/<domain>>.txt
```

It will look something like this
```
mail._domainkey	IN	TXT	( "v=DKIM1; h=sha256; k=rsa; s=email; "
	  "p=asdasdasd+BxPEYJqqbvAid8L6LhL/LvQd3bhcHGHSStk0QYTKIunXCzL5"
	  "nlDdMiZr5kURIVAp0ThBJRnU+asdads+w3GuGuQ6/FpIbXuuq/" )  ; ----- DKIM key mail for <domain>>
```
Copy all the text between the ().  DND TXT records can only hold strings of 255 characters. 
That is why the text comes in small chunks.   See the references below for more instructions.

Finally, restart the postfix server
```
docker-compose -f d-c-postfix.yml up -d

# OR
./down.sh
# followed by
./up_prod.sh -d
```

References
- https://hub.docker.com/r/boky/postfix
- https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-dkim-with-postfix-on-debian-wheezy

## Send-Mail Service API

Start the web service which provides the sendmail API
```
docker-compose -f d-c-sendmail.yml up --build
```

(Add the -d option to detach once you have run the test and know all is good.)

Edit the to address in the testCurlData.json file and then test sending a message
```
curl -X POST -d "@testCurlData.json" http://localhost:3003/sendmail
```

## Why not use gMail?

I considered using gMail for development testing but it is complicated to set up the OAuth access token and the effort doesn't
match the reward.  The only reward is to see an email go out to some email address.  The easier alternative is to just monitory the
console log of the ```npuser``` service to get any verification code and use that for local development testing.

gMail, by it's nature, will track all outgoing emails in it's sent folder. That violates a core principle of npuser, namely,
to not track end users.  Someone, someday, may wish to enhance this service to allow for the use of gMail with some additional
functionality to retroactively and continually delete emails from the 'sent' folder.  Leaving that for a future contributor, if they
see some value in it.
 
## Local

For local development you can run the API service outside of docker. First copy the 
```
# change into the sendmail directory
cd sendmail

# do the local install
npm install

# set up the environment
cp sample.dev.env .env

# run the start script
npm run local

```

Once the local copy is setup you can the local server from the project root directory:
```
npm run local
``` 

## ENV Files

To use this server you must set up local copies of .env files.  You can copy the samples and adjust as needed. 

Docker compose finds and creates environment variables based on the contents of a local .env file.  Put a .env file in the projec root prior to running docker compose.

When running the application locally the npm scripts in package.json uses the npm dotenv library https://www.npmjs.com/package/dotenv to read and preload environment variables. Therefore, you must put a .env file in the application folder 'sendmail'. 

```
.
└── npuser-sendmail/
    ├── sendmail/
    │   ├── src/***
    │   └── .env            <--- for local 
    ├── .env                <--- for docker (production)
    ├── ....
    └── d-c-sendmail.yml
```

