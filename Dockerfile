FROM node:latest
WORKDIR /usr/app

COPY package.json /usr/app/package.json
COPY package-lock.json /usr/app/package-lock.json
RUN npm install
COPY . /usr/app/

VOLUME [ "/usr/app/instances" ]
VOLUME [ "/usr/app/logs" ]

CMD ["node", "."]